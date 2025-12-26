import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },

    // Google OAuth fields
    googleId: { type: String, unique: true, sparse: true },
    profilePicture: { type: String },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },

    stores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store"
      }
    ]
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  // Skip hashing if no password (Google OAuth users)
  if (!this.password) {
    return;
  }

  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return;
  }

  // Generate salt and hash password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to strip password from JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);

