import { getUsers } from "../controllers/user.controller";
import authenticateToken from "../middlewares/authenticateToken";
import express from "express";

const router = express.Router();

router.get("/", authenticateToken, getUsers);

export default router;
