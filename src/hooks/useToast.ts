import { useState, useCallback } from 'react';

export function useToast() {
  const [message, setMessage] = useState('');

  const toast = useCallback((msg: string, durationMs = 2200) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), durationMs);
  }, []);

  return { message, toast };
}
