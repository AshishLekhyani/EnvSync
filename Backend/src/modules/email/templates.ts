interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function wrap(heading: string, bodyHtml: string, buttonLabel: string, link: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F6F8FA;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #D0D7DE;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #D0D7DE;">
              <span style="font-size:20px;font-weight:900;color:#964900;">EnvSync</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:18px;color:#1F2328;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#57606A;">${bodyHtml}</p>
              <a href="${link}" style="display:inline-block;background:#f48120;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:10px 20px;border-radius:8px;">${buttonLabel}</a>
              <p style="margin:24px 0 0;font-size:12px;color:#8C959F;word-break:break-all;">
                Or paste this link into your browser: ${link}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmail(link: string): RenderedEmail {
  return {
    subject: "Reset your EnvSync password",
    html: wrap(
      "Reset your password",
      "We received a request to reset your EnvSync password. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
      "Reset Password",
      link
    ),
    text: `Reset your EnvSync password: ${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  };
}

export function inviteEmail(orgName: string, role: string, link: string): RenderedEmail {
  return {
    subject: `You've been invited to join ${orgName} on EnvSync`,
    html: wrap(
      `Join ${orgName} on EnvSync`,
      `You've been invited to join <strong>${orgName}</strong> as <strong>${role}</strong>. This link expires in 7 days.`,
      "Accept Invite",
      link
    ),
    text: `You've been invited to join ${orgName} on EnvSync as ${role}: ${link}\n\nThis link expires in 7 days.`,
  };
}

export function verificationEmail(link: string): RenderedEmail {
  return {
    subject: "Verify your EnvSync email address",
    html: wrap(
      "Verify your email",
      "Confirm this is your email address to finish securing your EnvSync account. This link expires in 24 hours.",
      "Verify Email",
      link
    ),
    text: `Verify your EnvSync email address: ${link}\n\nThis link expires in 24 hours.`,
  };
}
