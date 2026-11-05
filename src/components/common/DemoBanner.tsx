/** DemoBanner.tsx – backend readiness status notice */

interface Props {
  compact?: boolean;
}

export function DemoBanner({ compact }: Props) {
  return (
    <div
      className="demo-banner"
      role="status"
      aria-label="Frontend status notice"
    >
      {compact
        ? 'Frontend decoupled · Awaiting backend integration'
        : 'Verity Frontend: Decoupled and API-ready. Awaiting backend service integration.'}
    </div>
  );
}
