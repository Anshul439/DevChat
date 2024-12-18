import express from "express";
import { checkUsername, signin, signup } from "../controllers/auth.controller";
const router = express.Router()

router.post('/signup', signup);
router.get('/signin', signin);
router.get('/check-username', checkUsername);

export default router