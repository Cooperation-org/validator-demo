import type { VerificationMethod } from '../types/verification';

// The route loader runs in the browser because SSR is disabled.
export type VerificationPageData = {
  methods: { id: VerificationMethod; title: string; description: string }[];
};

export const loader = async (): Promise<VerificationPageData> => ({
  methods: [
    {
      id: 'organization-email',
      title: 'Organization email',
      description:
        'We email a one-time link to your address at the organization’s domain.',
    },
    {
      id: 'reference',
      title: 'Reference endorsement',
      description:
        'We email someone who knows you and ask them to confirm your email address and role.',
    },
  ],
});
