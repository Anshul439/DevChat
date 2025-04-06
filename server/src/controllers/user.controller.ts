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
    const { search } = req.query;

    // Get IDs of friends and pending requests
    const relationships = await prisma.friend.findMany({
      where: {
        OR: [{ userId: currentUserId }, { friendId: currentUserId }],
      },
      select: {
        userId: true,
        friendId: true,
      },
    });

    const relatedUserIds = [
      currentUserId,
      ...relationships.map((r) =>
        r.userId === currentUserId ? r.friendId : r.userId
      ),
    ];

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { notIn: relatedUserIds } }, // Exclude self and related users
          search
            ? {
                OR: [
                  {
                    username: {
                      contains: search as string,
                      mode: "insensitive",
                    },
                  },
                  {
                    email: { contains: search as string, mode: "insensitive" },
                  },
                ],
              }
            : {},
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        // Add any other fields you want to return
      },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
