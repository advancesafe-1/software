import { useState, useEffect } from 'react';

function formatUTC(date: Date): string {
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  const s = date.getUTCSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s} UTC`;
}

export function useLiveClock(): string {
  const [utc, setUtc] = useState(() => formatUTC(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      setUtc(formatUTC(new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return utc;
}
