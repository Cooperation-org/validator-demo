import type { ActionFunctionArgs } from '@modern-js/runtime/router';
import type {
  DemoSubmissionResult,
  VerificationFormValues,
  VerificationMethod,
} from '../types/verification';

// The route loader runs in the browser because SSR is disabled.
// Replace this data with a GET request when the backend offers suitable metadata.
export type VerificationPageData = {
  methods: { id: VerificationMethod; title: string; description: string }[];
  demoMode: true;
};

export const loader = async (): Promise<VerificationPageData> => ({
  demoMode: true,
  methods: [
    {
      id: 'organization-email',
      title: 'Organization email',
      description: 'Demonstrate verification with a nonprofit-domain email.',
    },
    {
      id: 'reference',
      title: 'Reference endorsement',
      description: 'Demonstrate requesting an endorsement from a trusted contact.',
    },
  ],
});

const isNonEmpty = (value: string) => value.trim().length > 0;
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const action = async ({ request }: ActionFunctionArgs): Promise<DemoSubmissionResult> => {
  if (request.method.toUpperCase() !== 'POST') {
    return { ok: false, mode: 'demo', message: 'Unsupported request method.' };
  }

  let values: VerificationFormValues;
  try {
    values = (await request.json()) as VerificationFormValues;
  } catch {
    return { ok: false, mode: 'demo', message: 'Invalid form submission.' };
  }

  if (
    !isNonEmpty(values.firstName) || !isNonEmpty(values.lastName) ||
    !isValidEmail(values.email) || !isNonEmpty(values.organizationName) ||
    !isNonEmpty(values.organizationDomain) || !isNonEmpty(values.candidEntityId) ||
    !isNonEmpty(values.profileURL) || !values.authorized || !values.acceptedTerms
  ) {
    return { ok: false, mode: 'demo', message: 'Complete all required fields and consent checkboxes.' };
  }

  try {
    const url = new URL(values.profileURL);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
  } catch {
    return { ok: false, mode: 'demo', message: 'Enter a valid nonprofit profile URL.' };
  }

  if (values.notes.length > 500) {
    return { ok: false, mode: 'demo', message: 'Notes must be 500 characters or fewer.' };
  }

  if (values.method === 'organization-email') {
    if (!isValidEmail(values.organizationEmail)) {
      return { ok: false, mode: 'demo', message: 'Enter a valid organization email address.' };
    }
    // A matching email domain is a UI hint, NOT evidence of organizational authority.
    const domain = values.organizationDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
    const emailDomain = values.organizationEmail.split('@')[1]?.toLowerCase();
    if (emailDomain !== domain) {
      return { ok: false, mode: 'demo', message: 'The organization email must match the organization domain.' };
    }
  } else if (values.method === 'reference') {
    if (!isNonEmpty(values.referenceName) || !isValidEmail(values.referenceEmail)) {
      return { ok: false, mode: 'demo', message: 'Enter a reference name and valid email address.' };
    }
  } else {
    return { ok: false, mode: 'demo', message: 'Choose a verification method.' };
  }

  // No real API call here. Never claim delivery or verification for mock behavior.
  return {
    ok: true,
    mode: 'demo',
    status: 'not_sent',
    message: values.method === 'organization-email'
      ? 'Demo request recorded locally. No magic link was generated or sent.'
      : 'Demo request recorded locally. No endorsement email was sent.',
  };
};

