import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateRemainingSeconds,
  formatTimerDisplay,
} from '../hooks/useExamTimer';

describe('Exam Timer Calculations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates remaining seconds accurately using absolute timestamps', () => {
    const now = 1700000000000;
    vi.setSystemTime(now);

    const endTime = now + 30 * 60 * 1000; // 30 minutes in the future
    const remaining = calculateRemainingSeconds(endTime, now);

    expect(remaining).toBe(1800); // 30 * 60 = 1800 seconds
  });

  it('clamps to zero and prevents negative countdown values when time has passed', () => {
    const now = 1700000000000;
    const pastTime = now - 5000; // 5 seconds in the past

    const remaining = calculateRemainingSeconds(pastTime, now);
    expect(remaining).toBe(0);
  });

  it('handles invalid or zero endTimeMs safely', () => {
    expect(calculateRemainingSeconds(0)).toBe(0);
    expect(calculateRemainingSeconds(NaN)).toBe(0);
  });

  it('formats MM:SS correctly for various values', () => {
    expect(formatTimerDisplay(0)).toBe('00:00');
    expect(formatTimerDisplay(5)).toBe('00:05');
    expect(formatTimerDisplay(65)).toBe('01:05');
    expect(formatTimerDisplay(600)).toBe('10:00');
    expect(formatTimerDisplay(1800)).toBe('30:00');
    expect(formatTimerDisplay(-10)).toBe('00:00');
  });

  it('correctly tracks passage of time across simulated ticks without drift', () => {
    const startTime = 1700000000000;
    vi.setSystemTime(startTime);
    const endTime = startTime + 60 * 1000; // 60 seconds

    expect(calculateRemainingSeconds(endTime, Date.now())).toBe(60);

    // Advance system time by 15 seconds
    vi.advanceTimersByTime(15000);
    expect(calculateRemainingSeconds(endTime, Date.now())).toBe(45);

    // Advance past end time by 50 seconds (total 65s)
    vi.advanceTimersByTime(50000);
    expect(calculateRemainingSeconds(endTime, Date.now())).toBe(0);
  });
});
