import React from 'react';
import BackButton from '@/components/ui/BackButton';
import { ModalTitlePill } from '@/components/ui/ModalTitlePill';
import { MODES, type AppMode } from '@/lib/modes';

interface GameHeaderProps {
    mode: AppMode;
    title: string;
    /** Sin onBack, vuelve a la página anterior */
    onBack?: () => void;
}

/** Cabecera común de las pantallas de juego: volver a la izquierda y el título del modo centrado */
export function GameHeader({ mode, title, onBack }: GameHeaderProps) {
    const { accent, icon } = MODES[mode];
    return (
        <header className="grid w-full shrink-0 grid-cols-[44px_1fr_44px] items-center gap-3 px-5 pb-3 pt-6 sm:pt-8">
            <BackButton onClick={onBack} />
            <ModalTitlePill as="h1" title={title} icon={icon} accent={accent} className="" />
            <span aria-hidden />
        </header>
    );
}
