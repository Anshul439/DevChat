import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const [user1, user2] = await Promise.all([
      prisma.user.findUnique({ 
        where: { email: user1Email as string }, 
        select: { id: true } 
      }),
      prisma.user.findUnique({ 
        where: { email: user2Email as string }, 
        select: { id: true } 
      })
    ]);

    if (!user1 || !user2) {
      res.status(404).json({ error: 'One or both users not found' });
      return;
    }

    const whereClause = {
      OR: [
        { senderId: user1.id, receiverId: user2.id },
        { senderId: user2.id, receiverId: user1.id },
      ],
    };

    const messages = await prisma.message.findMany({
      where: whereClause,
      take: messageLimit,
      ...(cursor && {
        skip: 1,
        cursor: { id: parseInt(cursor as string) }
      }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        createdAt: true,
        sender: {
          select: { id: true, email: true, username: true }
        },
        receiver: {
          select: { id: true, email: true, username: true }
        }
      }
    });

    const hasMore = messages.length === messageLimit;

    res.json({
      messages: messages.reverse(),
      hasMore,
      nextCursor: messages.length > 0 ? messages[0].id : null
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};