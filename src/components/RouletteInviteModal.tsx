'use client';

import React, { useId, useState } from 'react';
import { Dices } from 'lucide-react';
import { useRouletteInvite } from '@/context/RouletteInviteContext';
import { useLanguage } from '@/context/LanguageContext';
import { ModalShell } from '@/components/ui/ModalShell';
import { Button } from '@/components/ui/Button';

/** Aviso global cuando un amigo te invita a su sala de ruleta */
export default function RouletteInviteModal() {
    const { currentInvite, acceptInvite, declineInvite } = useRouletteInvite();
    const { t } = useLanguage();
    const titleId = useId();
    const [busy, setBusy] = useState(false);

    if (!currentInvite) return null;

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        try {
            await action();
        } finally {
            setBusy(false);
        }
    };

    return (
        <ModalShell onClose={() => void run(declineInvite)} labelledBy={titleId} layer="dialog" panelClassName="modal-surface w-full max-w-sm text-center">
            <Dices size={40} className="mx-auto mb-3 text-[var(--destructive)]" aria-hidden />
            <h2 id={titleId} className="title-section mb-2">{t.rouletteInviteTitle}</h2>
            <p className="mb-6 text-[var(--muted-foreground)]">{t.rouletteInviteBody(currentInvite.senderName)}</p>
            <div className="flex gap-3">
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => void run(declineInvite)}>
                    {t.decline}
                </Button>
                <Button className="flex-1" isLoading={busy} onClick={() => void run(acceptInvite)}>
                    {t.accept}
                </Button>
            </div>
        </ModalShell>
    );
}
