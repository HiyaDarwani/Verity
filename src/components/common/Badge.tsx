/** Badge.tsx – coloured status pill */

const COLOR_MAP: Record<string, string> = {
  Active: 'bdg-green',
  Available: 'bdg-green',
  Graded: 'bdg-green',
  Reviewed: 'bdg-green',
  Scheduled: 'bdg-blue',
  Upcoming: 'bdg-blue',
  Draft: 'bdg-grey',
  Completed: 'bdg-grey',
  'In Progress': 'bdg-amber',
  Open: 'bdg-amber',
  'Pending review': 'bdg-amber',
  Active_user: 'bdg-green',
  Inactive: 'bdg-red',
};

interface Props {
  label: string;
  /** Override automatic colour mapping */
  colorKey?: string;
}

export function Badge({ label, colorKey }: Props) {
  const cls = COLOR_MAP[colorKey ?? label] ?? 'bdg-grey';
  return <span className={`bdg ${cls}`}>{label}</span>;
}
