import { useEffect, useState } from 'react';
import { Link, useParams } from '@modern-js/runtime/router';
import { confirmOrgEmail, getOrgEmailLink } from '@api/org-email';
import {
  Card,
  Notice,
  PageShell,
  errorMessage,
  primaryButtonClass,
} from '../../../components/ui';

type LinkState = Awaited<ReturnType<typeof getOrgEmailLink>>;

// Page opened from the one-time link sent to the organization address.
// Confirming is a button, not the link itself, so mail scanners that open
// links cannot use it up.
export default function VerifyPage() {
  const { token = '' } = useParams();
  const [link, setLink] = useState<LinkState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    getOrgEmailLink({ params: { token } })
      .then(setLink)
      .catch((e) => setError(errorMessage(e)));
  }, [token]);

  const confirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      const response = await confirmOrgEmail({ params: { token } });
      if (response.status === 'confirmed') setConfirmed(true);
      else setLink({ status: response.status });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setConfirming(false);
    }
  };

  if (!link && !error)
    return (
      <PageShell eyebrow="Organization email" title="Loading…">
        {null}
      </PageShell>
    );
  if (link?.status === 'not_found')
    return (
      <PageShell eyebrow="Organization email" title="This link is not valid">
        {null}
      </PageShell>
    );
  if (link?.status === 'used')
    return (
      <PageShell
        eyebrow="Organization email"
        title="This link was already used"
      >
        {null}
      </PageShell>
    );
  if (link?.status === 'expired')
    return (
      <PageShell
        eyebrow="Organization email"
        title="This link has expired"
        intro="Start again from the verification form."
      >
        {null}
      </PageShell>
    );
  if (!link || link.status !== 'open')
    return (
      <PageShell eyebrow="Organization email" title="Could not load this link">
        <Notice tone="error" title="Error">
          {error}
        </Notice>
      </PageShell>
    );

  if (confirmed) {
    return (
      <PageShell
        eyebrow="Organization email"
        title="Confirmed"
        intro={`${link.organizationEmail} is now linked to ${link.candidateEmail}.`}
      >
        <Link
          className="text-sm underline"
          to={`/lookup?email=${encodeURIComponent(link.candidateEmail)}`}
        >
          See the record for {link.candidateEmail}
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Organization email"
      title={`Confirm ${link.organizationEmail}`}
    >
      <Card>
        <p className="text-sm text-slate-700">
          This links {link.organizationEmail} ({link.organizationName}) to{' '}
          {link.candidateEmail} for {link.candidateName}.
        </p>
        {error ? (
          <Notice tone="error" title="Not confirmed">
            {error}
          </Notice>
        ) : null}
        <button
          type="button"
          onClick={confirm}
          disabled={confirming}
          className={primaryButtonClass}
        >
          {confirming ? 'Confirming…' : 'Confirm'}
        </button>
      </Card>
    </PageShell>
  );
}
