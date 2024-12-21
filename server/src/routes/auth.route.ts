import express from "express";
import { checkUsername, signin, signup } from "../controllers/auth.controller";
import authenticateToken from "../middlewares/authenticateToken";
const router = express.Router()

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/check-username', checkUsername);
router.get('/validate-token', authenticateToken, (req, res) => {
    res.status(200).json({ message: 'Token is valid', user: req.user });
});

export default router