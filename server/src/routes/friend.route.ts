import express from "express";
import {
  acceptFriendRequest,
  getFriendRequest,
  getFriendsList,
  rejectFriendRequest,
  sendFriendRequest,
} from "../controllers/friend.controller";
import authenticateToken from "../middlewares/authenticateToken";
const router = express.Router();

router.post("/", authenticateToken, sendFriendRequest);
router.get("/", authenticateToken, getFriendRequest);
router.post("/:id/accept-request", authenticateToken, acceptFriendRequest);
router.get("/friends-list", authenticateToken, getFriendsList);
router.delete('/:id', authenticateToken, rejectFriendRequest);

export default router;
