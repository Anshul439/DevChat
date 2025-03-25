import express from "express";
import { storeMessage, getMessages } from "../controllers/message.controller";
import authenticateToken from "../middlewares/authenticateToken";

const router = express.Router();

// POST /api/messages - Store a new message
router.post("/", authenticateToken, storeMessage);

// GET /api/messages - Get messages between two users
router.get("/", authenticateToken, getMessages);

export default router;
