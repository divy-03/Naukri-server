const User = require("../models/userModel");
const catchAsync = require("../middlewares/catchAsync");
const bcrypt = require("bcryptjs");
const { check, validationResult } = require("express-validator");
const sendToken = require("../utils/sendToken");
const resError = require("../tools/resError");
const resSuccess = require("../tools/resSuccess");
const cloudinary = require("cloudinary");

exports.registerUser = catchAsync(async (req, res) => {
  const { name, email, password, avatar } = req.body;

  // Check avatar size (e.g., max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (avatar && avatar.length > maxSize) {
    return resError(400, "Avatar file size exceeds 5MB limit", res);
  }

  const salt = await bcrypt.genSalt(10);
  const secPass = await bcrypt.hash(password, salt);

  // Cloudinary upload
  const avt = await cloudinary.v2.uploader.upload(avatar, {
    folder: "avatars",
    width: 300,
    crop: "scale",
  });

  const user = await User.create({
    name,
    email,
    password: secPass,
    avatar: {
      public_id: avt.public_id,
      url: avt.secure_url,
    },
  });

  return sendToken(201, user, res);
});

exports.loginUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  await check("email", "Please enter a valid email").isEmail().run(req);
  await check("password", "Please enter a password").notEmpty().run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return resError(400, errors.array(), res);
  }
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return resError(403, "Invalid email or password", res);
  }
  const savedPassword = user.password;
  const passwordCompare = await bcrypt.compare(password, savedPassword);

  if (!passwordCompare) {
    return resError(401, "Password not matched", res);
  }

  return sendToken(200, user, res);
});

exports.logoutUser = catchAsync(async (req, res) => {
  res.cookie("kToken", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });

  resSuccess(200, "Logged out", res);
});

exports.getUserProfile = catchAsync(async (req, res) => {
  const user = await User.findOne({ _id: req.user._id });
  if (!user) return resError(404, "User not found", res);

  return res.status(200).json({
    success: true,
    user,
  });
});

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return resError(404, "User not found", res);
  const resetToken = await user.generateResetToken();
  await user.save({ validateModifiedOnly: true });
  const resetUrl = `${process.env.CLIENT_BASE_URL}/reset/${resetToken}`;
  const message = `Your password reset link is => \n\n ${resetUrl} \n\nIf you have not requested to reset password then please ignore this mail`;

  try {
    await sendEmail({
      email: user.email,
      subject: "KickBid Password Recovery",
      message: message,
      html: `<div style="background-image: linear-gradient(to right bottom, #ae95ffab 40%, rgb(210, 103, 117, 0.4)); margin:0;">
        <h1 style="color: #333; margin-left: 10px;">Password Reset Link</h1>
        <p style="font-size: 16px; margin-left:20px;">Click this link below to reset your password of VitXchange Website</p>
        <a href="${resetUrl}" style="text-decoration: none; background: black; color: white; border-radius: 8px; padding: 10px; text-align: center; width: 80px; margin-left: 50px; transition: background 0.3s;" onmouseover="this.style.background='rgb(45 45 45)'"
        onmouseout="this.style.background='black'">Click Here!</a>
        <p style="font-size: 16px; margin-left:20px;">If you didn't requested to reset password then please ignore this mail</p>
  </div>`,
    });

    resSuccess(200, `Email sent to ${user.email}`, res);
  } catch (error) {
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;

    await user.save({ validateBeforeSave: false });

    return resError(500, "Error Occured while sending Mail", res);
  }
});

exports.resetPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return resError(400, "Reset password link is invalid or expired", res);
  }
  if (req.body.password !== req.body.confirmPassword) {
    return resError(400, "Password doesn't match", res);
  }

  const salt = await bcrypt.genSalt(10);
  const secPass = await bcrypt.hash(req.body.password, salt);

  user.password = secPass;

  user.resetPasswordExpire = undefined;
  user.resetPasswordToken = undefined;

  await user.save();
  sendToken(200, user.id, res);
});

exports.updatePassword = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");

  const passswordCompare = await bcrypt.compare(
    req.body.oldPassword,
    user?.password
  );

  if (!passswordCompare) {
    return resError(401, "Password not matched", res);
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return resError(401, "New password not matched", res);
  }

  const salt = await bcrypt.genSalt(10);
  const secPass = await bcrypt.hash(req.body.newPassword, salt);

  if (user) {
    user.password = secPass;
  }

  await user?.save();

  if (user) return resSuccess(200, "Password Changed Successfully", res);
});

exports.updateProfile = catchAsync(async (req, res) => {
  const userId = req.user?._id;
  const user = await User.findById(userId);

  if (!user) {
    return resError(404, "User not found", res);
  }

  let avt = null;
  if (req.body.avatar && req.body.avatar !== "noImg") {
    try {
      const maxSize = 5 * 1024 * 1024;
      if (req.body.avatar && req.body.avatar.length > maxSize) {
        return resError(400, "Avatar file size exceeds 5MB limit", res);
      }

      if (user.avatar && user.avatar.public_id) {
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }

      avt = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 300,
        crop: "scale",
      });
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return resError(500, "Error uploading avatar image", res);
    }
  }

  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    position: req.body.position,
  };

  if (avt) {
    newUserData.avatar = {
      public_id: avt.public_id,
      url: avt.url,
    };
  }

  await User.findByIdAndUpdate(userId, newUserData, {
    new: true,
    runValidators: true,
  });

  resSuccess(200, "Profile updated successfully", res);
});

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find({});

  return res.status(200).json({
    success: true,
    usersCount: users.length,
    users,
  });
});

exports.getSingleUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return resError(404, "User not found", res);
  }
  return res.status(200).json({
    success: true,
    user,
  });
});

exports.editUser = catchAsync(async (req, res) => {
  const newUserData = {
    role: req.body.role,
    rating: req.body.rating,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  if (!user) {
    return resError(404, "User not found", res);
  }

  return res.status(200).json({
    success: true,
    user,
  });
});

exports.deleteUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return resError(404, "User not found", res);
  }

  if (user.role === "owner") {
    return resError(400, "You can't delete Owner", res);
  }

  // Remove user's avatar from Cloudinary
  if (user.avatar && user.avatar.public_id) {
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);
  }

  await User.deleteOne({ _id: req.params.id });

  return resSuccess(200, "User deleted successfully", res);
});
