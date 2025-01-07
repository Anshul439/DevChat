import express from "express";
import {
  checkEmail,
  checkUsername,
  githubOauth,
  googleOauth,
  signin,
  signup,
} from "../controllers/auth.controller";
import authenticateToken from "../middlewares/authenticateToken";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);


// Step 2: Handle GitHub OAuth callback
router.post("/auth/github", githubOauth);
router.post("/auth/google", googleOauth);

router.get("/check-username", checkUsername);
router.get("/check-email", checkEmail);

router.get("/validate-token", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Token is valid", user: req.user });
});

export default router;
