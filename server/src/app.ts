// server.js - Updated with socket initialization for friend controller
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import authRoutes from "./routes/auth.route.js";
import emailRoutes from "./routes/email.route.js";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import friendRoutes from "./routes/friend.route.js";
import profileRoutes from "./routes/profile.route.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
const port = process.env.PORT;

const corsOptions = {
  origin: "http://localhost:3000", // Replace with your Next.js frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Allowed HTTP methods
  credentials: true, // Allow cookies if needed
};

app.use(cors(corsOptions));

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});


server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  // Store user email with socket ID for friend request targeting
  socket.on("user-online", (userEmail) => {
    socket.userEmail = userEmail;
    socket.join(`user_${userEmail}`);
    console.log(`User ${userEmail} is online with socket ${socket.id}`);
  });

  socket.on("join-room", (data) => {
    const { sender, receiver } = data;
    const users = [sender, receiver].sort();
    const roomName = `room_${users[0]}_${users[1]}`;
    console.log(`${sender} joining room: ${roomName}`);
    socket.join(roomName);
  });

  socket.on("message", async (data) => {
    try {
      let messageId = data.id;
      let createdAt = data.createdAt;

      if (data.store || !data.id) {
        const message = await prisma.message.create({
          data: {
            text: data.text,
            sender: data.sender,
            receiver: data.receiver,
          },
        });
        messageId = message.id;
        createdAt = message.createdAt;
      }

      const users = [data.sender, data.receiver].sort();
      const roomName = `room_${users[0]}_${users[1]}`;
      
      socket.broadcast.to(roomName).emit("receive-message", {
        ...data,
        id: messageId,
        createdAt: createdAt,
      });
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  // Friend request events
  socket.on("friend-request-sent", (data) => {
    socket.broadcast.to(`user_${data.receiverEmail}`).emit("friend-request-received", data);
  });

  socket.on("friend-request-accepted", (data) => {
    socket.broadcast.to(`user_${data.senderEmail}`).emit("friend-request-was-accepted", data);
  });

  socket.on("friend-request-rejected", (data) => {
    socket.broadcast.to(`user_${data.senderEmail}`).emit("friend-request-was-rejected", data);
  });

  socket.on("friend-request-cancelled", (data) => {
    socket.broadcast.to(`user_${data.receiverEmail}`).emit("friend-request-was-cancelled", data);
  });

  socket.on("join-group-room", (groupId) => {
    console.log(`User joining group room: group_${groupId}`);
    socket.join(`group_${groupId}`);
  });

  socket.on("group-created", (groupData) => {
    socket.broadcast.emit("new-group-added", groupData);
  });

  socket.on("group-message", async (data) => {
    try {
      if (!data.sender && data.senderEmail) {
        const sender = await prisma.user.findUnique({
          where: { email: data.senderEmail },
          select: { id: true, email: true, username: true },
        });
        data.sender = sender;
      }

      if (data.senderEmail) {
        socket.broadcast
          .to(`group_${data.groupId}`)
          .emit("receive-group-message", {
            ...data,
            createdAt: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error("Error handling group message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/user", userRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/group", groupRoutes);
app.use("/api/friend", friendRoutes);
app.use("/api/profile", profileRoutes);