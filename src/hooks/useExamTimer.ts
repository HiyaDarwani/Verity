/**
 * useExamTimer.ts
 * Absolute timestamp-based countdown timer that recalculates remaining time against Date.now().
 * Features:
 * - Resilient to interval throttling and background tabs via visibilitychange listener
 * - Zero drift across tab switching or heavy re-renders
 * - Non-negative guarantee (clamped to 0)
 * - Expiry callback fired at most once
 * - Clean interval and listener cleanup
 */

import { useState, useEffect, useRef } from 'react';

export interface TimerResult {
  /** Remaining seconds (≥ 0) */
  remaining: number;
  /** True when the timer has reached zero */
  expired: boolean;
  /** Formatted MM:SS string */
  display: string;
}

/** Pure helper to calculate remaining non-negative seconds from an end timestamp */
export function calculateRemainingSeconds(endTimeMs: number, nowMs: number = Date.now()): number {
  if (!endTimeMs || isNaN(endTimeMs)) return 0;
  const diffMs = endTimeMs - nowMs;
  return Math.max(0, Math.ceil(diffMs / 1000));
}

/** Pure helper to format seconds as MM:SS */
export function formatTimerDisplay(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safeSec / 60)).padStart(2, '0');
  const ss = String(safeSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function useExamTimer(
  endTimeMs: number | null,
  onExpire?: () => void,
): TimerResult {
  const hasDeadline = endTimeMs !== null && Number.isFinite(endTimeMs) && endTimeMs > 0;
  const [remaining, setRemaining] = useState(() => hasDeadline ? calculateRemainingSeconds(endTimeMs) : 0);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (endTimeMs === null || !Number.isFinite(endTimeMs) || endTimeMs <= 0) {
      // No active attempt yet. Do not consume the one-shot expiry callback.
      firedRef.current = false;
      return;
    }

    firedRef.current = false;
    // If already expired at mount or change, fire once and finish
    const initial = calculateRemainingSeconds(endTimeMs);
    // oxlint-disable-next-line react-hooks/set-state-in-effect -- sync the displayed countdown to the server deadline.
    setRemaining(initial);
    if (initial <= 0 && !firedRef.current) {
      firedRef.current = true;
      onExpireRef.current?.();
      return;
    }

    const checkAndTick = () => {
      const r = calculateRemainingSeconds(endTimeMs);
      setRemaining(r);
      if (r <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };

    const intervalId = setInterval(checkAndTick, 1000);

    // Listen to visibilitychange to immediately catch up when tab is focused
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndTick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [endTimeMs]);

  return {
    remaining,
    expired: hasDeadline && remaining <= 0,
    display: formatTimerDisplay(remaining),
  };
}
