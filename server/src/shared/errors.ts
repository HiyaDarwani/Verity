import { z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}

export function requireUuid(value: string | string[] | undefined, label = 'identifier'): string {
  const parsed = z.uuid().safeParse(Array.isArray(value) ? value[0] : value);
  if (!parsed.success) throw new HttpError(400, 'INVALID_ID', `Invalid ${label}`);
  return parsed.data;
}
