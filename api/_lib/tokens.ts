// Link tokens, same scheme as trust_claim_backend src/api/testimonialRequests.ts:
// 7 characters from an unambiguous alphabet, stored only as a SHA-256 hash.
import crypto from 'node:crypto';

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const TOKEN_LENGTH = 7;

export function makeToken(): string {
  const bytes = crypto.randomBytes(TOKEN_LENGTH);
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i++)
    out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const isTokenShaped = (token: string) =>
  token.length >= 4 && token.length <= 64;
