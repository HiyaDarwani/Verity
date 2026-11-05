import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const projectRoot = resolve(serverRoot, '..');

// Neon CLI writes its branch connection strings at the project root. Keep the
// existing server .env as a local fallback; process-provided variables win.
dotenv.config({
  path: [
    resolve(projectRoot, '.env.local'),
    resolve(projectRoot, '.env'),
    resolve(serverRoot, '.env'),
  ],
});

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
});

export const env = schema.parse(process.env);
