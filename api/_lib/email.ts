// Sends mail over SMTP (Amazon SES SMTP or any other relay).
// Same env names as Cooperation-org/validator-service, so its config carries over.
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

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const info = await getTransporter().sendMail({
    from: required('SES_FROM_EMAIL'),
    ...message,
  });
  return { messageId: info.messageId };
}
