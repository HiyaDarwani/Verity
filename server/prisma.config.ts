import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverRoot, '..');

dotenv.config({
  path: [
    resolve(projectRoot, '.env.local'),
    resolve(projectRoot, '.env'),
    resolve(serverRoot, '.env'),
  ],
});

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Set DATABASE_URL or DATABASE_URL_UNPOOLED before running Prisma CLI commands.');
if (!process.env.DATABASE_URL_UNPOOLED && /-pooler\./i.test(new URL(databaseUrl).hostname)) {
  throw new Error('Prisma migrations require Neon DATABASE_URL_UNPOOLED; DATABASE_URL is pooled.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: databaseUrl },
});
