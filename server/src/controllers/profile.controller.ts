import { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { profileSetupSchema } from "../schemas/profileSetupSchema";
import { formatZodError } from "../utils/formatZodError";

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const setupProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get user ID from authenticated request (assuming you have auth middleware)
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const validation = profileSetupSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ errors: formatZodError(validation.error) });
      return;
    }

    const { bio } = validation.data;
    let profilePicUrl = null;

    // Handle profile picture upload if file exists
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "devChat/profiles",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" }
          ],
          public_id: `profile_${userId}_${Date.now()}`
        });
        
        profilePicUrl = result.secure_url;
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        res.status(500).json({ error: "Failed to upload profile picture" });
        return;
      }
    }

    // Update user profile in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bio: bio || "Hey there! I'm using DevChat.",
        profilePic: profilePicUrl || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        profilePic: true,
        isVerified: true,
        createdAt: true,
      }
    });

    res.status(200).json({
      message: "Profile setup completed successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("Profile setup error:", error);
    res.status(500).json({ error: "An error occurred during profile setup" });
  }
};

export const skipProfileSetup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Set default bio if not already set
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bio: "Hey there! I'm using DevChat.",
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        profilePic: true,
        isVerified: true,
        createdAt: true,
      }
    });

    res.status(200).json({
      message: "Profile setup skipped successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("Skip profile setup error:", error);
    res.status(500).json({ error: "An error occurred while skipping profile setup" });
  }
};


export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        profilePic: true,
        isVerified: true,
        createdAt: true,
      }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      message: "Profile retrieved successfully",
      user,
    });

  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "An error occurred while retrieving profile" });
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { username, fullName, bio } = req.body;
    let profilePicUrl: string | undefined;

    // Handle profile picture upload if file exists
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "devChat/profiles",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" }
          ],
          public_id: `profile_${userId}_${Date.now()}`
        });
        
        profilePicUrl = result.secure_url;
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        res.status(500).json({ error: "Failed to upload profile picture" });
        return;
      }
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: {
            id: userId
          }
        }
      });

      if (existingUser) {
        res.status(400).json({ error: "Username already taken" });
        return;
      }
    }

    // Update user profile in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        fullName,
        bio,
        ...(profilePicUrl && { profilePic: profilePicUrl }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        bio: true,
        profilePic: true,
        isVerified: true,
        createdAt: true,
      }
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "An error occurred while updating profile" });
  }
};