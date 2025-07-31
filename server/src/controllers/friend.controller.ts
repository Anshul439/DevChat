import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

const prisma = new PrismaClient();

export const sendFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id;
    const { receiverId } = req.body;

    if (currentUserId === receiverId) {
      res.status(400).json({ error: "Cannot send friend request to yourself" });
      return;
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: currentUserId }
        ]
      }
    });

    if (existingFriendship) {
      res.status(400).json({ error: "Friendship request already exists" });
      return;
    }

    const friendship = await prisma.friendship.create({
      data: {
        user1Id: currentUserId,
        user2Id: receiverId,
        status: "PENDING"
      },
      include: {
        user1: { select: { id: true, username: true, email: true } },
        user2: { select: { id: true, username: true, email: true } }
      }
    });

    res.status(201).json(friendship);
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFriendRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id;

    const requests = await prisma.friendship.findMany({
      where: {
        user2Id: currentUserId,
        status: "PENDING"
      },
      include: {
        user1: { select: { id: true, username: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getSentRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id;

    const sentRequests = await prisma.friendship.findMany({
      where: {
        user1Id: currentUserId,
        status: "PENDING"
      },
      include: {
        user2: { select: { id: true, username: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json(sentRequests);
  } catch (error) {
    console.error("Error fetching sent requests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id;
    const { requestId } = req.params;
    const { action } = req.body; // "accept" or "reject"

    const friendship = await prisma.friendship.findFirst({
      where: {
        id: parseInt(requestId),
        user2Id: currentUserId,
        status: "PENDING"
      }
    });

    if (!friendship) {
      res.status(404).json({ error: "Friend request not found" });
      return;
    }

    if (action === "accept") {
      const updatedFriendship = await prisma.friendship.update({
        where: { id: parseInt(requestId) },
        data: {
          status: "ACCEPTED"
        },
        include: {
          user1: { select: { id: true, username: true, email: true } },
          user2: { select: { id: true, username: true, email: true } }
        }
      });
      res.status(200).json(updatedFriendship);
    } else {
      // For reject action, delete the request instead of marking as rejected
      await prisma.friendship.delete({
        where: { id: parseInt(requestId) }
      });
      res.status(200).json({ message: "Friend request deleted" });
    }
  } catch (error) {
    console.error("Error updating friend request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFriends = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id;

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

    // Map to get the friend (not the current user)
    const friends = friendships.map(friendship => {
      return friendship.user1Id === currentUserId 
        ? friendship.user2 
        : friendship.user1;
    });

    res.status(200).json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = (req as any).user?.id;

    // Get all users who are not friends and have no pending requests
    const existingConnections = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: currentUserId },
          { user2Id: currentUserId }
        ]
      },
      select: {
        user1Id: true,
        user2Id: true
      }
    });

    const connectedUserIds = new Set<number>();
    existingConnections.forEach(conn => {
      connectedUserIds.add(conn.user1Id);
      connectedUserIds.add(conn.user2Id);
    });
    connectedUserIds.add(currentUserId); // Exclude self

    const suggestions = await prisma.user.findMany({
      where: {
        id: {
          notIn: Array.from(connectedUserIds)
        }
      },
      select: { id: true, username: true, email: true },
      take: 20 // Limit suggestions
    });

    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};