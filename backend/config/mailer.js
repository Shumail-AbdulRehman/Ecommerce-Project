const https = require("https");
const nodemailer = require("nodemailer");

function smtpConfig() {
  const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) return null;

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
}

function senderAddress() {
  const candidates = [
    process.env.SMTP_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER,
  ].filter(Boolean);

  return candidates.find((value) => /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(value));
}

function senderName() {
  return process.env.SMTP_FROM_NAME || "Shumara Store";
}

function getTransporter() {
  const config = smtpConfig();
  return config ? nodemailer.createTransport(config) : null;
}

async function brevoSendMail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[Mailer] BREVO_API_KEY not set.");
    return null;
  }

  const senderEmail = senderAddress();
  if (!senderEmail) {
    console.error("[Mailer] SMTP_FROM_EMAIL must be set to a verified Brevo sender email.");
    return null;
  }
  const senderDisplayName = senderName();

  const payload = JSON.stringify({
    sender: { name: senderDisplayName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: "api.brevo.com",
      path: "/v3/smtp/email",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[Mailer] Email sent to ${to}`);
          resolve(JSON.parse(data));
        } else {
          console.error(`[Mailer] Brevo API error ${res.statusCode}:`, data);
          resolve(null);
        }
      });
    });

    req.on("error", (err) => {
      console.error("[Mailer] Request failed:", err.message);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

async function verifyMailer() {
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.verify();
      console.log("[Mailer] Brevo SMTP ready.");
      return;
    } catch (err) {
      console.warn("[Mailer] Brevo SMTP verification failed:", err.message);
    }
  }

  if (process.env.BREVO_API_KEY) console.log("[Mailer] Brevo HTTP API fallback ready.");
  else console.warn("[Mailer] WARNING: SMTP credentials and BREVO_API_KEY are not configured.");
}

async function smtpSendMail({ to, subject, html, text, replyTo }) {
  const transporter = getTransporter();
  if (!transporter) return null;

  const fromEmail = senderAddress();
  if (!fromEmail) {
    console.error("[Mailer] SMTP_FROM_EMAIL must be set to a verified Brevo sender email.");
    return null;
  }

  const result = await transporter.sendMail({
    from: `${senderName()} <${fromEmail}>`,
    to,
    subject,
    html,
    text,
    replyTo,
  });

  console.log(`[Mailer] SMTP email sent to ${to}`);
  return result;
}

async function sendMail({ to, subject, html, text, replyTo }) {
  const smtpResult = await smtpSendMail({ to, subject, html, text, replyTo }).catch((err) => {
    console.error("[Mailer] SMTP send failed:", err.message);
    return null;
  });
  if (smtpResult) return smtpResult;

  return brevoSendMail({ to, subject, html });
}

async function sendOTPEmail(email, name, otp) {
  return sendMail({
    to: email,
    subject: "Your Shumara Verification Code",
    html: `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:40px;background:#fff;border-radius:16px;">
      <h1 style="text-align:center;color:#111827;">SHUMARA</h1>
      <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
      <p style="color:#6B7280;">Your verification code is:</p>
      <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <h2 style="letter-spacing:12px;color:#111827;font-size:36px;margin:0;">${otp}</h2>
      </div>
      <p style="color:#9CA3AF;font-size:13px;">Expires in 10 minutes. Ignore if you didn't request this.</p>
      <p style="color:#9CA3AF;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Shumara Store</p>
    </div>`,
  });
}

async function sendPasswordResetEmail(email, name, otp) {
  return sendMail({
    to: email,
    subject: "Reset Your Shumara Password",
    html: `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:40px;background:#fff;border-radius:16px;">
      <h1 style="text-align:center;color:#EF4444;">SHUMARA</h1>
      <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
      <p style="color:#6B7280;">Your password reset code is:</p>
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <h2 style="letter-spacing:12px;color:#EF4444;font-size:36px;margin:0;">${otp}</h2>
      </div>
      <p style="color:#9CA3AF;font-size:13px;">Expires in 10 minutes. Ignore if you didn't request this.</p>
      <p style="color:#9CA3AF;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Shumara Store</p>
    </div>`,
  });
}

async function sendWelcomeEmail(email, name) {
  return sendMail({
    to: email,
    subject: "Welcome to Shumara Store!",
    html: `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:40px;background:#fff;border-radius:16px;text-align:center;">
      <h1 style="color:#111827;">SHUMARA</h1>
      <div style="font-size:48px;margin:16px 0;">🎉</div>
      <h2 style="color:#111827;">Welcome, ${name}!</h2>
      <p style="color:#6B7280;">Your account is verified. Start exploring our premium collection!</p>
      <a href="${process.env.FRONTEND_URL || 'https://shumara-shop.vercel.app'}"
        style="display:inline-block;background:#111827;color:#fff;padding:14px 32px;
               border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
        Shop Now
      </a>
      <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">© ${new Date().getFullYear()} Shumara Store</p>
    </div>`,
  });
}

module.exports = { sendMail, verifyMailer, sendOTPEmail, sendPasswordResetEmail, sendWelcomeEmail };
