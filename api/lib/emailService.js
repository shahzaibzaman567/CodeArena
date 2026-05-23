import nodemailer from "nodemailer";
import { ENV } from "./env.js";
import { normalizeEmail } from "./normalizeEmail.js";

const EMAIL_USER = ENV.EMAIL_USER || "shahzaibzaman465@gmail.com";
const EMAIL_PASS = ENV.EMAIL_PASS;

export async function isEmailValid(value) {
  const email = normalizeEmail(value);
  if (!email) return false;

  // Robust, standard RFC 5322 compliant regular expression for email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  const isValid = emailRegex.test(email);
  if (!isValid) {
    console.warn(`[email] invalid address detected: ${email}`);
  }
  return isValid;
}

if (!EMAIL_PASS) {
  console.error("Email sender is not configured. Set EMAIL_PASS in .env.");
}

let transporter;
let transporterVerified = false;

const getTransporter = async () => {
  if (!EMAIL_PASS) {
    throw new Error("EMAIL_PASS is required for email delivery.");
  }

  if (transporter && transporterVerified) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  try {
    await transporter.verify();
    transporterVerified = true;
  } catch (verifyErr) {
    console.error("Gmail transporter verification failed:", verifyErr.message || verifyErr);
    throw verifyErr;
  }

  return transporter;
};

export async function sendSessionInvitation({
  toEmail,
  hostName,
  problemName,
  sessionUrl,
  description = "",
  difficulty = "",
  maxParticipants = 1,
}) {
  const transporterInstance = await getTransporter();
  const toAddress = normalizeEmail(toEmail);
  if (!toAddress || !(await isEmailValid(toAddress))) {
    throw new Error(`Invitation email address is invalid: ${toEmail}`);
  }

  const mailOptions = {
    from: `"CodeArena" <${EMAIL_USER}>`,
    to: toAddress,
    subject: `Join ${hostName} in a live CodeArena session`,
    html: `
      <div style="background: linear-gradient(135deg, #07111f 0%, #111827 55%, #1e1b4b 100%); color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 20px;">
        <div style="max-width: 620px; margin: 0 auto; background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(99, 102, 241, 0.28); border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);">
          <div style="padding: 28px 32px; background: linear-gradient(135deg, rgba(79, 70, 229, 0.22), rgba(14, 165, 233, 0.08)); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #c4b5fd; font-family: monospace;">CODEARENA</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.4px;">Collaborative Coding Invitation</div>
          </div>

          <div style="padding: 32px;">
            <p style="margin: 0 0 10px; font-size: 14px; color: #93c5fd; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">Welcome</p>
            <h2 style="margin: 0 0 14px; font-size: 28px; line-height: 1.2; color: #ffffff;">You have been invited to a live coding session</h2>
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.75; color: #cbd5e1;">
              <strong style="color: #ffffff;">${hostName}</strong> invited you to collaborate on CodeArena. Open the invitation link below and you will land on this exact session.
            </p>

            <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(30, 27, 75, 0.92)); border: 1px solid rgba(129, 140, 248, 0.24); border-radius: 16px; padding: 22px; margin-bottom: 24px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #818cf8; font-weight: 700; letter-spacing: 0.12em; margin-bottom: 14px;">Project Details</div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">${problemName}</div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
                ${
                  difficulty
                    ? `<span style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: rgba(99, 102, 241, 0.18); color: #c4b5fd; font-size: 12px; font-weight: 700; text-transform: capitalize;">${difficulty}</span>`
                    : ""
                }
                <span style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: rgba(14, 165, 233, 0.18); color: #93c5fd; font-size: 12px; font-weight: 700;">${maxParticipants} participant slot${maxParticipants > 1 ? "s" : ""}</span>
              </div>
              <div style="font-size: 14px; line-height: 1.7; color: #cbd5e1;">
                ${description || "A live collaborative coding session is ready for you."}
              </div>
            </div>

            <div style="background: rgba(15, 118, 110, 0.12); border: 1px solid rgba(45, 212, 191, 0.2); color: #ccfbf1; border-radius: 14px; padding: 16px 18px; margin-bottom: 24px; font-size: 14px; line-height: 1.7;">
              Sign in with the invited account and CodeArena will join you to this session automatically when a participant slot is available.
            </div>

            <div style="text-align: center; margin: 28px 0 22px;">
              <a href="${sessionUrl}" style="display: inline-block; text-decoration: none; padding: 14px 30px; border-radius: 10px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 16px; font-weight: 800; box-shadow: 0 10px 24px rgba(99, 102, 241, 0.35);">
                Join This Session
              </a>
            </div>

            <div style="padding: 16px 18px; background: rgba(255, 255, 255, 0.04); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0 0 8px; font-size: 12px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Session Link</p>
              <a href="${sessionUrl}" style="color: #c4b5fd; font-size: 13px; line-height: 1.6; word-break: break-all; font-family: monospace; text-decoration: underline;">${sessionUrl}</a>
            </div>

            <div style="margin-top: 26px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); color: #64748b; font-size: 11px; line-height: 1.7;">
              This invitation was sent from <a href="${ENV.CLIENT_URL || "http://localhost:5173"}" style="color: #818cf8; text-decoration: none;">CodeArena</a>. If you were not expecting it, you can safely ignore this email.
            </div>
          </div>
        </div>
      </div>
    `,
  };

  console.log(`[email] sending invite to ${toAddress} from ${EMAIL_USER}`);

  const info = await transporterInstance.sendMail(mailOptions);
  console.log(`[email] invite sent to ${toAddress}; messageId=${info.messageId}`);

  return info;
}
