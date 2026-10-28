import { useState, type FormEvent } from 'react';
import { Link, useLoaderData } from '@modern-js/runtime/router';
import { requestEndorsement } from '@api/endorsements';
import { requestOrgEmailLink } from '@api/org-email';
import {
  Notice,
  PageShell,
  errorMessage,
  inputClass,
  primaryButtonClass,
} from '../components/ui';
import type {
  VerificationFormValues,
  VerificationMethod,
} from '../types/verification';
import type { VerificationPageData } from './page.data';

const initialValues: VerificationFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  organizationName: '',
  organizationDomain: '',
  candidEntityId: '',
  profileURL: '',
  method: 'organization-email',
  organizationEmail: '',
  referenceName: '',
  referenceEmail: '',
  notes: '',
  authorized: false,
  acceptedTerms: false,
};

type Result =
  | {
      ok: true;
      method: VerificationMethod;
      sentTo: string;
      emailSent: boolean;
      from: string;
      organizationName: string;
      lookupUrl: string;
    }
  | { ok: false; message: string };

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = true,
}: {
  label: string;
  name: keyof VerificationFormValues;
  value: string;
  onChange: (name: keyof VerificationFormValues, value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {required ? (
        <span className="ml-1 text-red-600" aria-hidden="true">
          *
        </span>
      ) : (
        <span className="ml-1 font-normal text-slate-500">(optional)</span>
      )}
      <input
        className={inputClass}
        name={name}
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
      />
    </label>
  );
}

