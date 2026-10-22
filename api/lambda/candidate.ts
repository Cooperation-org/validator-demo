import { Api, Get, Query } from '@modern-js/plugin-bff/server';
import { z } from 'zod';
import { emailSubjectUri, getClaimsBySubject } from '../_lib/linkedtrust';

// GET /api/candidate?email=jane@gmail.com
// Every LinkedClaim LinkedTrust holds about this email address.
export const getCandidate = Api(
  Get('/candidate'),
  Query(z.object({ email: z.string().email() })),
  async ({ query }) => {
    const subject = emailSubjectUri(query.email);
    return { subject, ...(await getClaimsBySubject(subject)) };
  },
);
