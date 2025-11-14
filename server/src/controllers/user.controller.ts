import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import redisClient from "../lib/redis";

const prisma = new PrismaClient();

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id;

    const TTL_SECONDS = 3000;

    const friendsKey = (userId) => `friends:${userId}`;

    const key = friendsKey(currentUserId);

    const cached = await redisClient.get(key);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(JSON.parse(cached));
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: currentUserId, status: "ACCEPTED" },
          { user2Id: currentUserId, status: "ACCEPTED" },
        ],
      },
      include: {
        user1: { select: { id: true, username: true, email: true } },
        user2: { select: { id: true, username: true, email: true } },
      },
    });

    const friends = friendships.map((friendship) => {
      return friendship.user1Id === currentUserId
        ? friendship.user2
        : friendship.user1;
    });

    await redisClient.setex(key, TTL_SECONDS, JSON.stringify(friends));

    res.setHeader("X-Cache", "MISS");
    res.status(200).json(friends);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
