import express from "express";
import {
  checkEmail,
  checkUsername,
  githubOauth,
  googleOauth,
  logout,
  refreshToken,
  signin,
  signup,
  verifyToken,
} from "../controllers/auth.controller";
import authenticateToken from "../middlewares/authenticateToken";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/logout", logout);

router.post("/refresh", refreshToken);

router.post("/github", githubOauth);
router.post("/google", googleOauth);

router.get("/check-username", checkUsername);
router.get("/check-email", checkEmail);

router.get("/validate-token", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Token is valid", user: req.user });
});

router.get('/verify', authenticateToken, verifyToken);

export default router;
