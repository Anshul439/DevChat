import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(3, "Name must be at least 3 characters long"),
  username: z.string().min(3, "Username must be at least 3 characters long"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const checkUsernameSchema = z.object({
  username: z.string().nonempty("Username is required"),
});

export const checkEmailSchema = z.object({
  email: z.string().nonempty("Email is required"),
});
