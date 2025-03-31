import express from "express";
import {
  createGroup,
  getGroups,
  getGroupMessages,
  sendGroupMessage,
} from "../controllers/group.controller.js";
import authenticateToken from "../middlewares/authenticateToken.js";

const router = express.Router();

router.post("/", authenticateToken, createGroup);
router.get("/", authenticateToken, getGroups);
router.get("/:groupId/messages", authenticateToken, getGroupMessages);
router.post("/:groupId/messages", authenticateToken, sendGroupMessage);

export default router;
