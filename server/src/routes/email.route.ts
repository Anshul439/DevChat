import express from "express";
import {resendEmail, verifyCode} from "../controllers/email.controller"
const router = express.Router()

router.post('/verifyCode', verifyCode);
router.get('/resendEmail', resendEmail);

export default router