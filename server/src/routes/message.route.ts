import express from "express";
import { storeMessage, getMessages } from "../controllers/message.controller";
import authenticateToken from "../middlewares/authenticateToken";

const router = express.Router();

router.post("/", authenticateToken, storeMessage);
router.get("/", authenticateToken, getMessages);

export default router;
