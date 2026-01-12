// authValidation.js
import { z } from "zod";

// -------------------- Common reusable validators --------------------
const emailValidator = z
  .string()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 256 characters" });

const passwordValidator = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[@$!%*?&]/, "Must contain special character");

const nameValidator = z
  .string()
  .min(2, { message: "Name must be at least 2 characters" })
  .max(50, { message: "Name must be less than 51 characters" });

// -------------------- Signup schema --------------------
export const signupUserSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  password: passwordValidator,
});

// -------------------- Login schema --------------------
// export const loginUserSchema = z.object({
//   email: emailValidator,
//   password: passwordValidator,
// });
export const loginUserSchema = z.object({
  email: emailValidator,
  password: z.string().min(1, { message: "Password is required" }),
});

export const validators = {
  emailValidator,
  passwordValidator,
  nameValidator,
};
// -------------------- Reset Password schema --------------------
export const resetPasswordSchema = z.object({
  email: emailValidator,
  otp: z
    .string()
    .length(6, { message: "OTP must be 6 digits" }),

  newPassword: passwordValidator
    .min(8, { message: "Password must be at least 8 characters" }),
});
