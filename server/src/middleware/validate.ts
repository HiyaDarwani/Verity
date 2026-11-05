import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: parsed.error.issues } });
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    Object.assign(req, { validatedQuery: parsed.data });
    next();
  };
}

export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}
