import { Router } from "express";
import authenticateToken from "../middlewares/authenticateToken";
import {
  sendFriendRequest,
  getFriendRequests,
  updateFriendRequest,
  getFriends,
  getSuggestions,
  getSentRequests,
  cancelFriendRequest
} from "../controllers/friend.controller.js";

const router = Router();

router.post("/request", authenticateToken, sendFriendRequest);
router.get("/requests", authenticateToken, getFriendRequests);
router.get("/sent", authenticateToken, getSentRequests);
router.patch("/request/:requestId", authenticateToken, updateFriendRequest);
router.delete("/request/:requestId", authenticateToken, cancelFriendRequest); 
router.get("/friends", authenticateToken, getFriends);
router.get("/suggestions", authenticateToken, getSuggestions);

export default router;