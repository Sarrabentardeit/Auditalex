import { Router } from 'express';
import { login, register, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { loginSchema, registerSchema } from '../validators/auth.validator';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Appliquer le rate limiter spécifique pour l'authentification
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/register', authRateLimiter, validate(registerSchema), register);

// Récupérer l'utilisateur connecté (vérifie le token et retourne les bonnes données)
router.get('/me', authenticate, getMe);

export default router;

