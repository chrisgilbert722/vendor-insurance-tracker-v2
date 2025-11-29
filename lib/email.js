// lib/email.js
// Simple email helper for Renewal Engine (Phase 2)
// Wire this to your real email provider later.

export async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject || (!html && !text)) {
    console.warn("[sendEmail] Missing fields:", { to, subject });
    return;
  }

  // 🔥 PLACEHOLDER: Replace with your real email provider
  // Example: Resend, SendGrid, SES, etc.
  //
  // For now, we just log. This prevents crashes in dev.
  console.log("[sendEmail] ->", { to, subject });

  // TODO: integrate real provider here
  // await resend.emails.send({ from, to, subject, html });
}
