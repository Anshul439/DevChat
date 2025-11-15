import { PrismaClient } from "@prisma/client";
import redisClient from "../lib/redis";
const prisma = new PrismaClient();

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = req.user.id;

    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return res
        .status(400)
        .json({ error: "Name and memberIds array are required" });
    }

    const uniqueMemberIds = Array.from(new Set([creatorId, ...memberIds]));

    const group = await prisma.group.create({
      data: {
        name,
        description,
        creatorId,
        members: {
          create: uniqueMemberIds.map((userId: number) => ({ userId })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
      },
    });

    // Invalidation
    (async () => {
      try {
        const keysToDel = uniqueMemberIds.map((id) => `groups:${id}`);
        if (keysToDel.length) {
          await redisClient.del(...keysToDel);
          console.log("Invalidated group caches:", keysToDel);
        }
      } catch (e) {
        console.warn("Failed to invalidate group caches:", e);
      }
    })();

    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
};

export const getGroups = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const cacheKey = `groups:${userId}`;
    const TTL_SECONDS = 3000;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Redis get failed (getGroups):", e);
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    (async () => {
      try {
        await redisClient.setex(cacheKey, TTL_SECONDS, JSON.stringify(groups));
      } catch (e) {
        console.warn("Redis set failed (getGroups):", e);
      }
    })();

    res.setHeader("X-Cache", "MISS");
    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { limit = '20', cursor } = req.query;

    const messageLimit = parseInt(limit);

    const shouldCache = !cursor;
    const cacheKey = `group-messages:${groupId}:initial`;
    const TTL_SECONDS = 3000;

    if (shouldCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }
      } catch (redisError) {
        console.warn('Redis get failed (getGroupMessages):', redisError);
      }
    }

    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: parseInt(groupId),
          userId: userId
        }
      },
      select: { id: true }
    });

    if (!isMember) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    const whereClause = {
      groupId: parseInt(groupId),
    };

    const messages = await prisma.groupMessage.findMany({
      where: whereClause,
      take: messageLimit,
      ...(cursor && {
        skip: 1,
        cursor: { id: parseInt(cursor) }
      }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        text: true,
        createdAt: true,
        sender: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    const hasMore = messages.length === messageLimit;

    const response = {
      messages: messages.reverse(),
      hasMore,
      nextCursor: messages.length > 0 ? messages[0].id : null
    };

    if (shouldCache) {
      redisClient.setex(cacheKey, TTL_SECONDS, JSON.stringify(response)).catch((err) => {
        console.warn('Redis set failed (getGroupMessages):', err);
      });
      res.setHeader('X-Cache', 'MISS');
    } else {
      res.setHeader('X-Cache', 'SKIP');
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ error: "Failed to fetch group messages" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;
    const senderId = req.user.id;

    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: parseInt(groupId),
          userId: senderId
        }
      },
    });

    if (!isMember) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    const message = await prisma.groupMessage.create({
      data: {
        text,
        groupId: parseInt(groupId),
        senderId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Invalidation
    (async () => {
      try {
        const cacheKey = `group-messages:${groupId}:initial`;
        await redisClient.del(cacheKey);
        console.log(`Invalidated group message cache: ${cacheKey}`);
      } catch (e) {
        console.warn('Failed to invalidate group message cache:', e);
      }
    })();

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ error: "Failed to send group message" });
  }
};