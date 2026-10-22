export type VerificationMethod = 'organization-email' | 'reference';

export type VerificationFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  organizationName: string;
  organizationDomain: string;
  candidEntityId: string;
  profileURL: string;
  method: VerificationMethod;
  organizationEmail: string;
  referenceName: string;
  referenceEmail: string;
  notes: string;
  authorized: boolean;
  acceptedTerms: boolean;
};
