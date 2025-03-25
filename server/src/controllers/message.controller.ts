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
    const { text, sender, receiver } = req.body;

    if (!text || !sender || !receiver) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = await prisma.message.create({
      data: {
        text,
        sender,
        receiver,
      },
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
    const { user1, user2 } = req.query;

    if (!user1 || !user2) {
      return res.status(400).json({ error: 'Both user emails are required' });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { sender: user1 as string, receiver: user2 as string },
          { sender: user2 as string, receiver: user1 as string },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};