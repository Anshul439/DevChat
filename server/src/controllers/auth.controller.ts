import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { sendVerificationEmail } from "../utils/email";
import axios from "axios";
import {
  checkEmailSchema,
  checkUsernameSchema,
  signinSchema,
  signupSchema,
} from "../schemas/authSchema";
import { formatZodError } from "../utils/formatZodError";

const prisma = new PrismaClient();
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

const cookieOptions = {
  httpOnly: true,
  // secure: true, // uncomment in production
  sameSite: "strict" as const,
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

  const { email, fullName, username, password } = validation.data;

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
      data: { email, fullName, username, password: hashedPassword },
    });

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verifyCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.userVerification.create({
      data: {
        verifyCode,
        verifyCodeExpiry,
        user: {
          connect: { id: user.id },
        },
      },
    });

    await sendVerificationEmail(email, username, verifyCode);

    // Generate access and refresh tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userId: user.id,
      },
    });

    res
      .status(201)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
      })
      .json({
        message: "User created successfully",
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          username: user.username,
        },
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

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate access and refresh tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Remove old refresh tokens and store new one
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: user.id,
      },
    });

    res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
      })
      .json({
        message: "Sign in successful",
        accessToken,
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

    const githubAccessToken = tokenResponse.data.access_token;

    // Get user data from GitHub
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`, // Use GitHub access token
      },
    });

    const userData = userResponse.data;
    console.log(userResponse.data.name);

    // Fetch the user's email
    const emailResponse = await axios.get(
      "https://api.github.com/user/emails",
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`, // Use GitHub access token
        },
      }
    );

    const emails = emailResponse.data;
    const primaryEmail = emails.find(
      (email: { primary: boolean; verified: boolean }) =>
        email.primary && email.verified
    )?.email;

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email: primaryEmail }, { username: userData.login }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: primaryEmail,
          fullName: userData.name || userData.login, // Fallback to login if name is null
          username: userData.login,
          password: null,
          isVerified: true, // GitHub users are considered verified
        },
      });
    }

    // Now create JWT tokens using the user data
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Remove old refresh tokens and store new one
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: user.id,
      },
    });

    res
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
      })
      .json({
        success: true,
        accessToken,
        user: { 
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName
        },
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

    const { id_token } = tokenResponse.data;

    // Decode the ID token to extract user info
    const userInfo = jwt.decode(id_token) as {
      email: string;
      name: string;
      picture: string;
    };

    console.log(userInfo.name);

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
          fullName: userInfo.name,
          username: userInfo.email.split("@")[0], // Default username
          isVerified: true,
        },
      });
    }

    // Generate a JWT token for the authenticated user
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Remove old refresh tokens and store new one
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: user.id,
      },
    });

    res
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
      })
      .json({
        success: true,
        accessToken,
        user: { 
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName
        },
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

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Remove refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", { ...cookieOptions, path: "/api/auth/refresh" })
      .status(200)
      .json({ message: "Sign out successful" });
  } catch (error) {
    console.error("Error during signout:", error);
    res.status(500).json({ error: "An error occurred during signout" });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ error: "Refresh token required" });
    return;
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      id: string;
    };

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.id,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: storedToken.user.email },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.cookie("accessToken", newAccessToken, cookieOptions).json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid refresh token" });
    console.error(error);
  }
};




// Add this to your auth controller

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // If we reach here, the auth middleware has already verified the token
    const user = (req as any).user; // Assuming your auth middleware attaches user to req
    
    res.status(200).json({
      success: true,
      message: "Token is valid",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName
      }
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
    console.error(error);
  }
};
