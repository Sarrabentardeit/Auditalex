import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

// Rate limiter général (plus permissif en développement)
export const rateLimiter = rateLimit({
  windowMs,
  max: process.env.NODE_ENV === 'production' ? maxRequests : 1000, // Beaucoup plus permissif en dev
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Rate limiter spécifique pour l'authentification (plus strict mais raisonnable)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 tentatives en prod, 50 en dev
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compter que les échecs
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', { ip: req.ip, email: req.body?.email });
    res.status(429).json({
      error: 'Too many login attempts. Please wait 15 minutes before trying again.',
      retryAfter: 900, // 15 minutes en secondes
    });
  },
});
