'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Poster } from '@/components/ui/Poster';

export interface Flight {
    id: string;
    image: string;
    /** Centro y ancho del póster al despegar (coordenadas de la ventana) */
    from: { x: number; y: number; width: number };
    /** Centro del destino (el contador de la selección) */
    to: { x: number; y: number };
}

const FLIGHT_MS = 700;
/** Ancho final del póster: cabe dentro del botón del contador */
const LANDING_WIDTH = 34;

/**
 * Póster que vuela desde la tarjeta hasta el contador de la selección.
 * Se pinta en <body> con position: fixed para que ningún transform de los padres
 * desplace el origen, y la trayectoria se calcula con las posiciones reales.
 */
export function FlyingPoster({ flight, onLanded }: { flight: Flight; onLanded: (id: string) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const onLandedRef = useRef(onLanded);

    useEffect(() => {
        onLandedRef.current = onLanded;
    });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const dx = flight.to.x - flight.from.x;
        const dy = flight.to.y - flight.from.y;
        const endScale = LANDING_WIDTH / flight.from.width;
        // Arco: sube un poco a mitad de camino antes de caer en el contador
        const lift = Math.min(80, Math.abs(dy) * 0.35);
        const animation = el.animate(
            [
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: 'translate(0, -6px) scale(1.05)', opacity: 1, offset: 0.12 },
                { transform: `translate(${dx * 0.55}px, ${dy * 0.45 - lift}px) scale(${(1 + endScale) / 2})`, opacity: 1, offset: 0.55 },
                { transform: `translate(${dx}px, ${dy}px) scale(${endScale})`, opacity: 0.85 },
            ],
            { duration: FLIGHT_MS, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' },
        );
        animation.onfinish = () => onLandedRef.current(flight.id);
        return () => animation.cancel();
    }, [flight]);

    const { x, y, width } = flight.from;
    const height = width * 1.5;
    return createPortal(
        <div
            ref={ref}
            className="pointer-events-none fixed overflow-hidden rounded-xl border-2 border-[var(--secondary)] shadow-[0_10px_30px_var(--secondary-glow)]"
            style={{ left: x - width / 2, top: y - height / 2, width, height, zIndex: 'var(--z-overlay)' }}
            aria-hidden
        >
            <Poster src={flight.image} alt="" sizes="220px" />
        </div>,
        document.body,
    );
}
