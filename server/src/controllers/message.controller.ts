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

    // console.log(text);
    

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

// Get messages between two users
export const getMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
  try {
    const { user1Email, user2Email } = req.query;

    if (!user1Email || !user2Email) {
      res.status(400).json({ error: 'Both user emails are required' });
      return;
    }

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

    // Get messages using user IDs
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user1.id, receiverId: user2.id },
          { senderId: user2.id, receiverId: user1.id },
        ],
      },
      orderBy: {
        createdAt: 'asc',
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

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};