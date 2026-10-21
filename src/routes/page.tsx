import { useState, type FormEvent } from 'react';
import { useFetcher, useLoaderData } from '@modern-js/runtime/router';
import type { DemoSubmissionResult, VerificationFormValues, VerificationMethod } from '../types/verification';
import type { VerificationPageData } from './page.data';
import './index.css';

const initialValues: VerificationFormValues = {
  firstName: '', lastName: '', email: '', organizationName: '',
  organizationDomain: '', candidEntityId: '', profileURL: '',
  method: 'organization-email', organizationEmail: '',
  referenceName: '', referenceEmail: '', notes: '',
  authorized: false, acceptedTerms: false,
};

const inputClass =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15';

function Field({ label, name, value, onChange, type = 'text', placeholder, required = true }: {
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
      {label}{required ? <span className="ml-1 text-red-600" aria-hidden="true">*</span> : null}
      <input className={inputClass} name={name} value={value} type={type} placeholder={placeholder}
        onChange={event => onChange(name, event.target.value)} required={required} />
    </label>
  );
}

export default function VerificationPage() {
  const { methods, demoMode } = useLoaderData() as VerificationPageData;
  const fetcher = useFetcher<DemoSubmissionResult>();
  const [values, setValues] = useState<VerificationFormValues>(initialValues);
  const isSubmitting = fetcher.state !== 'idle';
  const result = fetcher.data;

  const setText = (name: keyof VerificationFormValues, value: string) => {
    setValues(previous => ({ ...previous, [name]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    fetcher.submit(values, { method: 'post', encType: 'application/json' });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Validator demo</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Verify your nonprofit role</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Choose how to demonstrate your connection to a nonprofit organization.
          </p>
        </header>

        {demoMode && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
            <strong>Demo mode:</strong> Requests are simulated. No emails are sent and no person is verified.
          </div>
        )}

        <form onSubmit={submit} className="space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <section aria-labelledby="claimant-heading" className="space-y-5">
            <div>
              <h2 id="claimant-heading" className="text-lg font-semibold">Your details</h2>
              <p className="mt-1 text-sm text-slate-500">Tell us who you are and which organization you represent.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" name="firstName" value={values.firstName} onChange={setText} placeholder="Jane" />
              <Field label="Last name" name="lastName" value={values.lastName} onChange={setText} placeholder="Doe" />
            </div>
            <Field label="Email to verify" name="email" type="email" value={values.email} onChange={setText} placeholder="jane@gmail.com" />
            <Field label="Nonprofit organization" name="organizationName" value={values.organizationName} onChange={setText} placeholder="Example Nonprofit" />
            <Field label="Organization domain" name="organizationDomain" value={values.organizationDomain} onChange={setText} placeholder="nonprofit.org" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Candid entity ID" name="candidEntityId" value={values.candidEntityId} onChange={setText} placeholder="Organization ID" />
              <Field label="Nonprofit profile URL" name="profileURL" type="url" value={values.profileURL} onChange={setText} placeholder="https://example.org/profile" />
            </div>
          </section>

          <section aria-labelledby="method-heading" className="space-y-4 border-t border-slate-200 pt-7">
            <div>
              <h2 id="method-heading" className="text-lg font-semibold">Verification method</h2>
              <p className="mt-1 text-sm text-slate-500">Choose one approach to demonstrate in this prototype.</p>
            </div>
            <div className="space-y-3" role="radiogroup" aria-labelledby="method-heading">
              {methods.map(method => (
                <label key={method.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${values.method === method.id ? 'border-blue-600 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="method" value={method.id} checked={values.method === method.id}
                    onChange={() => setValues(previous => ({ ...previous, method: method.id as VerificationMethod }))}
                    className="mt-1 accent-blue-700" />
                  <span>
                    <span className="block text-sm font-semibold">{method.title}</span>
                    <span className="mt-1 block text-sm text-slate-600">{method.description}</span>
                  </span>
                </label>
              ))}
            </div>

            {values.method === 'organization-email' ? (
              <div className="rounded-lg bg-slate-50 p-4">
                <Field label="Organization email" name="organizationEmail" type="email" value={values.organizationEmail} onChange={setText} placeholder="jane@nonprofit.org" />
                <p className="mt-2 text-xs leading-5 text-slate-500">The address should match the domain above. Domain control alone does not prove administrator authority.</p>
              </div>
            ) : (
              <div className="space-y-4 rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Your contact would need to confirm your exact email address, identity, and role—not just recognize your name.</p>
                <Field label="Reference name" name="referenceName" value={values.referenceName} onChange={setText} placeholder="Joe Smith" />
                <Field label="Reference email" name="referenceEmail" type="email" value={values.referenceEmail} onChange={setText} placeholder="joe@knownfunder.org" />
              </div>
            )}
          </section>

          <section aria-labelledby="terms-heading" className="space-y-4 border-t border-slate-200 pt-7">
            <h2 id="terms-heading" className="text-lg font-semibold">Confirmation</h2>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={values.authorized} onChange={event => setValues(previous => ({ ...previous, authorized: event.target.checked }))} required className="mt-1 accent-blue-700" />
              <span>I confirm that I am authorized to request verification of this affiliation.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={values.acceptedTerms} onChange={event => setValues(previous => ({ ...previous, acceptedTerms: event.target.checked }))} required className="mt-1 accent-blue-700" />
              <span>I understand this is a demonstration and does not establish verified identity.</span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Additional notes <span className="font-normal text-slate-500">(optional)</span>
              <textarea className={inputClass} name="notes" rows={3} maxLength={500} value={values.notes}
                onChange={event => setText('notes', event.target.value)} placeholder="Anything your reference should know?" />
              <span className="mt-1 block text-right text-xs text-slate-500">{values.notes.length}/500</span>
            </label>
          </section>

          {result && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${result.ok ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-red-200 bg-red-50 text-red-900'}`} role="status" aria-live="polite">
              <strong>{result.ok ? 'Demo only — not sent' : 'Please check your form'}</strong>
              <p className="mt-1">{result.message}</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? 'Submitting…' : 'Continue (demo only)'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">Prototype only · No real verification or email delivery</p>
      </div>
    </main>
  );
}
