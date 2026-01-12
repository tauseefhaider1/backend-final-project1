// import mongoose from "mongoose";
// import bcrypt from "bcrypt";

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },

//     password: {
//       type: String,
//       required: true,
//       minlength: 6,
//       select: false, // 👈 hides password by default
//     },

//     role: {
//       type: String,
//       enum: ["user", "admin"],
//       default: "user",
//     },

//     isVerified: {
//       type: Boolean,
//       default: false,
//     },

//     // OTP fields
//     otpHash: {
//       type: String,
//     },

//     otpExpires: {
//       type: Date,
//     },otpAttempts: {
//   type: Number,
//   default: 0,
// },
//   },
//   { timestamps: true }
// );

// // 🔐 Hash password before save
// userSchema.pre("save", async function() {
//   if (!this.isModified("password")) return ;
//   this.password = await bcrypt.hash(this.password, 10);
//   ;
// });

// const User = mongoose.model("User", userSchema);
// export default User;

import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpHash: String,
    otpExpires: Date,
    otpAttempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    // Add password history
    passwordHistory: [{
      password: String,
      changedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    lastPasswordChange: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    accountLockedUntil: Date,
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for isAccountLocked
userSchema.virtual('isAccountLocked').get(function() {
  return this.accountLockedUntil && this.accountLockedUntil > new Date();
});

// Hash password before save
userSchema.pre("save", async function() {
  if (!this.isModified("password")) return ;
  
  try {
    // Store old password in history (keep last 3)
    if (this.password) {
      if (!this.passwordHistory) {
        this.passwordHistory = [];
      }
      
      this.passwordHistory.unshift({
        password: this.password,
        changedAt: new Date()
      });
      
      // Keep only last 3 passwords
      if (this.passwordHistory.length > 3) {
        this.passwordHistory = this.passwordHistory.slice(0, 3);
      }
      
      this.lastPasswordChange = new Date();
    }
    
    this.password = await bcrypt.hash(this.password, 12);
  } catch (error) {
  }
});

// Method to check if password was used before
userSchema.methods.wasPasswordUsed = async function(password) {
  for (const entry of this.passwordHistory) {
    const isMatch = await bcrypt.compare(password, entry.password);
    if (isMatch) return true;
  }
  return false;
};

const User = mongoose.model("User", userSchema);
export default User;