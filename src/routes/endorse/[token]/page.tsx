import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from '@modern-js/runtime/router';
import { getEndorsement, respondToEndorsement } from '@api/endorsements';
import {
  Card,
  Notice,
  PageShell,
  errorMessage,
  inputClass,
  primaryButtonClass,
} from '../../../components/ui';

type Invite = Awaited<ReturnType<typeof getEndorsement>>;
type Answer = 'yes' | 'no' | '';

function YesNo({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: Answer;
  onChange: (value: Answer) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      <div className="flex gap-6 text-sm">
        {(['yes', 'no'] as const).map((option) => (
          <label key={option} className="flex items-center gap-2">
            <input
              type="radio"
              required
              checked={value === option}
              onChange={() => onChange(option)}
              className="accent-blue-700"
            />
            {option === 'yes' ? 'Yes' : 'No'}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Page a reference opens from the endorsement email.
export default function EndorsePage() {
  const { token = '' } = useParams();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmsEmail, setConfirmsEmail] = useState<Answer>('');
  const [confirmsRole, setConfirmsRole] = useState<Answer>('');
  const [referenceName, setReferenceName] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    getEndorsement({ params: { token } })
      .then((found) => {
        setInvite(found);
        if (found.status === 'open' || found.status === 'answered')
          setReferenceName(found.referenceName ?? '');
      })
      .catch((error) => setLoadError(errorMessage(error)));
  }, [token]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setSendError(null);
    try {
      const response = await respondToEndorsement({
        params: { token },
        data: {
          confirmsEmail: confirmsEmail === 'yes',
          confirmsRole: confirmsRole === 'yes',
          referenceName,
          comment: comment || undefined,
        },
      });
      setOutcome(response.status);
    } catch (error) {
      setSendError(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  if (loadError)
    return (
      <PageShell eyebrow="Endorsement" title="Could not load this request">
        <Notice tone="error" title="Error">
          {loadError}
        </Notice>
      </PageShell>
    );
  if (!invite)
    return (
      <PageShell eyebrow="Endorsement" title="Loading…">
        {null}
      </PageShell>
    );
  if (invite.status === 'not_found')
    return (
      <PageShell eyebrow="Endorsement" title="This link is not valid">
        {null}
      </PageShell>
    );
  if (invite.status === 'expired')
    return (
      <PageShell
        eyebrow="Endorsement"
        title="This link has expired"
        intro="Ask whoever sent it for a new one."
      >
        {null}
      </PageShell>
    );
  if (invite.status === 'answered' || outcome === 'answered')
    return (
      <PageShell
        eyebrow="Endorsement"
        title="Already answered"
        intro="Thank you. This request has been answered."
      >
        {null}
      </PageShell>
    );

  const { candidateName, candidateEmail, role, note } = invite;

  if (outcome === 'confirmed') {
    return (
      <PageShell
        eyebrow="Endorsement"
        title="Thank you"
        intro={`Your confirmation for ${candidateName} (${candidateEmail}) is recorded.`}
      >
        {null}
      </PageShell>
    );
  }
  if (outcome === 'declined') {
    return (
      <PageShell
        eyebrow="Endorsement"
        title="Thank you"
        intro={`Nothing was recorded for ${candidateName}.`}
      >
        {null}
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Endorsement"
      title={`${candidateName} asked you to confirm two things`}
    >
      <form onSubmit={submit}>
        <Card>
          {note ? (
            <blockquote className="border-l-4 border-blue-200 pl-4 text-sm text-slate-700">
              <span className="block text-xs font-medium text-slate-500">
                Note from {candidateName}
              </span>
              {note}
            </blockquote>
          ) : null}
          <YesNo
            legend={`Is ${candidateEmail} ${candidateName}'s email address?`}
            value={confirmsEmail}
            onChange={setConfirmsEmail}
          />
          <YesNo
            legend={`Is ${candidateName} ${role}?`}
            value={confirmsRole}
            onChange={setConfirmsRole}
          />
          <label className="block text-sm font-medium text-slate-700">
            Your name
            <input
              className={inputClass}
              value={referenceName}
              onChange={(event) => setReferenceName(event.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Comment{' '}
            <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              className={inputClass}
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          {sendError ? (
            <Notice tone="error" title="Not sent">
              {sendError}
            </Notice>
          ) : null}
          <button
            type="submit"
            disabled={sending}
            className={primaryButtonClass}
          >
            {sending ? 'Sending…' : 'Send answer'}
          </button>
        </Card>
      </form>
    </PageShell>
  );
}
