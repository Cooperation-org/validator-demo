import { Api, Data, Post } from '@modern-js/plugin-bff/server';
import { z } from 'zod';
import { sendEmail } from '../_lib/email';
import { createTestimonialRequest, emailSubjectUri } from '../_lib/linkedtrust';

const EndorsementRequest = z.object({
  candidateName: z.string().trim().min(1).max(200),
  candidateEmail: z.string().trim().email(),
  organizationName: z.string().trim().min(1).max(200),
  organizationDomain: z.string().trim().min(1).max(253),
  referenceName: z.string().trim().min(1).max(200),
  referenceEmail: z.string().trim().email(),
});

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// POST /api/endorsements
// Asks the reference, by email, to confirm the candidate's exact email address
// and role. The link is a LinkedTrust testimonial request; the answer is a
// LinkedClaim about mailto:<candidateEmail>.
export const requestEndorsement = Api(
  Post('/endorsements'),
  Data(EndorsementRequest),
  async ({ data }) => {
    const candidateEmail = data.candidateEmail.toLowerCase();
    const question =
      `Please confirm that ${candidateEmail} is ${data.candidateName}'s email address, ` +
      `and that ${data.candidateName} is an administrator of ${data.organizationName} (${data.organizationDomain}).`;

    const invite = await createTestimonialRequest({
      subjectUri: emailSubjectUri(candidateEmail),
      subjectName: `${data.candidateName} (${candidateEmail})`,
      recipientName: data.referenceName,
      requesterName: data.candidateName,
      note: question,
    });

    const subject = `Confirm ${candidateEmail} for ${data.candidateName} at ${data.organizationName}`;
    const text = `Hi ${data.referenceName},\n\n${question}\n\nAnswer here: ${invite.url}\n`;
    const html =
      `<p>Hi ${escapeHtml(data.referenceName)},</p>` +
      `<p>${escapeHtml(question)}</p>` +
      `<p><a href="${escapeHtml(invite.url)}">Answer here</a></p>`;

    const sent = await sendEmail({
      to: data.referenceEmail,
      subject,
      text,
      html,
    });
    return { inviteId: invite.id, messageId: sent.messageId };
  },
);
