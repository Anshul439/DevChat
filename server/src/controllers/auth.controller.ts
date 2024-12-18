import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z, ZodError } from "zod";
import { emailVerify } from "../helpers/email";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Zod Schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  username: z.string().min(3, "Username must be at least 3 characters long"),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const checkUsernameSchema = z.object({
  username: z.string().nonempty("Username is required"),
});

// Utility function to format Zod errors
export const formatZodError = (error: ZodError) => {
  return error.errors.map((err) => ({
    path: err.path.join("."),
    message: err.message,
  }));
};

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = signupSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ errors: formatZodError(validation.error) });
    return;
  }

  const { email, password, username } = validation.data;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, username },
    });

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verifyCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { verifyCode, verifyCodeExpiry },
    });

    await emailVerify(email, username, verifyCode);

    res.status(201).json({ message: "User created successfully", user });
    console.log(user);
    
  } catch (error) {
    res.status(500).json({ error: "An error occurred during signup" });
    console.error(error);
  }
};

export const signin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = signinSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ errors: formatZodError(validation.error) });
    return;
  }

  const { email, password } = validation.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Sign in successful",
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred during sign in" });
    console.error(error);
  }
};

export const checkUsername = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = checkUsernameSchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({ errors: formatZodError(validation.error) });
  }

  const { username } = validation.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(200).json({
        status: "error",
        message: "Username is already taken",
        available: false,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Username is available",
      available: true,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while checking username availability",
    });
    console.error(error);
  }
};
