'use client';

import React, { useEffect } from 'react';
import { Dices } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { SPIN_DURATION_MS } from '@/lib/roulette';
import { Poster } from '@/components/ui/Poster';
import { Button } from '@/components/ui/Button';
import type { Movie } from '@/types';

interface RouletteWheelProps {
    matches: Movie[];
    /** Total de coincidencias de la ronda; si es mayor que los gajos, se explica bajo el título */
    matchCount: number | null;
    /** Grados finales del giro (null hasta que el anfitrión gira) */
    rotation: number | null;
    isHost: boolean;
    onSpin: () => void;
    /** Se llama cuando el giro ha terminado (también si se entró con el giro ya hecho) */
    onSpinEnd: (rotation: number) => void;
}

const SLICE_COLORS = ['var(--destructive)', 'var(--surface-raised)'];

export function RouletteWheel({ matches, matchCount, rotation, isHost, onSpin, onSpinEnd }: RouletteWheelProps) {
    const { t } = useLanguage();
    const count = matches.length;
    const slice = 360 / count;

    // Fin del giro por tiempo: transitionend no salta si el componente se monta con el giro ya aplicado
    useEffect(() => {
        if (rotation === null) return;
        const id = window.setTimeout(() => onSpinEnd(rotation), SPIN_DURATION_MS + 400);
        return () => window.clearTimeout(id);
    }, [rotation, onSpinEnd]);

    const gradient = matches
        .map((_, i) => `${SLICE_COLORS[i % 2]} ${(i / count) * 100}% ${((i + 1) / count) * 100}%`)
        .join(', ');

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-4">
            <div className="text-center">
                <h2 className="title-section flex items-center justify-center gap-2">
                    {t.spinTheWheel} <Dices size={26} className="text-[var(--secondary)]" aria-hidden />
                </h2>
                {matchCount !== null && matchCount > count && (
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t.wheelTopMatches(count, matchCount)}</p>
                )}
            </div>

            <div className="relative h-[320px] w-[320px] max-w-full">
                <div
                    className="absolute left-1/2 top-[-15px] z-20 h-0 w-0 -translate-x-1/2 border-x-[15px] border-t-[30px] border-x-transparent border-t-[var(--foreground)]"
                    aria-hidden
                />
                <div
                    className="relative h-full w-full overflow-hidden rounded-full border-[5px] border-[var(--foreground)] shadow-[inset_0_0_50px_rgba(0,0,0,0.6)]"
                    style={{
                        background: `conic-gradient(${gradient})`,
                        transform: `rotate(${rotation ?? 0}deg)`,
                        transition: `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.1, 0, 0.2, 1)`,
                    }}
                    onTransitionEnd={() => rotation !== null && onSpinEnd(rotation)}
                >
                    {matches.map((movie, i) => (
                        <div
                            key={movie.id}
                            className="absolute left-1/2 top-1/2 flex h-0 w-[150px] origin-[0_50%] items-center justify-end"
                            style={{ transform: `rotate(${i * slice + slice / 2 - 90}deg)` }}
                        >
                            <div className="mb-5 w-20 rotate-90 text-center">
                                <div className="relative mx-auto h-[75px] w-[50px] overflow-hidden rounded-md border-2 border-[var(--on-media)] shadow-[var(--shadow-lg)]">
                                    <Poster src={movie.image} alt="" sizes="50px" />
                                </div>
                                <div className="mt-1 truncate rounded bg-black/60 px-1 py-0.5 text-[11px] font-bold text-[var(--on-media)]">
                                    {movie.title}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isHost ? (
                <Button variant="default" size="lg" className="min-w-[200px]" disabled={rotation !== null} onClick={onSpin}>
                    {rotation !== null ? t.spinning : t.spin}
                </Button>
            ) : (
                <p className="text-[var(--muted-foreground)]" aria-live="polite">
                    {rotation !== null ? t.spinning : t.waitingHostSpin}
                </p>
            )}
        </div>
    );
}
