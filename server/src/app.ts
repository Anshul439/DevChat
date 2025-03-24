import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import authRoutes from "./routes/auth.route.js";
import emailRoutes from "./routes/email.route.js";
import userRoutes from "./routes/user.route.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

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

  // Handle joining a private room
  socket.on("join-room", (data) => {
    const { sender, receiver } = data;
    const users = [sender, receiver].sort();
    const roomName = `room_${users[0]}_${users[1]}`;
    
    console.log(`${sender} joining room: ${roomName}`);
    socket.join(roomName);
  });

  // Handle private messages
  socket.on("message", (data) => {
    const { text, sender, receiver } = data;
    console.log(`Message from ${sender} to ${receiver}: ${text}`);
    
    const users = [sender, receiver].sort();
    const roomName = `room_${users[0]}_${users[1]}`;
    
    // Emit the message to the room, excluding the sender
    socket.broadcast.to(roomName).emit("receive-message", data);
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

app.use("/api", authRoutes);
app.use("/api", emailRoutes);
app.use("/api", userRoutes);
