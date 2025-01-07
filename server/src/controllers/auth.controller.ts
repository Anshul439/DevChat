import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z, ZodError } from "zod";
import { emailVerify } from "../helpers/email";
import axios from "axios";

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

const checkEmailSchema = z.object({
  email: z.string().nonempty("Email is required"),
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

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log(token);

    const options = {
      httpOnly: true,
      // secure: true
    };

    res
      .status(201)
      .cookie("authToken", token, options)
      .json({
        message: "User created successfully",
        token,
        user: { id: user.id, username: user.username, email: user.email },
      });
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
    console.log(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    const options = {
      httpOnly: true,
      // secure: true
    };

    res
      .status(200)
      .cookie("authToken", token, options)
      .json({
        message: "Sign in successful",
        token,
        user: { id: user.id, username: user.username, email: user.email },
      });
  } catch (error) {
    res.status(500).json({ error: "An error occurred during sign in" });
    console.error(error);
  }
};

export const githubOauth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { code } = req.body;

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Get user data from GitHub
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = userResponse.data;

    // Fetch the user's email
    const emailResponse = await axios.get(
      "https://api.github.com/user/emails",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const emails = emailResponse.data;
    const primaryEmail = emails.find(
      (email: { primary: boolean; verified: boolean }) =>
        email.primary && email.verified
    )?.email;

    // Create JWT token
    const token = jwt.sign(
      {
        id: userData.id,
        login: userData.login,
        email: primaryEmail || null, // Use the fetched primary email, or null if not available
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: primaryEmail }, { username: userData.login }],
      },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: primaryEmail,
          password: null,
          username: userData.login,
          verifyCode: null,
          verifyCodeExpiry: null,
        },
      });

      await prisma.user.update({
        where: { email: primaryEmail },
        data: { isVerified: true },
      });
    }

    res.cookie("authToken", token, { httpOnly: true }).json({
      success: true,
      token,
      user: { ...userData, email: primaryEmail }, // Include the email in the response
    });
  } catch (error) {
    console.error("GitHub OAuth Error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

export const googleOauth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const code = req.body.code as string;
  console.log(req.body.code);

  if (!code) {
    return res.status(400).json({ error: "Authorization code not provided!" });
  }

  try {
    // Exchange authorization code for access token and ID token
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      },
      { headers: { "Content-Type": "application/json" } }
    );
    console.log(tokenResponse);

    const { id_token } = tokenResponse.data;

    // Decode the ID token to extract user info
    const userInfo = jwt.decode(id_token) as {
      email: string;
      name: string;
      picture: string;
    };

    if (!userInfo || !userInfo.email) {
      return res
        .status(400)
        .json({ error: "Invalid user information from Google." });
    }

    // Check if user exists in the database
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    // If user does not exist, create a new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          username: userInfo.email.split("@")[0], // Default username
          isVerified: true,
        },
      });
    }

    // Generate a JWT token for the authenticated user
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1h",
      }
    );

    res.cookie("authToken", token, { httpOnly: true }).json({
      success: true,
      token,
      user: { email: userInfo.email, username: userInfo.email.split("@")[0] }, // Include the email in the response
    });
  } catch (error) {
    console.error("Error during Google OAuth:", error);
    res.status(500).json({ error: "Internal Server Error" });
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

export const checkEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = checkEmailSchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({ errors: formatZodError(validation.error) });
  }

  const { email } = validation.data;

  try {
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(200).json({
        status: "error",
        message: "Email is already taken",
        available: false,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Email is available",
      available: true,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while checking email availability",
    });
    console.error(error);
  }
};
