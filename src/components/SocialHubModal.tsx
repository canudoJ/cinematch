'use client';

import React, { useId } from 'react';
import Link from 'next/link';
import { MODES } from '@/lib/modes';
import { useLanguage } from '@/context/LanguageContext';
import { ModalShell } from '@/components/ui/ModalShell';
import BackButton from './ui/BackButton';

export default function SocialHubModal({ onClose }: { onClose: () => void }) {
    const { t } = useLanguage();
    const titleId = useId();

    const modes = [
        { id: 'affinity', title: t.iceBreakerTitle, desc: t.iceBreakerDesc, Icon: MODES.iceBreaker.icon, path: '/affinity-test', color: MODES.iceBreaker.accent },
        { id: 'roulette', title: t.rouletteModeTitle, desc: t.rouletteModeDesc, Icon: MODES.roulette.icon, path: '/roulette-lobby', color: MODES.roulette.accent },
        { id: 'challenge', title: t.challengeFriendTitle, desc: t.challengeFriendDesc, Icon: MODES.challenge.icon, path: '/challenge-mode', color: MODES.challenge.accent },
    ];

    return (
        <ModalShell
            onClose={onClose}
            labelledBy={titleId}
            panelClassName="custom-scrollbar relative h-full w-full overflow-y-auto px-5"
        >
            {/* Contenido centrado en la pantalla: título con volver a su altura y los modos debajo */}
            <div className="mx-auto flex min-h-full w-full max-w-[920px] flex-col justify-center py-10">
                <div className="mb-10 grid grid-cols-[44px_1fr_44px] items-center gap-3">
                    <BackButton onClick={onClose} />
                    <h2 id={titleId} className="title-page text-center [text-shadow:0_0_18px_var(--secondary-glow)] animate-fade-in">
                        {t.socialHubTitle}
                    </h2>
                    <span aria-hidden />
                </div>
                <ul className="grid w-full grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
                    {modes.map((mode, index) => (
                        <li key={mode.id} className="animate-pop-in" style={{ animationDelay: `${index * 100}ms` }}>
                            <Link
                                href={mode.path}
                                className="flex h-full flex-col items-center rounded-3xl border-2 bg-[var(--background)] p-8 text-center transition-[transform,background-color] hover:-translate-y-2.5 hover:bg-[var(--card)]"
                                style={{ borderColor: mode.color, boxShadow: `0 0 24px color-mix(in srgb, ${mode.color} 18%, transparent)` }}
                            >
                                <mode.Icon size={48} className="mb-5" style={{ color: mode.color }} aria-hidden />
                                <h3 className="title-section mb-2.5">{mode.title}</h3>
                                <p className="leading-normal text-[var(--muted-foreground)]">{mode.desc}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </ModalShell>
    );
}
