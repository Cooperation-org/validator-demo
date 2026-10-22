// Sends mail over SMTP (Amazon WorkMail, Amazon SES SMTP or any other relay).
// SMTP env names are the same as Cooperation-org/validator-service.
//
// EMAIL_MODE=smtp sends. EMAIL_MODE=log prints the message to the server log
// instead and reports it as not sent.
import nodemailer, { type Transporter } from 'nodemailer';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

let transporter: Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    const port = Number(required('SMTP_PORT'));
    transporter = nodemailer.createTransport({
      host: required('SMTP_HOST'),
      port,
      // 465 is TLS from the start; 587 upgrades with STARTTLS.
      secure: port === 465,
      auth: { user: required('SMTP_USER'), pass: required('SMTP_PASSWORD') },
    });
  }
  return transporter;
};

export type EmailResult = { sent: boolean; messageId: string | null };

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  const mode = process.env.EMAIL_MODE;
  if (mode === 'log') {
    console.log(
      `[email not sent, EMAIL_MODE=log] to=${message.to} subject=${message.subject}\n${message.text}`,
    );
    return { sent: false, messageId: null };
  }
  if (mode !== 'smtp') throw new Error('EMAIL_MODE must be "smtp" or "log"');
  const info = await getTransporter().sendMail({
    from: required('SES_FROM_EMAIL'),
    ...message,
  });
  return { sent: true, messageId: info.messageId };
}

export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Plain text and HTML versions of a short message with one link.
export function linkEmail(
  greeting: string,
  paragraphs: string[],
  linkLabel: string,
  url: string,
) {
  const text = `${greeting}\n\n${paragraphs.join('\n\n')}\n\n${linkLabel}: ${url}\n`;
  const html =
    `<p>${escapeHtml(greeting)}</p>` +
    paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('') +
    `<p><a href="${escapeHtml(url)}">${escapeHtml(linkLabel)}</a></p>`;
  return { text, html };
}

// Absolute URL of a page in this app, for links in emails.
export const appUrl = (pathname: string) => {
  const base = required('APP_URL').replace(/\/$/, '');
  return `${base}${pathname}`;
};
