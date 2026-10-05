'use client';

import React, { useId } from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatYear } from '@/lib/movies';
import { Poster } from '@/components/ui/Poster';
import type { Challenge } from '@/context/ChallengeContext';
import { Button } from '@/components/ui/Button';

interface ChallengeCardOverlayProps {
    challenge: Challenge;
    onResolve: (accepted: boolean) => void;
}

/** Reto de un amigo que aparece sobre el feed hasta que se acepta o se pasa */
export default function ChallengeCardOverlay({ challenge, onResolve }: ChallengeCardOverlayProps) {
    const { t } = useLanguage();
    const titleId = useId();
    const { movie } = challenge;

    return (
        <section
            aria-labelledby={titleId}
            className="absolute inset-0 z-50 overflow-hidden rounded-[20px] border-4 border-[var(--destructive)] shadow-[0_0_30px_var(--destructive),0_0_60px_var(--warning)] animate-pop-in"
        >
            <Poster src={movie.image} alt="" sizes="400px" priority />

            <div className="absolute inset-x-0 top-0 z-10 bg-[linear-gradient(to_bottom,var(--destructive),transparent)] p-5 text-center">
                <p className="flex items-center justify-center gap-1.5 text-lg font-black uppercase tracking-wide text-[var(--on-media)] [text-shadow:0_2px_4px_black]">
                    <Flame size={18} className="text-[var(--warning)]" aria-hidden />
                    {t.challengedBy(challenge.counterpartName)}
                    <Flame size={18} className="text-[var(--warning)]" aria-hidden />
                </p>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 bg-[linear-gradient(to_top,black_20%,transparent)] px-5 pb-7 pt-8 text-[var(--on-media)]">
                <div className="text-center">
                    <h2 id={titleId} className="font-display text-[1.8rem] font-extrabold leading-tight [text-shadow:0_2px_4px_black]">{movie.title}</h2>
                    <span className="text-sm opacity-85">{formatYear(movie.year)} · {t.acceptChallengeQuestion}</span>
                </div>
                <div className="flex justify-center gap-5">
                    <Button variant="outline" size="lg" onClick={() => onResolve(false)} className="flex-1">
                        {t.pass}
                    </Button>
                    <Button size="lg" onClick={() => onResolve(true)} className="flex-[2]">
                        <Flame size={20} aria-hidden /> {t.acceptChallenge}
                    </Button>
                </div>
            </div>
        </section>
    );
}
