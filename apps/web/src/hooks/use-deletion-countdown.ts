'use client';

import { useState, useEffect } from 'react';

interface CountdownTime {
  hours: number;
  minutes: number;
  isExpired: boolean;
}

function calculateRemaining(expiresAt: Date): CountdownTime {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, isExpired: true };
  }

  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  return { hours, minutes, isExpired: false };
}

export function useDeletionCountdown(expiresAt: Date | null) {
  const [remaining, setRemaining] = useState<CountdownTime>(() =>
    expiresAt
      ? calculateRemaining(expiresAt)
      : { hours: 0, minutes: 0, isExpired: true },
  );

  useEffect(() => {
    if (!expiresAt) {
      setRemaining({ hours: 0, minutes: 0, isExpired: true });
      return;
    }

    // Update immediately
    setRemaining(calculateRemaining(expiresAt));

    // Update every minute
    const timer = setInterval(() => {
      setRemaining(calculateRemaining(expiresAt));
    }, 60000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return remaining;
}
