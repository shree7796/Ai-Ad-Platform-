"""
Email delivery via SendGrid.
Falls back to a console log when SENDGRID_API_KEY is not set (local dev).
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _build_verify_html(app_name: str, verify_url: str, username: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#141414;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">
                {app_name}
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                Verify your email address
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;line-height:1.6;">
                Hey {username}, thanks for signing up! Click the button below to confirm your email
                and activate your account.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="{verify_url}"
                       style="display:inline-block;padding:14px 32px;background:#ffffff;color:#0a0a0a;
                              font-size:15px;font-weight:700;text-decoration:none;border-radius:9999px;
                              letter-spacing:-0.01em;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#737373;line-height:1.6;">
                Or copy this link into your browser:<br/>
                <a href="{verify_url}" style="color:#a3a3a3;word-break:break-all;">{verify_url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px;" />
              <p style="margin:0;font-size:12px;color:#525252;line-height:1.5;">
                This link expires in 24 hours. If you didn't create an account you can safely ignore
                this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_verification_email(
    to_email: str,
    username: str,
    verify_url: str,
    from_address: str = "noreply@yourdomain.com",
    from_name: str = "KreaDock",
    sendgrid_api_key: Optional[str] = None,
) -> bool:
    """
    Send an email verification link.

    Returns True on success, False on failure.
    If sendgrid_api_key is None the email is printed to the console instead
    (handy for local development).
    """
    subject = f"Verify your {from_name} email address"
    html_content = _build_verify_html(from_name, verify_url, username)
    plain_content = (
        f"Hi {username},\n\n"
        f"Verify your {from_name} account by visiting:\n{verify_url}\n\n"
        "This link expires in 24 hours.\n"
    )

    if not sendgrid_api_key:
        # Dev fallback — print to console so devs can click the link
        logger.warning(
            "[EmailService] SENDGRID_API_KEY not set — printing verification link:\n"
            "  To:  %s\n"
            "  URL: %s",
            to_email,
            verify_url,
        )
        return True

    try:
        from sendgrid import SendGridAPIClient  # type: ignore
        from sendgrid.helpers.mail import Mail, Email, To, Content  # type: ignore

        message = Mail(
            from_email=Email(from_address, from_name),
            to_emails=To(to_email),
            subject=subject,
        )
        message.add_content(Content("text/plain", plain_content))
        message.add_content(Content("text/html", html_content))

        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)

        if response.status_code >= 400:
            logger.error(
                "[EmailService] SendGrid error %s: %s",
                response.status_code,
                response.body,
            )
            return False

        logger.info("[EmailService] Verification email sent to %s", to_email)
        return True

    except Exception as exc:
        logger.error("[EmailService] Failed to send email to %s: %s", to_email, exc)
        return False
