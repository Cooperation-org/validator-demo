// LinkedTrust (trust_claim_backend) operations this app uses: LinkedClaims and
// testimonial requests. A person is addressed by `mailto:<email>`, the same
// subject URI the backend's identity linking uses.
//
// LINKEDTRUST_MODE=api  calls the backend at LINKEDTRUST_API_URL.
// LINKEDTRUST_MODE=mock keeps the same records in JSON files (see store.ts),
//                       for demos while the dev backend lacks testimonial requests.
import { readAll, update } from './store';
import { hashToken, makeToken } from './tokens';

export type LinkedClaim = {
  id: number;
  subject: string;
  claim: string;
  object?: string | null;
  statement?: string | null;
  aspect?: string | null;
  howKnown?: string | null;
  sourceURI?: string | null;
  author?: string | null;
  effectiveDate?: string | null;
  createdAt?: string;
};

export type NewClaim = Omit<LinkedClaim, 'id' | 'createdAt'>;

export type SubjectClaims = {
  claims: LinkedClaim[];
  linkedSubjects: string[];
  total: number;
};

// The fields trust_claim_backend's GET /api/testimonial-requests/:token returns.
export type TestimonialRequest = {
  subjectUri: string;
  subjectName: string | null;
  recipientName: string | null;
  // How to reach the recipient; this app stores mailto:<reference email>.
  recipientProfile: string | null;
  workSummary: string | null;
  note: string | null;
  requesterName: string | null;
  responded: boolean;
  claimId: number | null;
};

export type NewTestimonialRequest = {
  subjectUri: string;
  subjectName?: string;
  recipientName?: string;
  recipientProfile?: string;
  workSummary?: string;
  note?: string;
  requesterName?: string;
};

export const emailSubjectUri = (email: string) =>
  `mailto:${email.trim().toLowerCase()}`;

const isMock = () => {
  const mode = process.env.LINKEDTRUST_MODE;
  if (mode !== 'api' && mode !== 'mock')
    throw new Error('LINKEDTRUST_MODE must be "api" or "mock"');
  return mode === 'mock';
};

// ---- api mode -------------------------------------------------------------

const apiBase = () => {
  const base = process.env.LINKEDTRUST_API_URL;
  if (!base) throw new Error('LINKEDTRUST_API_URL is not set');
  return base.replace(/\/$/, '');
};

// Server-to-server auth as this app's registered LinkedTrust client.
const clientHeaders = () => {
  const clientId = process.env.LINKEDTRUST_CLIENT_ID;
  const clientSecret = process.env.LINKEDTRUST_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'LINKEDTRUST_CLIENT_ID and LINKEDTRUST_CLIENT_SECRET must be set',
    );
  }
  return { 'x-lt-client-id': clientId, 'x-lt-client-secret': clientSecret };
};

