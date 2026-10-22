import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendOtpEmail, sendResetPasswordEmail } from "../utils/email.js";
import { getJwtSecret } from "../config/env.js";

function validatePasswordStrength(password: string): { isValid: boolean; message: string } {
  if (!password) {
    return { isValid: false, message: "Password is required." };
  }
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one special character." };
  }
  return { isValid: true, message: "" };
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, username, email, password, avatar, dob } = req.body;

    if (!name || !username || !email || !password) {
      res.status(400).json({ message: "Please fill in all required fields." });
      return;
    }

    const passwordVal = validatePasswordStrength(password);
    if (!passwordVal.isValid) {
      res.status(400).json({ message: passwordVal.message });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User with this email already exists." });
      return;
    }

    const existingUsername = await User.findOne({
      username: { $regex: `^${username}$`, $options: "i" }
    });
    if (existingUsername) {
      res.status(400).json({ message: "User with this username already exists." });
      return;
    }

    const user = await User.create({
      name,
      username,
      email,
      password,
      avatar: avatar || name.charAt(0).toUpperCase(),
      dob: dob || "",
      role: "member",
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        dob: user.dob || "",
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Registration failed." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, identifier, password } = req.body;
    const searchKey = identifier || email;

    if (!searchKey || !password) {
      res.status(400).json({ message: "Please provide email or username and password." });
      return;
    }

    const user = await User.findOne({
      $or: [
        { email: { $regex: `^${searchKey}$`, $options: "i" } },
        { username: { $regex: `^${searchKey}$`, $options: "i" } }
      ]
    });

    if (!user) {
      res.status(400).json({ message: "Invalid email/username or password." });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid email/username or password." });
      return;
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        dob: user.dob || "",
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Login failed." });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      username: user.username || "",
      email: user.email,
      avatar: user.avatar,
      dob: user.dob || "",
      role: user.role,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch user data." });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }

    const { name, username, avatar, dob } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (name) user.name = name;

    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      const existingUsername = await User.findOne({
        username: { $regex: `^${username}$`, $options: "i" }
      });
      if (existingUsername) {
        res.status(400).json({ message: "Username is already taken." });
        return;
      }
      user.username = username;
    } else if (username && username !== user.username) {
      user.username = username;
    }

    if (avatar) user.avatar = avatar;
    if (dob !== undefined) user.dob = dob;

    await user.save();

    res.status(200).json({
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      dob: user.dob || "",
      role: user.role,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update profile." });
  }
}

export async function requestEmailChange(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Please provide a new email address." });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (email === user.email) {
      res.status(400).json({ message: "New email must be different from current email." });
      return;
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      res.status(400).json({ message: "Email is already in use by another account." });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.pendingEmail = email;
    user.emailOtp = otp;
    user.emailOtpExpires = expires;
    await user.save();

    // Send email with the OTP code
    const emailSent = await sendOtpEmail(email, otp, "email-change");
    if (!emailSent) {
      res.status(502).json({
        message: "Failed to send verification email. Please check your email configuration or try again later.",
      });
      return;
    }

    res.status(200).json({
      message: "Verification code sent to your new email address.",
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to request email change." });
  }
}

export async function verifyEmailChange(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }

    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ message: "Please provide the 6-digit verification code." });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (!user.pendingEmail) {
      res.status(400).json({ message: "No email change request found." });
      return;
    }

    if (user.emailOtp !== otp) {
      res.status(400).json({ message: "Invalid verification code." });
      return;
    }

    if (!user.emailOtpExpires || new Date() > user.emailOtpExpires) {
      res.status(400).json({ message: "Verification code has expired." });
      return;
    }

    // Email is valid, update it!
    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Email updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to verify email change." });
  }
}

export async function requestPasswordChange(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }

    const { password } = req.body;
    if (!password) {
      res.status(400).json({ message: "Please provide a new password." });
      return;
    }

    const passwordVal = validatePasswordStrength(password);
    if (!passwordVal.isValid) {
      res.status(400).json({ message: passwordVal.message });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Check if new password is the same as old password
    const isSamePassword = await user.comparePassword(password);
    if (isSamePassword) {
      res.status(400).json({ message: "New password cannot be the same as your old password." });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.pendingPassword = password;
    user.passwordOtp = otp;
    user.passwordOtpExpires = expires;
    await user.save();

    // Send email with the OTP code
    const emailSent = await sendOtpEmail(user.email, otp, "password-change");
    if (!emailSent) {
      res.status(502).json({
        message: "Failed to send verification email. Please check your email configuration or try again later.",
      });
      return;
    }

    res.status(200).json({
      message: "Verification code sent to your email address.",
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to request password change." });
  }
}

export async function verifyPasswordChange(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }

    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ message: "Please provide the 6-digit verification code." });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (!user.pendingPassword) {
      res.status(400).json({ message: "No password change request found." });
      return;
    }

    if (user.passwordOtp !== otp) {
      res.status(400).json({ message: "Invalid verification code." });
      return;
    }

    if (!user.passwordOtpExpires || new Date() > user.passwordOtpExpires) {
      res.status(400).json({ message: "Verification code has expired." });
      return;
    }

    // Password is valid, update it (hashing handled by mongoose pre-save hook)
    user.password = user.pendingPassword;
    user.pendingPassword = undefined;
    user.passwordOtp = undefined;
    user.passwordOtpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to verify password change." });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Please provide an email address." });
      return;
    }

    const user = await User.findOne({
      email: { $regex: `^${email}$`, $options: "i" }
    });
    // Always return a success response to prevent email enumeration,
    // but generate the token and log it for the user if they exist
    if (!user) {
      res.status(200).json({
        message: "If that account exists, we have sent a reset link to it.",
      });
      return;
    }

    const resetToken = jwt.sign(
      { id: user._id, type: "reset" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );

    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl.replace(/\/$/, "")}/reset-password/${resetToken}`;

    // Send the password reset email
    const emailSent = await sendResetPasswordEmail(user.email, resetLink);
    if (!emailSent) {
      res.status(502).json({
        message: "Failed to deliver password reset email. Please verify mail settings or try again later.",
      });
      return;
    }

    res.status(200).json({
      message: "If that account exists, we have sent a reset link to it.",
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to process forgot password request." });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      res.status(400).json({ message: "Token and password are required." });
      return;
    }

    const passwordVal = validatePasswordStrength(password);
    if (!passwordVal.isValid) {
      res.status(400).json({ message: passwordVal.message });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; type: string };
    if (!decoded || decoded.type !== "reset") {
      res.status(400).json({ message: "Invalid or expired token." });
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Check if new password is the same as old password
    const isSamePassword = await user.comparePassword(password);
    if (isSamePassword) {
      res.status(400).json({ message: "New password cannot be the same as your old password." });
      return;
    }

    user.password = password;
    await user.save();

    res.status(200).json({ message: "Password reset successfully!" });
  } catch (error: any) {
    res.status(400).json({ message: "Invalid or expired token." });
  }
}

export async function getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized." });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username || "",
        email: user.email,
        avatar: user.avatar,
        dob: user.dob || "",
        role: user.role,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch dashboard data." });
  }
}
