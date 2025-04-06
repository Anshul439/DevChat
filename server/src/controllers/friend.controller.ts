import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Send friend request
export const sendFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { friendId } = req.body;
    console.log(friendId);
    
    const userId = req.user.id;
    console.log();
    

    if (userId === friendId) {
      return res.status(400).json({ error: "Cannot friend yourself" });
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existingFriendship) {
      return res.status(400).json({
        error:
          existingFriendship.status === "pending"
            ? "Friend request already sent"
            : existingFriendship.status === "accepted"
            ? "Already friends"
            : "Friend request previously rejected",
      });
    }

    const friend = await prisma.friend.create({
      data: {
        userId,
        friendId,
        status: "pending",
      },
    });

    res.status(201).json(friend);
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get friend requests (received)
export const getFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user.id;

    const requests = await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: "pending",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Respond to friend request
export const acceptFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "accepted" or "rejected"
    const userId = req.user.id;
    console.log(userId);
    

    const friend = await prisma.friend.findUnique({
      where: { id: parseInt(id) },
    });
    console.log(friend);
    console.log(friend.friendId, userId);
    
    

    // if (!friend || friend.friendId !== userId) {
    //   return res.status(404).json({ error: "Friend request not found" });
    // }
    if (!friend) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    if (friend.status !== "pending") {
      return res.status(400).json({ error: "Request already processed" });
    }

    const updatedFriendship = await prisma.friend.update({
      where: { id: parseInt(id) },
      data: { status: "accepted" },
    });

    res.status(200).json(updatedFriendship);
  } catch (error) {
    console.error("Error responding to friend request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get friends list
export const getFriendsList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user.id;

    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: "accepted" },
          { friendId: userId, status: "accepted" },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
    console.log(friends);
    

    // Format to get friend objects
    const formattedFriends = friends.map((f) =>
      f.userId === userId ? f.friend : f.user
    );

    res.status(200).json(formattedFriends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
