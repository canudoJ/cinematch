'use client';

import { useEffect, useState } from 'react';
import { secondsLeft } from '@/lib/roulette';

/**
 * Segundos que faltan hasta `endsAt` (epoch ms). Se recalcula con el reloj,
 * no restando 1 cada segundo, así que no se desfasa y todos ven lo mismo.
 */
export function useCountdown(endsAt: number | null | undefined): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!endsAt) return;
        const id = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(id);
    }, [endsAt]);

    return secondsLeft(endsAt, now);
}
