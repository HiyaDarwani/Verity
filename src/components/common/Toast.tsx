/** Toast.tsx – transient notification at the bottom of the screen */

interface Props {
  message: string;
}

export function Toast({ message }: Props) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
