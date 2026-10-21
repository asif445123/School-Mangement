import nodemailer from "nodemailer";

/**
 * SMTP is read from env vars. For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465,
 * SMTP_USER=<your address>, SMTP_PASS=<a Gmail App Password, NOT your normal Gmail password:
 * create one at https://myaccount.google.com/apppasswords (2-Step Verification must be on).>
 */
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in your .env.local file.");
  }
  const port = Number(SMTP_PORT) || 465;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT must be a valid port number.");
  return nodemailer.createTransport({
    host: SMTP_HOST, port,
    secure: port === 465, // true for 465 (SSL), false for 587 / others (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Sends a "Contact Us" form submission to CONTACT_EMAIL (default: the owner's address).
 * Replying to the email goes straight to the person who filled in the form.
 */
export async function sendContactMessage(name: string, fromEmail: string, message: string, subject?: string) {
  const transporter = getTransporter();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "School Management";
  const recipient = process.env.CONTACT_EMAIL || process.env.MAIL_TO || "masifrana445@gmail.com";
  try {
    await transporter.sendMail({
      from: `"${siteName} Contact Form" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: recipient,
      replyTo: `"${name.replace(/"/g, "")}" <${fromEmail}>`,
      subject: subject || `New contact message from ${name}`,
      text: `${message}\n\n--\nFrom: ${name}\nEmail: ${fromEmail}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>New message from ${esc(siteName)}'s Contact Us form</h2>
          <p><strong>From:</strong> ${esc(name)} (${esc(fromEmail)})</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; border-left: 3px solid #2563eb; padding-left: 12px;">${esc(message)}</p>
        </div>`,
    });
  } catch (err) {
    console.error("nodemailer sendMail failed:", err); // e.g. "Invalid login: 535" = normal password used instead of a Gmail App Password
    throw err;
  }
}

export async function sendResetEmail(to: string, resetUrl: string) {
  const transporter = getTransporter();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "School Management";
  try {
    const info = await transporter.sendMail({
      from: `"${siteName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `Reset your ${siteName} password`,
      text: `Reset your ${siteName} password using this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Reset your password</h2>
          <p>We received a request to reset your ${esc(siteName)} account password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Reset password</a></p>
          <p style="font-size:12px;color:#64748b;">If the button does not work, copy this link into your browser:<br>${esc(resetUrl)}</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>`,
    });
    // some SMTP servers accept the connection but reject the recipient without throwing
    const accepted = info.accepted.some((a: any) => (typeof a === "string" ? a : a.address).toLowerCase() === to.toLowerCase());
    if (!accepted) throw new Error(`SMTP server rejected the reset-email recipient (${info.response}).`);
  } catch (err) {
    console.error("nodemailer sendMail failed:", err); // "Invalid login: 535" = normal password used instead of a Gmail App Password
    throw err;
  }
}
