// Reads LinkedClaims from the LinkedTrust backend (trust_claim_backend).
// A person is addressed by `mailto:<email>`, the same subject URI the
// backend's identity linking uses.

export type LinkedClaim = {
  id: number;
  subject: string;
  claim: string;
  object?: string | null;
  statement?: string | null;
  aspect?: string | null;
  howKnown?: string | null;
  sourceURI?: string | null;
  effectiveDate?: string | null;
  createdAt?: string;
};

export type SubjectClaims = {
  claims: LinkedClaim[];
  linkedSubjects: string[];
  total: number;
};

const apiBase = () => {
  const base = process.env.LINKEDTRUST_API_URL;
  if (!base) throw new Error('LINKEDTRUST_API_URL is not set');
  return base.replace(/\/$/, '');
};

export const emailSubjectUri = (email: string) =>
  `mailto:${email.trim().toLowerCase()}`;

// GET /api/claims/subject/:uri — includes subjects linked by SAME_AS claims.
export async function getClaimsBySubject(uri: string): Promise<SubjectClaims> {
  const response = await fetch(
    `${apiBase()}/api/claims/subject/${encodeURIComponent(uri)}`,
  );
  if (!response.ok) {
    throw new Error(`LinkedTrust lookup failed: HTTP ${response.status}`);
  }
  const body = await response.json();
  return {
    claims: body.claims ?? [],
    linkedSubjects: body.linkedSubjects ?? [],
    total: body.pagination?.total ?? 0,
  };
}
