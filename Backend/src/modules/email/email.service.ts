import { env } from "../../config/env";

export function isEmailConfigured(): boolean {
  return !!(env.SENDGRID_API_KEY && env.EMAIL_FROM);
}

const SENDGRID_TIMEOUT_MS = 20000;

function parseFromAddress(raw: string): { email: string; name?: string } {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { email: match[2].trim(), name: name || undefined };
  }
  return { email: raw.trim() };
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SENDGRID_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: parseFromAddress(env.EMAIL_FROM!),
        subject: payload.subject,
        content: [
          { type: "text/plain", value: payload.text },
          { type: "text/html", value: payload.html },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`SendGrid responded ${res.status}: ${body}`);
    }

    return { sent: true };
  } catch (err) {
    console.error("Failed to send email", err);
    return { sent: false };
  } finally {
    clearTimeout(timeout);
  }
}
