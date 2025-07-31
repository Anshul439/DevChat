import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

const prisma = new PrismaClient();

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id;

    // Only get users who are friends (accepted friendships)
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: currentUserId, status: "ACCEPTED" },
          { user2Id: currentUserId, status: "ACCEPTED" }
        ]
      },
      include: {
        user1: { select: { id: true, username: true, email: true } },
        user2: { select: { id: true, username: true, email: true } }
      }
    });

    // Map to get only the friends (not the current user)
    const friends = friendships.map(friendship => {
      return friendship.user1Id === currentUserId 
        ? friendship.user2 
        : friendship.user1;
    });

    res.status(200).json(friends);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};