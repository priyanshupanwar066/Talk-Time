// Auth Routes
import { Router } from 'express';
import { register, login, logout, getMe } from './authController';
import { authenticate } from '../../middleware/auth';
import rateLimit from 'express-rate-limit';
import { validate, registerSchema, loginSchema } from '../../middleware/validate';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
