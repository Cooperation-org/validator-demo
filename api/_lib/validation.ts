import { z } from 'zod';

// "https://www.Nonprofit.org/about" -> "nonprofit.org"
export const normalizeDomain = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '');

export const name = z.string().trim().min(1).max(200);
export const email = z.string().trim().toLowerCase().email();
export const domain = z
  .string()
  .transform(normalizeDomain)
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9-]+(\.[a-z0-9-]+)+$/,
        'Enter a domain like nonprofit.org',
      ),
  );

// The person asking to be verified, and the organization they say they administer.
export const Candidate = z.object({
  candidateName: name,
  candidateEmail: email,
  organizationName: name,
  organizationDomain: domain,
});

export const TokenParams = z.object({ token: z.string().min(4).max(64) });
