import express from 'express';
import { getProfile, login, register } from '../controllers/authController.js';
import requireAuth from '../middleware/auth.js';


const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getProfile);

export default router;