const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    username:{
        type:String,
        required: true,
        trim:true,
        lowercase:true,
        unique:true,
        minlength:[3,'User must be at least 3 characters long']
    },
    email: {
        type:String,
        required: true,
        trim:true,
        lowercase:true,
        unique:true,
        minlength:[13,'Email must be at least 13 characters long']
    },
    phone:{
        type: String,
        required: true
    },
    password: {
        type:String,
        required: true,
        trim:true,
        minlength:[5,'Password must be at least 5 characters long'],
        select: false
    },
    aboutMe: {
        type:String,
        required:[true,"About Me Field  Required!"]
    },
    avatar: {
        public_id: {
            type:String,
            required:true,
        },
        url: {
            type: String,
            required: true
        }
    },
    resetPasswordToken:String,
    resetPasswordExpire: Date, }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model("user", userSchema );
module.exports = User;
