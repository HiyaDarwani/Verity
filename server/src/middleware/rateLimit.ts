import { rateLimit } from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.', error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication requests. Try again later.', error: { code: 'RATE_LIMITED', message: 'Too many authentication requests. Try again later.' } },
});
