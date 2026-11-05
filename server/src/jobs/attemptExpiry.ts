import { AttemptStatus } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';
import { finalizeAttempt } from '../modules/attempts/service.js';

let timer: NodeJS.Timeout | undefined;
let running = false;

export async function expireDueAttempts(batchSize = 100): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    const due = await prisma.attempt.findMany({ where: { status: AttemptStatus.IN_PROGRESS, deadlineAt: { lte: new Date() } }, select: { id: true }, take: batchSize, orderBy: { deadlineAt: 'asc' } });
    let finalized = 0;
    for (const attempt of due) {
      try {
        await finalizeAttempt(attempt.id, null);
        finalized += 1;
      } catch (error) {
        console.error('Expired attempt finalization failed', attempt.id, error instanceof Error ? error.name : 'UnknownError');
      }
    }
    return finalized;
  } finally {
    running = false;
  }
}

export function startAttemptExpiryWorker(intervalMs = 15_000): () => void {
  if (timer) return stopAttemptExpiryWorker;
  const runSweep = () => {
    void expireDueAttempts().catch((error: unknown) => {
      console.error('Attempt expiry sweep unavailable', error instanceof Error ? error.name : 'UnknownError');
    });
  };
  runSweep();
  timer = setInterval(runSweep, intervalMs);
  timer.unref();
  return stopAttemptExpiryWorker;
}

export function stopAttemptExpiryWorker(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
