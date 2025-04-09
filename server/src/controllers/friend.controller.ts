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
    if (!friendId) {
      return res.status(400).json({ error: "friendId is required" });
    }
    console.log(friendId);

    const userId = req.user.id;
    console.log(userId);

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

    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }

    const friendship = await prisma.friend.create({
      data: {
        userId,
        friendId,
        status: "pending",
      },
    });

    res.status(201).json({ ...friendship, senderUsername: sender.username });
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
    // const { status } = req.body; // "accepted" or "rejected"
    const userId = req.user.id;
    console.log(userId);

    const friendship = await prisma.friend.findUnique({
      where: {
        userId_friendId: {
          userId: parseInt(id), // sender
          friendId: userId, // receiver (current user)
        },
      },
    });

    // console.log(friend.friendId, userId);

    // if (!friend || friend.friendId !== userId) {
    //   return res.status(404).json({ error: "Friend request not found" });
    // }

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    if (friendship.status !== "pending") {
      return res.status(400).json({ error: "Request already processed" });
    }

    const updatedFriendship = await prisma.friend.update({
      where: {
        userId_friendId: {
          userId: parseInt(id), // sender
          friendId: userId, // receiver (current user)
        },
      },
      data: {
        status: "accepted",
      },
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

export const rejectFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(id);

    const userId = req.user.id;
    console.log(userId);

    // Find the friendship to verify ownership
    const friendship = await prisma.friend.findUnique({
      where: {
        userId_friendId: {
          userId: parseInt(id),
          friendId: userId,
        },
      },
    });
    console.log(friendship);

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Delete the friendship record
    const rejectRequest = await prisma.friend.delete({
      where: {
        userId_friendId: {
          userId: parseInt(id),
          friendId: userId,
        },
      },
    });

    return res.status(200).json(rejectRequest); // No content response
  } catch (error) {
    console.error("Error declining friend request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
