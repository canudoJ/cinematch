'use client';

import React, { useId, useState } from 'react';
import { Dices } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface RouletteLandingProps {
    onSetup: () => void;
    onJoin: (code: string) => Promise<boolean>;
}

const CODE_LENGTH = 6;

/** Portada de la ruleta: crear una sala o unirse a la de un amigo con su código */
export function RouletteLanding({ onSetup, onJoin }: RouletteLandingProps) {
    const { t } = useLanguage();
    const inputId = useId();
    const [code, setCode] = useState('');
    const [joining, setJoining] = useState(false);

    const handleJoin = async (event: React.FormEvent) => {
        event.preventDefault();
        if (code.length !== CODE_LENGTH) return;
        setJoining(true);
        await onJoin(code);
        setJoining(false);
    };

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center animate-fade-in">
            <Dices size={64} className="animate-bounce text-[var(--secondary)]" aria-hidden />
            <p className="max-w-xs text-[var(--muted-foreground)]">{t.rouletteIntro}</p>
            <p className="max-w-xs text-sm text-[var(--muted-foreground)]">{t.rouletteNeedsTwo}</p>
            <Button size="lg" onClick={onSetup} className="w-full max-w-[300px]">
                {t.setupGame}
            </Button>

            <form onSubmit={handleJoin} className="mt-4 flex w-full max-w-[300px] flex-col gap-2 text-left">
                <label htmlFor={inputId} className="eyebrow">
                    {t.joinWithCode}
                </label>
                <div className="flex gap-2">
                    <Input
                        id={inputId}
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH))}
                        placeholder={t.roomCodePlaceholder}
                        autoComplete="off"
                        autoCapitalize="characters"
                        className="font-mono tracking-[0.25em] placeholder:font-sans placeholder:tracking-normal"
                    />
                    <Button type="submit" variant="outline" disabled={code.length !== CODE_LENGTH} isLoading={joining}>
                        {t.join}
                    </Button>
                </div>
            </form>
        </div>
    );
}
