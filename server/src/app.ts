import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import authRoutes from "./routes/auth.route.js";
import emailRoutes from "./routes/email.route.js";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
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
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
  credentials: true, // Allow cookies if needed
};

app.use(cors(corsOptions));

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET, POST"],
    credentials: true,
  },
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Server-side changes (in your server.js file)

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("join-room", (data) => {
    const { sender, receiver } = data;
    // console.log(data);

    const users = [sender, receiver].sort();
    const roomName = `room_${users[0]}_${users[1]}`;

    console.log(`${sender} joining room: ${roomName}`);
    socket.join(roomName);
  });

  socket.on("message", async (data) => {
    const users = [data.sender, data.receiver].sort();
    const roomName = `room_${users[0]}_${users[1]}`;
    socket.broadcast.to(roomName).emit("receive-message", data);
  });

  socket.on("join-group-room", (groupId) => {
    console.log(`User joining group room: group_${groupId}`);
    socket.join(`group_${groupId}`);
  });

  socket.on("group-created", (groupData) => {
    // Broadcast to all connected clients except the sender
    socket.broadcast.emit("new-group-added", groupData);
  });

  // In your server code (backend)
  socket.on("group-message", async (data) => {
  // console.log(data);yy
  
    try {
      // Fetch complete sender info if not provided
      if (!data.sender && data.senderEmail) {
        const sender = await prisma.user.findUnique({
          where: { email: data.senderEmail },
          select: { id: true, email: true, username: true },
        });
        data.sender = sender;
      }

      // Ensure we have sender data before broadcasting
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

// Start server
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/user", userRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/group", groupRoutes);
