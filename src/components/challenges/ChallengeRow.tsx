'use client';

import React from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useWatchOptions } from '@/hooks/useWatchOptions';
import { googleWatchUrl } from '@/lib/providers';
import { Poster } from '@/components/ui/Poster';
import type { Challenge } from '@/context/ChallengeContext';
import { Button, buttonVariants } from '@/components/ui/Button';

interface ChallengeRowProps {
    challenge: Challenge;
    direction: 'received' | 'sent';
    onOpenDetails: () => void;
    /** Solo para retos recibidos pendientes */
    onResolve?: (accepted: boolean) => void;
}

const STATUS_STYLE = {
    pending: { icon: Clock, color: 'var(--muted-foreground)' },
    accepted: { icon: CheckCircle, color: 'var(--secondary)' },
    declined: { icon: XCircle, color: 'var(--destructive)' },
    expired: { icon: XCircle, color: 'var(--muted-foreground)' },
} as const;

/** Fila de un reto recibido o enviado: estado en texto e icono (no solo por color) */
export function ChallengeRow({ challenge, direction, onOpenDetails, onResolve }: ChallengeRowProps) {
    const { t, language } = useLanguage();
    const { movie, status } = challenge;
    const { icon: StatusIcon, color } = STATUS_STYLE[status];
    const pendingReceived = direction === 'received' && status === 'pending';
    const { options } = useWatchOptions(direction === 'received' && status === 'accepted' ? movie : null);

    return (
        <article
            className={`flex w-full items-center gap-3 overflow-hidden rounded-xl border bg-[var(--card)] p-3 ${pendingReceived ? 'border-[var(--secondary)]' : 'border-[var(--surface-border)]'}`}
        >
            <button type="button" onClick={onOpenDetails} aria-label={`${t.details}: ${movie.title}`} className="relative h-16 w-12 shrink-0 overflow-hidden rounded sm:h-20 sm:w-14">
                <Poster src={movie.image} alt="" sizes="56px" />
            </button>

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                <h3 className="truncate text-sm font-bold leading-tight sm:text-base">{movie.title}</h3>
                <p className="text-caption truncate">
                    {direction === 'received' ? t.challengeFrom(challenge.counterpartName) : t.challengeTo(challenge.counterpartName)}
                    {' · '}
                    <time dateTime={new Date(challenge.createdAt).toISOString()}>
                        {new Date(challenge.createdAt).toLocaleDateString(language)}
                    </time>
                </p>
                <div className="flex flex-wrap gap-2">
                    {pendingReceived && onResolve ? (
                        <>
                            <Button size="sm" onClick={() => onResolve(true)}>{t.accept}</Button>
                            <Button variant="outline" size="sm" onClick={() => onResolve(false)}>{t.pass}</Button>
                        </>
                    ) : direction === 'received' && status === 'accepted' ? (
                        <a
                            href={options?.best?.link ?? googleWatchUrl(movie.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ size: 'sm' })}
                        >
                            {t.watchNow}
                        </a>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={onOpenDetails}>{t.details}</Button>
                </div>
            </div>

            <span className="flex shrink-0 flex-col items-center gap-0.5 text-xs font-semibold" style={{ color }}>
                <StatusIcon size={20} aria-hidden />
                {t[`challengeStatus_${status}`]}
            </span>
        </article>
    );
}
