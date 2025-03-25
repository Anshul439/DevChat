import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

const prisma = new PrismaClient();

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id; // Ensure your auth middleware sets this
    console.log(currentUserId, "HIIIIIIIIIIIII");
    

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId }, // Exclude the logged-in user
      },
      select: { id: true, username: true, email: true },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
