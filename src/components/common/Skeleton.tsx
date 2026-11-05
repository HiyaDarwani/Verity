interface SkeletonProps {
  lines?: number;
  className?: string;
}

export function Skeleton({ lines = 3, className = '' }: SkeletonProps) {
  return (
    <div className={`skeleton-stack ${className}`} role="status" aria-label="Loading content">
      <span className="sr-only">Loading content…</span>
      {Array.from({ length: lines }, (_, index) => <span className="skeleton-line" key={index} />)}
    </div>
  );
}
