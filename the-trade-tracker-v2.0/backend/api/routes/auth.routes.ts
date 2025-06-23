import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register as any);
router.post('/login', authController.login as any);

// Protected routes
router.get('/profile', authenticate as any, authController.getProfile as any);

export default router;