async function call<T>(
  method: string,
  route: string,
  body?: unknown,
  auth = false,
): Promise<T> {
  const response = await fetch(`${apiBase()}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(auth ? clientHeaders() : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `LinkedTrust ${method} ${route.split('/').slice(0, 3).join('/')} failed: HTTP ${response.status}`,
    );
  return response.json();
}

// ---- mock mode ------------------------------------------------------------

type StoredTestimonialRequest = Omit<TestimonialRequest, 'responded'> & {
  id: number;
  tokenHash: string;
  respondedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

// Same lifetime as trust_claim_backend's INVITE_TTL_DAYS.
const INVITE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const nextId = (rows: { id: number }[]) =>
  rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

// ---- operations -----------------------------------------------------------

// GET /api/claims/subject/:uri
export async function getClaimsBySubject(uri: string): Promise<SubjectClaims> {
  if (isMock()) {
    const claims = (await readAll<LinkedClaim>('claims')).filter(
      (claim) => claim.subject === uri,
    );
    return { claims, linkedSubjects: [uri], total: claims.length };
  }
  const body = await call<{
    claims?: LinkedClaim[];
    linkedSubjects?: string[];
    pagination?: { total?: number };
  }>('GET', `/api/claims/subject/${encodeURIComponent(uri)}`);
  return {
    claims: body.claims ?? [],
    linkedSubjects: body.linkedSubjects ?? [],
    total: body.pagination?.total ?? 0,
  };
}

// POST /api/claims
export async function createClaim(
  claim: NewClaim,
): Promise<{ claimId: number }> {
  if (isMock()) {
    return update<LinkedClaim, { claimId: number }>('claims', (rows) => {
      const id = nextId(rows);
      rows.push({ ...claim, id, createdAt: new Date().toISOString() });
      return { claimId: id };
    });
  }
  const body = await call<{ claim: { id: number } }>(
    'POST',
    '/api/claims',
    claim,
    true,
  );
  return { claimId: body.claim.id };
}

// POST /api/testimonial-requests — returns the token; the link is built by the caller.
export async function createTestimonialRequest(
  request: NewTestimonialRequest,
): Promise<{ token: string; id: number }> {
  if (isMock()) {
    const token = makeToken();
    return update<StoredTestimonialRequest, { token: string; id: number }>(
      'testimonial-requests',
      (rows) => {
        const id = nextId(rows);
        const now = Date.now();
        rows.push({
          id,
          tokenHash: hashToken(token),
          subjectUri: request.subjectUri,
          subjectName: request.subjectName ?? null,
          recipientName: request.recipientName ?? null,
          recipientProfile: request.recipientProfile ?? null,
          workSummary: request.workSummary ?? null,
          note: request.note ?? null,
          requesterName: request.requesterName ?? null,
          claimId: null,
          respondedAt: null,
          expiresAt: new Date(now + INVITE_TTL_MS).toISOString(),
          createdAt: new Date(now).toISOString(),
        });
        return { token, id };
      },
    );
  }
  const body = await call<{ token: string; id: number }>(
    'POST',
    '/api/testimonial-requests',
    request,
    true,
  );
  return { token: body.token, id: body.id };
}

// GET /api/testimonial-requests/:token — null when unknown, 'expired' when past its date.
export async function getTestimonialRequest(
  token: string,
): Promise<TestimonialRequest | 'expired' | null> {
  if (isMock()) {
    const found = (
      await readAll<StoredTestimonialRequest>('testimonial-requests')
    ).find((row) => row.tokenHash === hashToken(token));
    if (!found) return null;
    if (new Date(found.expiresAt) < new Date()) return 'expired';
    return {
      subjectUri: found.subjectUri,
      subjectName: found.subjectName,
      recipientName: found.recipientName,
      recipientProfile: found.recipientProfile ?? null,
      workSummary: found.workSummary,
      note: found.note,
      requesterName: found.requesterName,
      responded: !!found.respondedAt,
      claimId: found.claimId,
    };
  }
  const response = await fetch(
    `${apiBase()}/api/testimonial-requests/${encodeURIComponent(token)}`,
  );
  if (response.status === 404) return null;
  if (response.status === 410) return 'expired';
  if (!response.ok)
    throw new Error(
      `LinkedTrust testimonial lookup failed: HTTP ${response.status}`,
    );
  return response.json();
}

// POST /api/testimonial-requests/:token/responded
export async function markResponded(
  token: string,
  claimId: number,
): Promise<void> {
  if (isMock()) {
    await update<StoredTestimonialRequest, void>(
      'testimonial-requests',
      (rows) => {
        const found = rows.find((row) => row.tokenHash === hashToken(token));
        if (!found) throw new Error('Testimonial request not found');
        found.claimId = claimId;
        found.respondedAt = found.respondedAt ?? new Date().toISOString();
      },
    );
    return;
  }
  await call(
    'POST',
    `/api/testimonial-requests/${encodeURIComponent(token)}/responded`,
    { claimId },
  );
}
