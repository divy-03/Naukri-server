const mongoose = require("mongoose");
const crypto = require("crypto");
const validator = require("validator");

const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"],
  },
  email: {
    type: String,
    required: [true, "Please enter an email"],
    validate: [validator.isEmail],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Please enter a password"],
    minlength: [8, "Password must be at least 8 characters"],
    select: false,
  },
  role: {
    type: String,
    enum: ["player", "admin", "captain", "owner"],
    default: "player",
  },
  avatar: {
    public_id: String,
    url: String,
  },
  position: {
    type: String,
    // enum: [
    //   "LW",
    //   "RW",
    //   "CAM",
    //   "ST",
    //   "CF",
    //   "CM",
    //   "CDM",
    //   "LM",
    //   "RM",
    //   "LB",
    //   "RB",
    //   "CB",
    //   "LWB",
    //   "RWB",
    //   "GK",
    // ],
    default: "NAN",
  },
  // tid: {
  //   type: Types.ObjectId,
  //   ref: "Team"
  // },
  // batch: 2022, 21 etc;
  rating: {
    type: Number,
    default: 1,
  },
  resetPasswordToken: {
    type: String,
    default: undefined,
  },
  resetPasswordExpire: {
    type: Date,
    default: undefined,
  },
});

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
