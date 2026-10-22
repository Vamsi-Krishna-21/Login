import { mongoose } from "../db/mongoose.js";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String },
  dob: { type: String },
  role: { type: String, default: "member" },
  pendingEmail: { type: String },
  pendingPassword: { type: String },
  emailOtp: { type: String },
  emailOtpExpires: { type: Date },
  passwordOtp: { type: String },
  passwordOtpExpires: { type: Date },
});

// Pre-save hook for password hashing
UserSchema.pre("save", async function(this: any) {
  // If password is not hashed yet, hash it
  if (this.password && !this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", UserSchema);
