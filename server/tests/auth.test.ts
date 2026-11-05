import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { signAccessToken } from '../src/middleware/auth.js';

vi.mock('../src/db/prisma.js', () => ({
 prisma: {
  user: { create: vi.fn(), findUnique: vi.fn() },
  authSession: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  activityLog: { create: vi.fn().mockResolvedValue({}) },
  $transaction: vi.fn(),
 }
}));

beforeEach(() => {
 vi.mocked(prisma.user.findUnique).mockReset();
 vi.mocked(prisma.user.create).mockReset();
 vi.mocked(prisma.authSession.create).mockReset();
 vi.mocked(prisma.authSession.findUnique).mockReset();
 vi.mocked(prisma.authSession.updateMany).mockReset();
 vi.mocked(prisma.activityLog.create).mockReset().mockResolvedValue({} as never);
});

afterEach(() => vi.restoreAllMocks());

describe('authentication and request validation', () => {
 it('rejects malformed credentials before database access', async () => {
  const lookup = vi.mocked(prisma.user.findUnique);
  const response = await request(app).post('/api/auth/login').send({ email: 'bad', password: 'short' });
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe('VALIDATION_ERROR');
  expect(lookup).not.toHaveBeenCalled();
 });

 it('hashes student registration credentials and ignores client supplied role', async () => {
  const create = vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u1', name: 'A Student', email: 'a@example.test', role: 'STUDENT', active: true } as never);
  vi.mocked(prisma.authSession.create).mockResolvedValue({ id: 's1' } as never);
  const response = await request(app).post('/api/auth/register').send({ name: 'A Student', email: 'A@Example.Test', password: 'correct-horse', role: 'ADMIN' });
  expect(response.status).toBe(201);
  expect(response.body.data.user.role).toBe('Student');
  const data = create.mock.calls[0]![0].data as { passwordHash: string; role: string; email: string };
  expect(data.passwordHash).not.toBe('correct-horse');
  expect(await bcrypt.compare('correct-horse', data.passwordHash)).toBe(true);
  expect(data.role).toBe('STUDENT');
  expect(data.email).toBe('a@example.test');
 });

 it('authenticates using the database role and rejects inactive accounts', async () => {
  const passwordHash = await bcrypt.hash('correct-horse', 10);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', name: 'A Student', email: 'a@example.test', passwordHash, role: 'STUDENT', active: true } as never);
  vi.mocked(prisma.authSession.create).mockResolvedValue({ id: 'session-1' } as never);
  const login = await request(app).post('/api/auth/login').send({ email: 'a@example.test', password: 'correct-horse', role: 'ADMIN' });
  expect(login.status).toBe(200);
  expect(login.body.data.user.role).toBe('Student');
  expect(login.body.data.user.passwordHash).toBeUndefined();

  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', name: 'A Student', email: 'a@example.test', passwordHash, role: 'STUDENT', active: false } as never);
  const inactive = await request(app).post('/api/auth/login').send({ email: 'a@example.test', password: 'correct-horse' });
  expect(inactive.status).toBe(401);
 });

 it('blocks a student from administrative routes after valid authentication', async () => {
  const sessionId = '11a9f600-953e-46a3-941a-622ccaf6d230';
  vi.mocked(prisma.authSession.findUnique).mockResolvedValue({ id: sessionId, userId: 'u1', expiresAt: new Date(Date.now() + 60_000), revokedAt: null, user: { id: 'u1', name: 'A Student', email: 'a@example.test', role: 'STUDENT', active: true } } as never);
  const token = signAccessToken({ id: 'u1', name: 'A Student', email: 'a@example.test', role: 'STUDENT', active: true }, sessionId);
  const response = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(403);
 });
});
