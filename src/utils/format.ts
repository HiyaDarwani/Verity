/**
 * Format helpers matching original demo formatting
 */

export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatTimer(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safeSec / 60)).padStart(2, '0');
  const ss = String(safeSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