export default function VerificationPage() {
  const { methods } = useLoaderData() as VerificationPageData;
  const [values, setValues] = useState<VerificationFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const setText = (name: keyof VerificationFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setResult(null);
    const candidate = {
      candidateName: `${values.firstName.trim()} ${values.lastName.trim()}`,
      candidateEmail: values.email,
      organizationName: values.organizationName,
      organizationDomain: values.organizationDomain,
    };
    try {
      if (values.method === 'organization-email') {
        const response = await requestOrgEmailLink({
          data: { ...candidate, organizationEmail: values.organizationEmail },
        });
        if (response.status === 'domain_mismatch') {
          setResult({
            ok: false,
            message:
              'The organization email must be at the organization domain.',
          });
        } else {
          setResult({
            ok: true,
            method: 'organization-email',
            sentTo: values.organizationEmail,
            emailSent: response.email.sent,
            from: response.from,
            organizationName: values.organizationName,
            lookupUrl: response.lookupUrl,
          });
        }
      } else {
        const response = await requestEndorsement({
          data: {
            ...candidate,
            referenceName: values.referenceName,
            referenceEmail: values.referenceEmail,
            note: values.notes || undefined,
          },
        });
        setResult({
          ok: true,
          method: 'reference',
          sentTo: values.referenceEmail,
          emailSent: response.email.sent,
          from: response.from,
          organizationName: values.organizationName,
          lookupUrl: response.lookupUrl,
        });
      }
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      eyebrow="Validator demo"
      title="Verify your nonprofit role"
      intro="Choose how to demonstrate your connection to a nonprofit organization."
    >
      <form
        onSubmit={submit}
        className="space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      >
        <section aria-labelledby="claimant-heading" className="space-y-5">
          <div>
            <h2 id="claimant-heading" className="text-lg font-semibold">
              Your details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tell us who you are and which organization you represent.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              name="firstName"
              value={values.firstName}
              onChange={setText}
              placeholder="Jane"
            />
            <Field
              label="Last name"
              name="lastName"
              value={values.lastName}
              onChange={setText}
              placeholder="Doe"
            />
          </div>
          <Field
            label="Email to verify"
            name="email"
            type="email"
            value={values.email}
            onChange={setText}
            placeholder="jane@gmail.com"
          />
          <Field
            label="Nonprofit organization"
            name="organizationName"
            value={values.organizationName}
            onChange={setText}
            placeholder="Example Nonprofit"
          />
          <Field
            label="Organization domain"
            name="organizationDomain"
            value={values.organizationDomain}
            onChange={setText}
            placeholder="nonprofit.org"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Candid entity ID"
              name="candidEntityId"
              value={values.candidEntityId}
              onChange={setText}
              placeholder="Organization ID"
              required={false}
            />
            <Field
              label="Nonprofit profile URL"
              name="profileURL"
              type="url"
              value={values.profileURL}
              onChange={setText}
              placeholder="https://example.org/profile"
              required={false}
            />
          </div>
        </section>

        <section
          aria-labelledby="method-heading"
          className="space-y-4 border-t border-slate-200 pt-7"
        >
          <div>
            <h2 id="method-heading" className="text-lg font-semibold">
              Verification method
            </h2>
            <p className="mt-1 text-sm text-slate-500">Choose one.</p>
          </div>
          <div
            className="space-y-3"
            role="radiogroup"
            aria-labelledby="method-heading"
          >
            {methods.map((method) => (
              <label
                key={method.id}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${values.method === method.id ? 'border-blue-600 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <input
                  type="radio"
                  name="method"
                  value={method.id}
                  checked={values.method === method.id}
                  onChange={() =>
                    setValues((previous) => ({
                      ...previous,
                      method: method.id as VerificationMethod,
                    }))
                  }
                  className="mt-1 accent-blue-700"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {method.title}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    {method.description}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {values.method === 'organization-email' ? (
            <div className="rounded-lg bg-slate-50 p-4">
              <Field
                label="Organization email"
                name="organizationEmail"
                type="email"
                value={values.organizationEmail}
                onChange={setText}
                placeholder="jane@nonprofit.org"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Must be at the organization domain above. Domain control alone
                does not prove administrator authority.
              </p>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Your contact will be asked to confirm your exact email address
                and your role, not just your name.
              </p>
              <Field
                label="Reference name"
                name="referenceName"
                value={values.referenceName}
                onChange={setText}
                placeholder="Joe Smith"
              />
              <Field
                label="Reference email"
                name="referenceEmail"
                type="email"
                value={values.referenceEmail}
                onChange={setText}
                placeholder="joe@knownfunder.org"
              />
              <label className="block text-sm font-medium text-slate-700">
                Note to your reference{' '}
                <span className="font-normal text-slate-500">(optional)</span>
                <textarea
                  className={inputClass}
                  name="notes"
                  rows={3}
                  maxLength={500}
                  value={values.notes}
                  onChange={(event) => setText('notes', event.target.value)}
                  placeholder="Anything your reference should know?"
                />
                <span className="mt-1 block text-right text-xs text-slate-500">
                  {values.notes.length}/500
                </span>
              </label>
            </div>
          )}
        </section>

        <section
          aria-labelledby="terms-heading"
          className="space-y-4 border-t border-slate-200 pt-7"
        >
          <h2 id="terms-heading" className="text-lg font-semibold">
            Confirmation
          </h2>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={values.authorized}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  authorized: event.target.checked,
                }))
              }
              required
              className="mt-1 accent-blue-700"
            />
            <span>
              I confirm that I am authorized to request verification of this
              affiliation.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={values.acceptedTerms}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  acceptedTerms: event.target.checked,
                }))
              }
              required
              className="mt-1 accent-blue-700"
            />
            <span>
              I understand this is a demonstration and does not establish
              verified identity.
            </span>
          </label>
        </section>

        {result &&
          (result.ok ? (
            <Notice
              tone="success"
              title={
                (result.method === 'reference'
                  ? 'Endorsement request'
                  : 'Confirmation link') +
                (result.emailSent
                  ? ` sent to ${result.sentTo}`
                  : ` to ${result.sentTo} written to the server log (not sent)`)
              }
            >
              {result.method === 'reference'
                ? `Please let your contact know to look for an email from ${result.from} asking to confirm that you are an administrator of ${result.organizationName}. Once they have done so you will be able to look up your endorsements at `
                : `Look for an email from ${result.from} and open the link in it to confirm. Once you have done so you will be able to look up your verifications at `}
              <a className="break-all underline" href={result.lookupUrl}>
                {decodeURIComponent(result.lookupUrl)}
              </a>
            </Notice>
          ) : (
            <Notice tone="error" title="Not sent">
              {result.message}
            </Notice>
          ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClass}
        >
          {isSubmitting ? 'Sending…' : 'Send verification email'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Checking someone else?{' '}
        <Link className="underline" to="/lookup">
          Look up a candidate
        </Link>
      </p>
    </PageShell>
  );
}
