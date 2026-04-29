const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const nodemailer = require("nodemailer");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const { generateToken, clearToken } = require("../services/token.service");

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "AVATARS" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
};

exports.register = asyncHandler(async (req, res) => {
  const { username, email, phone, password, aboutMe } = req.body;

  let avatar = { public_id: "", url: "" };

  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer);
    avatar = { public_id: result.public_id, url: result.secure_url };
  }

  const user = await User.create({ username, email, phone, password, aboutMe, avatar });

  const token = generateToken(user, res);

  res.status(201).json({
    success: true,
    message: "user Registered!",
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      aboutMe: user.aboutMe,
      avatar: user.avatar,
    },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email & Password Are Required!" });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid Email Or Password!" });
  }

  const token = generateToken(user, res);

  res.status(200).json({
    success: true,
    message: "LoggedIn",
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      aboutMe: user.aboutMe,
      avatar: user.avatar,
    },
  });
});

exports.logout = asyncHandler(async (req, res) => {
  clearToken(res);
  res.status(200).json({ success: true, message: "Loggout" });
});

exports.getUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      phone: req.user.phone,
      aboutMe: req.user.aboutMe,
      avatar: req.user.avatar,
    },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { username, email, phone, aboutMe } = req.body;
  const user = await User.findById(req.user._id);

  if (username) user.username = username;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (aboutMe !== undefined) user.aboutMe = aboutMe;

  if (req.file) {
    if (user.avatar.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }
    const result = await uploadToCloudinary(req.file.buffer);
    user.avatar = { public_id: result.public_id, url: result.secure_url };
  }

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Profile Updated",
    updatedUser: {
      _id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      aboutMe: user.aboutMe,
      avatar: user.avatar,
    },
  });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ success: false, message: "Please Fill All Fields:" });
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ success: false, message: "Incorrect Current Password" });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: "New Password And Confirm New Password Do Not Match",
    });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: "Password Updated!" });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ success: false, message: "User Not Found" });
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/#/password/reset/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>This link expires in 15 minutes.</p>`,
    });

    res.status(200).json({
      success: true,
      message: `Email Sent to ${user.email} Successfully!`,
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500).json({ success: false, message: err.message });
  }
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Reset Password Token Is Invalid or Has Been Expired!",
    });
  }

  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Password And ConfirmPassword Do Not Match!",
    });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const token = generateToken(user, res);

  res.status(200).json({
    success: true,
    message: "Reset Password Successfully!",
    token,
  });
});
