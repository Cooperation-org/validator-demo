import { Api, Data, Get, Params, Post } from '@modern-js/plugin-bff/server';
import { appUrl, linkEmail, sendEmail, senderAddress } from '../_lib/email';
import { createClaim, emailSubjectUri } from '../_lib/linkedtrust';
import { readAll, update } from '../_lib/store';
import { hashToken, makeToken } from '../_lib/tokens';
import { Candidate, TokenParams, email } from '../_lib/validation';

// Pending single-use links sent to an address at the organization's domain.
// LinkedTrust has no equivalent record, so these live in this app's store.
type OrgEmailLink = {
  id: number;
  tokenHash: string;
  candidateName: string;
  candidateEmail: string;
  organizationName: string;
  organizationDomain: string;
  organizationEmail: string;
  expiresAt: string;
  usedAt: string | null;
  claimId: number | null;
  createdAt: string;
};

const COLLECTION = 'org-email-links';
const LINK_TTL_MS = 24 * 60 * 60 * 1000;

const findByToken = async (token: string) =>
  (await readAll<OrgEmailLink>(COLLECTION)).find(
    (row) => row.tokenHash === hashToken(token),
  );

// POST /api/org-email — emails a single-use link to the organization address.
export const requestOrgEmailLink = Api(
  Post('/org-email'),
  Data(Candidate.extend({ organizationEmail: email })),
  async ({ data }) => {
    if (data.organizationEmail.split('@')[1] !== data.organizationDomain) {
      return { status: 'domain_mismatch' as const };
    }
    const token = makeToken();
    const now = Date.now();
    await update<OrgEmailLink, void>(COLLECTION, (rows) => {
      rows.push({
        id: rows.reduce((max, row) => Math.max(max, row.id), 0) + 1,
        tokenHash: hashToken(token),
        ...data,
        expiresAt: new Date(now + LINK_TTL_MS).toISOString(),
        usedAt: null,
        claimId: null,
        createdAt: new Date(now).toISOString(),
      });
    });
    const email = await sendEmail({
      to: data.organizationEmail,
      subject: `Confirm ${data.organizationEmail} for ${data.candidateName}`,
      ...linkEmail(
        `Hi ${data.candidateName},`,
        [
          `You asked to link ${data.organizationEmail} to ${data.candidateEmail} as an administrator of ${data.organizationName}.`,
          'This link works once and expires in 24 hours. If you did not ask for this, ignore this email.',
        ],
        'Confirm',
        appUrl(`/verify/${token}`),
      ),
    });
    return {
      status: 'sent' as const,
      email,
      from: senderAddress(),
      lookupUrl: appUrl(
        `/lookup?email=${encodeURIComponent(data.candidateEmail)}`,
      ),
    };
  },
);

// GET /api/org-email/:token
export const getOrgEmailLink = Api(
  Get('/org-email/:token'),
  Params(TokenParams),
  async ({ params }) => {
    const link = await findByToken(params.token);
    if (!link) return { status: 'not_found' as const };
    if (link.usedAt) return { status: 'used' as const };
    if (new Date(link.expiresAt) < new Date())
      return { status: 'expired' as const };
    return {
      status: 'open' as const,
      candidateName: link.candidateName,
      candidateEmail: link.candidateEmail,
      organizationName: link.organizationName,
      organizationEmail: link.organizationEmail,
    };
  },
);

// POST /api/org-email/:token/confirm
// Uses the link once and records a LinkedClaim that the holder of
// candidateEmail also controls organizationEmail (identity link, relationship:same-as).
export const confirmOrgEmail = Api(
  Post('/org-email/:token/confirm'),
  Params(TokenParams),
  async ({ params }) => {
    const now = new Date();
    const claimed = await update<
      OrgEmailLink,
      OrgEmailLink | 'not_found' | 'used' | 'expired'
    >(COLLECTION, (rows) => {
      const link = rows.find(
        (row) => row.tokenHash === hashToken(params.token),
      );
      if (!link) return 'not_found';
      if (link.usedAt) return 'used';
      if (new Date(link.expiresAt) < now) return 'expired';
      link.usedAt = now.toISOString();
      return { ...link };
    });
    if (typeof claimed === 'string') return { status: claimed };

    const { claimId } = await createClaim({
      subject: emailSubjectUri(claimed.candidateEmail),
      claim: 'RELATED_TO',
      aspect: 'relationship:same-as',
      object: emailSubjectUri(claimed.organizationEmail),
      statement: `The holder of ${claimed.candidateEmail} opened a single-use link sent to ${claimed.organizationEmail} (${claimed.organizationName}).`,
      howKnown: 'VERIFIED_LOGIN',
      effectiveDate: now.toISOString(),
    });
    await update<OrgEmailLink, void>(COLLECTION, (rows) => {
      const link = rows.find((row) => row.id === claimed.id);
      if (link) link.claimId = claimId;
    });
    return { status: 'confirmed' as const, claimId };
  },
);
