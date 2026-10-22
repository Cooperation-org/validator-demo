import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from '@modern-js/runtime/router';
import { getCandidate } from '@api/candidate';
import {
  Card,
  Notice,
  PageShell,
  errorMessage,
  inputClass,
  primaryButtonClass,
} from '../../components/ui';

type Candidate = Awaited<ReturnType<typeof getCandidate>>;
type Claim = Candidate['claims'][number];

const strip = (uri?: string | null) => (uri ?? '').replace(/^mailto:/, '');

// One line per claim, in the terms a person checking a candidate cares about.
function describe(claim: Claim) {
  if (claim.claim === 'RELATED_TO' && claim.aspect === 'relationship:same-as') {
    return `Controls ${strip(claim.object)} (opened a one-time link sent there)`;
  }
  if (claim.claim === 'is_vouched_for')
    return `Endorsed by ${claim.author ?? 'a reference'}`;
  return claim.claim;
}

// Everything recorded about a candidate's email address.
export default function LookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [input, setInput] = useState(email);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInput(email);
    if (!email) return;
    setLoading(true);
    setError(null);
    getCandidate({ query: { email } })
      .then(setCandidate)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [email]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchParams({ email: input.trim() });
  };

  return (
    <PageShell
      eyebrow="Validator demo"
      title="Look up a candidate"
      intro="What has been verified for an email address."
      back={
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          <span aria-hidden="true">←</span> Back to verification form
        </Link>
      }
    >
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Candidate email
            <input
              className={inputClass}
              type="email"
              required
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="jane@gmail.com"
            />
          </label>
          <button
            type="submit"
            className={`${primaryButtonClass} sm:w-auto sm:px-8`}
            disabled={loading}
          >
            {loading ? 'Looking up…' : 'Look up'}
          </button>
        </form>
        {error ? (
          <Notice tone="error" title="Lookup failed">
            {error}
          </Notice>
        ) : null}
        {candidate && !loading ? (
          candidate.claims.length === 0 ? (
            <Notice
              tone="info"
              title={`Nothing verified yet for ${strip(candidate.subject)}`}
            />
          ) : (
            <ul className="divide-y divide-slate-200 border-t border-slate-200">
              {candidate.claims.map((claim) => (
                <li key={claim.id} className="py-4 text-sm">
                  <p className="font-medium text-slate-900">
                    {describe(claim)}
                  </p>
                  {claim.statement ? (
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">
                      {claim.statement}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {claim.effectiveDate
                      ? new Date(claim.effectiveDate).toLocaleString()
                      : null}{' '}
                    · claim #{claim.id}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </Card>
    </PageShell>
  );
}
