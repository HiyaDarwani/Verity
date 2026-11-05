/** StatCard.tsx – data-backed metric tile used across the role dashboards. */

import type { LucideIcon } from 'lucide-react';

type CardColor = 'blue' | 'lav' | 'mint' | 'peach';

interface Props {
  value: string | number;
  label: string;
  color: CardColor;
  icon?: LucideIcon;
  detail?: string;
}

const BG: Record<CardColor, string> = {
  blue: 'stat-blue',
  lav: 'stat-lav',
  mint: 'stat-mint',
  peach: 'stat-peach',
};

export function StatCard({ value, label, color, icon: Icon, detail }: Props) {
  return (
    <article className={`stat ${BG[color]}`} aria-label={`${label}: ${value}`}>
      <div className="stat-topline"><span className="stat-icon">{Icon && <Icon size={18} strokeWidth={1.8} />}</span><span className="stat-mark" aria-hidden="true" /></div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-label">{label}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </article>
  );
}
