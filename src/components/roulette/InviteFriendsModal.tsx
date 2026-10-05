'use client';

import React, { useId, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { useFriends } from '@/context/FriendsContext';
import { useRouletteInvite } from '@/context/RouletteInviteContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { ModalShell } from '@/components/ui/ModalShell';
import CloseButton from '@/components/ui/CloseButton';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

const MAX_INVITES = 5;

export default function InviteFriendsModal({ onClose }: { onClose: () => void }) {
    const { friends, loading } = useFriends();
    const { sendInvites } = useRouletteInvite();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const titleId = useId();
    const [selected, setSelected] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    const toggle = (id: string) =>
        setSelected(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            return prev.length >= MAX_INVITES ? prev : [...prev, id];
        });

    const handleSend = async () => {
        setSending(true);
        const ok = await sendInvites(selected);
        setSending(false);
        showToast(ok ? t.invitationsSent : t.genericError, ok ? 'success' : 'error');
        if (ok) onClose();
    };

    return (
        <ModalShell onClose={onClose} labelledBy={titleId} layer="modal-nested" panelClassName="modal-surface w-full max-w-md">
            <div className="mb-1 flex items-center justify-between">
                <h2 id={titleId} className="title-section">{t.inviteFriendsTitle}</h2>
                <CloseButton onClose={onClose} />
            </div>
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">{t.inviteFriendsHint}</p>

            <div className="custom-scrollbar -mx-1 flex-1 overflow-y-auto px-1">
                {loading && friends.length === 0 ? (
                    <Spinner label={t.loadingFriends} className="py-8" />
                ) : friends.length === 0 ? (
                    <EmptyState icon={Users} title={t.noFriendsToInvite} />
                ) : (
                    <ul className="flex flex-col gap-2">
                        {friends.map(friend => {
                            const isSelected = selected.includes(friend.id);
                            return (
                                <li key={friend.id}>
                                    <button
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => toggle(friend.id)}
                                        disabled={!isSelected && selected.length >= MAX_INVITES}
                                        className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-50 ${isSelected ? 'border-[var(--secondary)] bg-[var(--secondary-soft)]' : 'border-[var(--border-strong)] bg-[var(--surface-raised)]'}`}
                                    >
                                        <Avatar src={friend.avatar_url} name={friend.username} size={40} />
                                        <span className="flex-1 truncate font-semibold">{friend.username}</span>
                                        <span
                                            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${isSelected ? 'border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)]' : 'border-[var(--muted-foreground)]'}`}
                                            aria-hidden
                                        >
                                            {isSelected && <Check size={14} />}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <Button className="mt-5 w-full" size="lg" disabled={selected.length === 0} isLoading={sending} onClick={handleSend}>
                {t.sendInvitations(selected.length)}
            </Button>
        </ModalShell>
    );
}
