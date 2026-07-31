import { promises as dns } from "dns";
import nodemailer, { Transporter } from "nodemailer";
import { env } from "../../config/env";

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
}

const SMTP_TIMEOUT_MS = 20000;

// Render's network has no outbound IPv6 route, but Node's dual-stack DNS
// resolution can still hand back an IPv6 address, causing an ENETUNREACH
// hang. Resolving to IPv4 ourselves and pinning `tls.servername` to the
// original hostname keeps cert validation correct while avoiding IPv6.
async function resolveIPv4Host(host: string): Promise<string> {
  try {
    const addresses = await dns.resolve4(host);
    return addresses[0] ?? host;
  } catch {
    return host;
  }
}

async function getTransporter(): Promise<Transporter> {
  if (!transporter) {
    const resolvedHost = await resolveIPv4Host(env.SMTP_HOST!);
    transporter = nodemailer.createTransport({
      host: resolvedHost,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
      tls: { servername: env.SMTP_HOST },
    });
  }
  return transporter;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean }> {
  if (!isEmailConfigured()) {
    return { sent: false };
  }

  try {
    const activeTransporter = await getTransporter();
    await activeTransporter.sendMail({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send email", err);
    return { sent: false };
  }
}
