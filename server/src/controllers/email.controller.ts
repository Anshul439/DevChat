import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendVerificationEmail } from "../utils/email";

const prisma = new PrismaClient();

export const verifyCode = async (req: Request, res: Response): Promise<void> => {
  
  const { email, otpValue } = req.body;
  

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

    const userVerification = await prisma.userVerification.findFirst({
      where: { userId: user.id },
    });

    if (!userVerification) {
      res.status(404).json({ error: "Verification record not found." });
      return;
    }

    if (userVerification.verifyCode !== otpValue) {
      res.status(400).json({ error: "Invalid verification code." });
      return;
    }

    if (userVerification.verifyCodeExpiry && new Date(userVerification.verifyCodeExpiry) < new Date()) {
      res.status(400).json({ error: "Verification code has expired." });
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    // Delete the verification record after successful verification
    await prisma.userVerification.delete({
      where: { userId: user.id },
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
    await sendVerificationEmail(email, user.username, newVerifyCode);

    res.status(200).json({ message: "Verification email resent successfully." });
  } catch (error) {
    console.error("Error resending verification email:", error);
    res.status(500).json({ error: "An error occurred while resending the email. Please try again." });
  }
};
