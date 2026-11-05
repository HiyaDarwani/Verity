import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../shared/errors.js';
import { isZodError } from './validate.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) return res.status(400).json({ success: false, message: 'Malformed JSON request', error: { code: 'INVALID_JSON', message: 'Malformed JSON request' } });
  if (error instanceof HttpError) return res.status(error.status).json({ success: false, message: error.message, error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
  if (isZodError(error)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.issues } });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'A record with these details already exists', error: { code: 'CONFLICT', message: 'A record with these details already exists' } });
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Record not found', error: { code: 'NOT_FOUND', message: 'Record not found' } });
  }
  console.error('Unhandled request error', error);
  return res.status(500).json({ success: false, message: 'Internal server error', error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
