import { Router } from "express";
import { setupProfile, skipProfileSetup, getProfile, updateProfile } from "../controllers/profile.controller";
import { profilePictureUpload, handleMulterError } from "../middlewares/multerConfig";
import authenticateToken from "../middlewares/authenticateToken";

const router = Router();

// Apply auth middleware to all profile routes
router.use(authenticateToken);

// Setup profile with optional picture upload
router.post(
  "/setup",
  profilePictureUpload.single("profilePicture"), // 'profilePicture' is the field name
  handleMulterError,
  setupProfile
);

// Skip profile setup
router.post("/skip", skipProfileSetup);

// Get current user profile
router.get("/", getProfile);
router.patch(
  "/",
  profilePictureUpload.single("profilePic"), // Match the field name used in frontend
  handleMulterError,
  updateProfile
);

export default router;