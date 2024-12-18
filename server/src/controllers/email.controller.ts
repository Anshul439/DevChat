import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { emailVerify } from "../helpers/email";

const prisma = new PrismaClient();

export const verifyCode = async (req: Request, res: Response): Promise<void> => {
  
  const { email, otpValue } = req.body;
  console.log(req.body);
  

  if (!email || !otpValue) {
    res.status(400).json({ error: "Email and code are required." });
    return;
  }

  try {
    // Retrieve the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // Check if the code matches and hasn't expired
    if (user.verifyCode !== otpValue) {
      res.status(400).json({ error: "Invalid verification code." });
      return;
    }

    if (user.verifyCodeExpiry && new Date(user.verifyCodeExpiry) < new Date()) {
      res.status(400).json({ error: "Verification code has expired." });
      return;
    }

    // Update the user's status to verified
    await prisma.user.update({
      where: { email },
      data: { verifyCode: null, verifyCodeExpiry: null, isVerified: true },
    });

    res.status(200).json({ message: "Verification successful. Your email is now verified." });
  } catch (error) {
    console.error("Error verifying code:", error);
    res.status(500).json({ error: "An error occurred while verifying the code." });
  }
};




export const resendEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  try {
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });


    if (!user) {
      res.status(404).json({ error: "User not found. Please sign up first." });
      return;
    }

    if(user.isVerified) {
      res.status(404).json({error: "User is already verified"})
      return
    }

    // Generate new OTP and expiry
    const newVerifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newVerifyCodeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Update the user's OTP and expiry
    await prisma.user.update({
      where: { email },
      data: { verifyCode: newVerifyCode, verifyCodeExpiry: newVerifyCodeExpiry },
    });

    // Send the new verification email
    await emailVerify(email, user.username, newVerifyCode);

    res.status(200).json({ message: "Verification email resent successfully." });
  } catch (error) {
    console.error("Error resending verification email:", error);
    res.status(500).json({ error: "An error occurred while resending the email. Please try again." });
  }
};
