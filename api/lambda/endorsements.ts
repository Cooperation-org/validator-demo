import { Api, Data, Get, Params, Post } from '@modern-js/plugin-bff/server';
import { z } from 'zod';
import { appUrl, linkEmail, sendEmail, senderAddress } from '../_lib/email';
import {
  createClaim,
  createTestimonialRequest,
  emailSubjectUri,
  getTestimonialRequest,
  markResponded,
} from '../_lib/linkedtrust';
import { Candidate, TokenParams, email, name } from '../_lib/validation';

const role = (organizationName: string, organizationDomain: string) =>
  `an administrator of ${organizationName} (${organizationDomain})`;

// POST /api/endorsements
// Asks a reference, by email, to confirm the candidate's exact email address and
// role. The invite is a LinkedTrust testimonial request about mailto:<candidateEmail>.
export const requestEndorsement = Api(
  Post('/endorsements'),
  Data(
    Candidate.extend({
      referenceName: name,
      referenceEmail: email,
      note: z.string().trim().max(500).optional(),
    }),
  ),
  async ({ data }) => {
    const invite = await createTestimonialRequest({
      subjectUri: emailSubjectUri(data.candidateEmail),
      subjectName: data.candidateName,
      recipientName: data.referenceName,
      recipientProfile: emailSubjectUri(data.referenceEmail),
      requesterName: data.candidateName,
      workSummary: role(data.organizationName, data.organizationDomain),
      note: data.note,
    });
    const url = appUrl(`/endorse/${invite.token}`);
    const email = await sendEmail({
      to: data.referenceEmail,
      subject: `Confirm ${data.candidateEmail} for ${data.candidateName} at ${data.organizationName}`,
      ...linkEmail(
        `Hi ${data.referenceName},`,
        [
          `${data.candidateName} asked us to check two things with you:`,
          `1. Is ${data.candidateEmail} ${data.candidateName}'s email address?\n` +
            `2. Is ${data.candidateName} ${role(data.organizationName, data.organizationDomain)}?`,
          ...(data.note
            ? [`Note from ${data.candidateName}: ${data.note}`]
            : []),
        ],
        'Answer here',
        url,
      ),
    });
    // The link goes only to the reference; returning it would let the candidate answer for them.
    return {
      inviteId: invite.id,
      email,
      from: senderAddress(),
      lookupUrl: appUrl(
        `/lookup?email=${encodeURIComponent(data.candidateEmail)}`,
      ),
    };
  },
);

// GET /api/endorsements/:token — what the reference is asked to confirm.
export const getEndorsement = Api(
  Get('/endorsements/:token'),
  Params(TokenParams),
  async ({ params }) => {
    const invite = await getTestimonialRequest(params.token);
    if (!invite) return { status: 'not_found' as const };
    if (invite === 'expired') return { status: 'expired' as const };
    return {
      status: invite.responded ? ('answered' as const) : ('open' as const),
      candidateName: invite.subjectName,
      candidateEmail: invite.subjectUri.replace(/^mailto:/, ''),
      role: invite.workSummary,
      referenceName: invite.recipientName,
      note: invite.note,
    };
  },
);

// POST /api/endorsements/:token/response
// Only a yes to both questions becomes a claim: an `is_vouched_for` LinkedClaim
// about mailto:<candidateEmail>, authored by the reference, with
// sourceURI = mailto:<reference email> (the address the link was sent to).
export const respondToEndorsement = Api(
  Post('/endorsements/:token/response'),
  Params(TokenParams),
  Data(
    z.object({
      confirmsEmail: z.boolean(),
      confirmsRole: z.boolean(),
      referenceName: name,
      comment: z.string().trim().max(1000).optional(),
    }),
  ),
  async ({ params, data }) => {
    const invite = await getTestimonialRequest(params.token);
    if (!invite) return { status: 'not_found' as const };
    if (invite === 'expired') return { status: 'expired' as const };
    if (invite.responded) return { status: 'answered' as const };
    if (!data.confirmsEmail || !data.confirmsRole)
      return { status: 'declined' as const };

    const candidateEmail = invite.subjectUri.replace(/^mailto:/, '');
    // The reference's email is what the link proves; the typed name is not checked.
    const referenceEmail = invite.recipientProfile?.replace(/^mailto:/, '');
    const confirmation = `${data.referenceName}${referenceEmail ? ` (${referenceEmail})` : ''} confirms that ${candidateEmail} is ${invite.subjectName}'s email address and that ${invite.subjectName} is ${invite.workSummary}.`;
    const { claimId } = await createClaim({
      subject: invite.subjectUri,
      claim: 'is_vouched_for',
      statement: data.comment
        ? `${confirmation}\n\n${data.comment}`
        : confirmation,
      author: data.referenceName,
      sourceURI: invite.recipientProfile ?? undefined,
      howKnown: 'FIRST_HAND',
      effectiveDate: new Date().toISOString(),
    });
    await markResponded(params.token, claimId);
    return { status: 'confirmed' as const, claimId };
  },
);
