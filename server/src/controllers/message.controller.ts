import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Store a new message
export const storeMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text, senderEmail, receiverEmail } = req.body;

    if (!text || !senderEmail || !receiverEmail) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Find sender and receiver by email
    const sender = await prisma.user.findUnique({
      where: { email: senderEmail }
    });

    const receiver = await prisma.user.findUnique({
      where: { email: receiverEmail }
    });

    if (!sender || !receiver) {
      res.status(404).json({ error: 'Sender or receiver not found' });
      return;
    }

    // Create message using user IDs
    const message = await prisma.message.create({ 
      data: {
        text,
        senderId: sender.id,
        receiverId: receiver.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
          }
        },
        receiver: {
          select: {
            id: true,
            email: true,
            username: true,
          }
        }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error storing message:', error);
    res.status(500).json({ error: 'Failed to store message' });
  }
};

// Get messages between two users with pagination
export const getMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
  try {
    const { user1Email, user2Email, limit = '20', cursor } = req.query;

    if (!user1Email || !user2Email) {
      res.status(400).json({ error: 'Both user emails are required' });
      return;
    }

    const messageLimit = parseInt(limit as string);

    // Find users by email
    const user1 = await prisma.user.findUnique({
      where: { email: user1Email as string }
    });

    const user2 = await prisma.user.findUnique({
      where: { email: user2Email as string }
    });

    if (!user1 || !user2) {
      res.status(404).json({ error: 'One or both users not found' });
      return;
    }

    // Build the query
    const whereClause = {
      OR: [
        { senderId: user1.id, receiverId: user2.id },
        { senderId: user2.id, receiverId: user1.id },
      ],
    };

    // Get messages using user IDs with pagination
    const messages = await prisma.message.findMany({
      where: whereClause,
      take: messageLimit,
      ...(cursor && {
        skip: 1, // Skip the cursor itself
        cursor: {
          id: parseInt(cursor as string)
        }
      }),
      orderBy: {
        createdAt: 'desc', // Get newest first, then reverse in client
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
          }
        },
        receiver: {
          select: {
            id: true,
            email: true,
            username: true,
          }
        }
      }
    });

    // Get total count for hasMore calculation
    const totalCount = await prisma.message.count({
      where: whereClause
    });

    const hasMore = cursor 
      ? messages.length === messageLimit
      : totalCount > messageLimit;

    res.json({
      messages: messages.reverse(), // Reverse to get oldest to newest for display
      hasMore,
      nextCursor: messages.length > 0 ? messages[0].id : null
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};