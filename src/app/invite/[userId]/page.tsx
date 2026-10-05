'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle, Clock, UserPlus, UserX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useFriends } from '@/context/FriendsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { friendErrorMessage } from '@/lib/friendErrors';
import BackButton from '@/components/ui/BackButton';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ProfileSummary } from '@/types';
import { buttonVariants } from '@/components/ui/Button';

/** Enlace de invitación personal (/invite/<id>): permite enviar o aceptar la amistad */
export default function InvitePage() {
    const { userId } = useParams<{ userId: string }>();
    const { user } = useAuth();
    const { friends, requests, outgoingIds, sendRequest, acceptRequest } = useFriends();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [profile, setProfile] = useState<{ id: string; data: ProfileSummary | null } | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void supabase.from('profiles').select('id, username, avatar_url, level').eq('id', userId).maybeSingle()
            .then(({ data }) => {
                if (!cancelled) setProfile({ id: userId, data: (data as ProfileSummary | null) ?? null });
            });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    const invited = profile?.id === userId ? profile.data : undefined;
    if (invited === undefined) return <LoadingScreen label={t.loading} />;

    const isSelf = user?.id === userId;
    const isFriend = friends.some(f => f.id === userId);
    const incoming = requests.find(r => r.requester.id === userId);
    const pending = outgoingIds.has(userId);

    const run = async (action: () => Promise<unknown>, success: string) => {
        setBusy(true);
        try {
            await action();
            showToast(success, 'success');
        } catch (error) {
            showToast(friendErrorMessage(error, t), 'error');
        } finally {
            setBusy(false);
        }
    };

    const statusBox = (icon: React.ReactNode, text: string) => (
        <div className="mb-6 flex flex-col items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--secondary)_30%,transparent)] bg-[var(--secondary-soft)] p-4 font-bold text-[var(--secondary)]">
            {icon}
            <p>{text}</p>
        </div>
    );

    return (
        <main className="relative flex-1 overflow-y-auto bg-[var(--background)] p-6 pb-24 pt-24 text-[var(--foreground)]">
            <BackButton href="/profile" className="absolute left-6 top-6" />
            <div className="mx-auto max-w-xl animate-fade-in">
                <h1 className="title-page mb-10">{t.invitationTitle}</h1>

                {!invited ? (
                    <EmptyState icon={UserX} title={t.userNotFound} action={<Link href="/profile" className={buttonVariants({ size: 'lg' })}>{t.backToProfile}</Link>} />
                ) : (
                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
                        <div className="mb-6 flex justify-center">
                            <Avatar src={invited.avatar_url} name={invited.username} size={96} ring />
                        </div>
                        <h2 className="title-section mb-8">{invited.username || t.unknownUser}</h2>

                        {isSelf ? (
                            <p className="mb-6 text-[var(--muted-foreground)]">{t.ownInviteLink}</p>
                        ) : isFriend ? (
                            statusBox(<CheckCircle size={32} aria-hidden />, t.alreadyFriends)
                        ) : incoming ? (
                            <>
                                <p className="mb-4 text-[var(--muted-foreground)]">{t.theyInvitedYou}</p>
                                <Button size="lg" className="mb-4 w-full" isLoading={busy} onClick={() => void run(() => acceptRequest(incoming.id), t.nowFriends)}>
                                    <UserPlus size={20} aria-hidden /> {t.acceptFriendRequest}
                                </Button>
                            </>
                        ) : pending ? (
                            statusBox(<Clock size={32} aria-hidden />, t.requestPending)
                        ) : (
                            <Button size="lg" className="mb-4 w-full" isLoading={busy} onClick={() => void run(() => sendRequest(userId), t.requestSent)}>
                                <UserPlus size={20} aria-hidden /> {t.sendFriendRequest}
                            </Button>
                        )}

                        <Link href="/profile" className="block w-full rounded-xl border-2 border-[var(--border)] px-6 py-3 font-bold transition-colors hover:border-[var(--secondary)]">
                            {t.backToProfile}
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
