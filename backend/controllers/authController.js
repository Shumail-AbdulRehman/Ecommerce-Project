const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, OtpVerification, clean } = require("../models");
const { sendOTPEmail, sendPasswordResetEmail, sendWelcomeEmail } = require("../config/mailer");
require("dotenv").config();

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const generateToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role, name: user.name },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

function safeUser(user) {
  const data = clean(user);
  if (data) delete data.password;
  return data;
}

async function issueOtp(email, name, type) {
  const activeOtp = await OtpVerification.findOne({
    email,
    type,
    is_used: false,
    expires_at: { $gt: new Date() },
  }).sort({ created_at: -1 });

  const otp = activeOtp?.otp || generateOTP();
  const expires_at = activeOtp?.expires_at || new Date(Date.now() + 10 * 60 * 1000);
  let createdOtp = null;

  if (!activeOtp) {
    await OtpVerification.deleteMany({ email, type });
    createdOtp = await OtpVerification.create({ email, otp, type, expires_at });
  }

  const result = type === "register"
    ? await sendOTPEmail(email, name, otp)
    : await sendPasswordResetEmail(email, name, otp);

  if (!result) {
    if (createdOtp) await OtpVerification.deleteOne({ _id: createdOtp._id });
    throw new Error("Email sending failed. Configure a verified Brevo sender email.");
  }

  return otp;
}

exports.register = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.is_verified) {
        return res.status(409).json({ message: "Email already registered" });
      }
      await issueOtp(email, name || existing.name, "register");
      return res.json({ message: "OTP resent to your email", requiresOTP: true, email });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword, is_verified: false });
    await issueOtp(email, name, "register");

    res.status(201).json({ message: "OTP sent to your email", requiresOTP: true, email });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    const otpDoc = await OtpVerification.findOne({
      email,
      otp,
      type: "register",
      is_used: false,
      expires_at: { $gt: new Date() },
    }).sort({ created_at: -1 });

    if (!otpDoc) return res.status(400).json({ message: "Invalid or expired OTP" });

    otpDoc.is_used = true;
    await otpDoc.save();

    const user = await User.findOneAndUpdate(
      { email },
      { is_verified: true },
      { returnDocument: "after" }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = generateToken(user);
    sendWelcomeEmail(email, user.name).catch(console.error);

    res.json({ message: "Email verified! Welcome to Shumara", token, user: safeUser(user) });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.is_verified) return res.status(400).json({ message: "Email already verified" });

    await issueOtp(email, user.name, "register");
    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "If this email exists, a reset code has been sent", requiresOTP: true, email });
    }

    await issueOtp(email, user.name, "reset_password");
    res.json({ message: "Password reset code sent to your email", requiresOTP: true, email });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyResetOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    const otpDoc = await OtpVerification.findOne({
      email,
      otp,
      type: "reset_password",
      is_used: false,
      expires_at: { $gt: new Date() },
    }).sort({ created_at: -1 });

    if (!otpDoc) return res.status(400).json({ message: "Invalid or expired code" });
    res.json({ message: "Code verified", canReset: true, email, otp });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const otpDoc = await OtpVerification.findOne({
      email,
      otp,
      type: "reset_password",
      is_used: false,
      expires_at: { $gt: new Date() },
    }).sort({ created_at: -1 });

    if (!otpDoc) return res.status(400).json({ message: "Invalid or expired code" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { password: hashedPassword, is_verified: true });
    otpDoc.is_used = true;
    await otpDoc.save();

    res.json({ message: "Password reset successfully! Please login." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    if (!user.is_verified) {
      await issueOtp(email, user.name, "register");
      return res.status(403).json({ message: "Email not verified. OTP sent.", requiresOTP: true, email });
    }

    const token = generateToken(user);
    res.json({ message: "Login successful", token, user: safeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(clean(user));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, avatar: avatar || null },
      { returnDocument: "after" }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", user: clean(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "All fields required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user.id);
    if (!user || !user.password) return res.status(400).json({ message: "Password login is not configured for this account" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
