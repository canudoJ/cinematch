'use client';

import React, { useEffect, useId, useState } from 'react';
import { Check, Copy, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useFriends } from '@/context/FriendsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { friendErrorMessage } from '@/lib/friendErrors';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UserRow } from '@/components/ui/UserRow';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ProfileSummary } from '@/types';

type Tab = 'friends' | 'search' | 'invite';

const MIN_QUERY = 2;
const SEARCH_DELAY_MS = 400;

export function FriendsPanel() {
    const { user } = useAuth();
    const { friends, requests, outgoingIds, loading, searchUsers, sendRequest, acceptRequest, rejectRequest, removeFriend } = useFriends();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const confirm = useConfirm();
    const searchId = useId();

    const [tab, setTab] = useState<Tab>('friends');
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DELAY_MS);
    const [search, setSearch] = useState<{ query: string; results: ProfileSummary[] } | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    // Búsqueda: solo se aplica el resultado de la consulta más reciente
    useEffect(() => {
        if (debouncedQuery.length < MIN_QUERY) return;
        let cancelled = false;
        searchUsers(debouncedQuery)
            .then(results => { if (!cancelled) setSearch({ query: debouncedQuery, results }); })
            .catch(() => { if (!cancelled) setSearch({ query: debouncedQuery, results: [] }); });
        return () => {
            cancelled = true;
        };
    }, [debouncedQuery, searchUsers]);

    const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
        setBusy(key);
        try {
            await action();
            if (success) showToast(success, 'success');
        } catch (error) {
            showToast(friendErrorMessage(error, t), 'error');
        } finally {
            setBusy(null);
        }
    };

    const handleRemove = async (friendshipId: string, name: string) => {
        if (!(await confirm({ title: t.confirmRemoveFriend(name), destructive: true, confirmLabel: t.remove }))) return;
        await run(`remove-${friendshipId}`, () => removeFriend(friendshipId), t.friendRemoved);
    };

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/invite/${user?.id ?? ''}`);
            showToast(t.inviteLinkCopied, 'success');
        } catch {
            showToast(t.copyFailed, 'error');
        }
    };

    const searching = debouncedQuery.length >= MIN_QUERY && search?.query !== debouncedQuery;
    const results = search?.query === debouncedQuery ? search.results : [];
    const iconButton = 'flex h-9 w-9 items-center justify-center rounded-lg transition-opacity disabled:opacity-50';

    return (
        <section className="mb-12" aria-label={t.friends}>
            <Tabs<Tab>
                label={t.friendsTabsLabel}
                className="mb-6"
                value={tab}
                onChange={setTab}
                items={[
                    { id: 'friends', label: requests.length ? `${t.friends} · ${requests.length}` : t.friends },
                    { id: 'search', label: t.search },
                    { id: 'invite', label: t.invite },
                ]}
            />

            <div role="tabpanel" className="min-h-[150px] rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] px-5 py-6 animate-fade-in">
                {tab === 'friends' && (
                    loading && friends.length === 0 && requests.length === 0 ? (
                        <Spinner label={t.loadingFriends} className="py-6" />
                    ) : friends.length === 0 && requests.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title={t.friendsListEmpty}
                            hint={t.inviteFriendsOrShare}
                            action={<Button variant="outline" onClick={() => setTab('invite')}>{t.copyInviteLink}</Button>}
                        />
                    ) : (
                        <div className="flex flex-col gap-6">
                            {requests.length > 0 && (
                                <div>
                                    <h3 className="eyebrow mb-3">{t.requestsHeading(requests.length)}</h3>
                                    <ul className="flex flex-col gap-3">
                                        {requests.map(r => {
                                            const name = r.requester.username || t.unknownUser;
                                            return (
                                                <li key={r.id}>
                                                    <UserRow
                                                        name={name}
                                                        avatarUrl={r.requester.avatar_url}
                                                        actions={
                                                            <>
                                                                <button type="button" aria-label={t.acceptRequestOf(name)} disabled={busy !== null}
                                                                    onClick={() => void run(`accept-${r.id}`, () => acceptRequest(r.id), t.nowFriends)}
                                                                    className={`${iconButton} bg-[var(--secondary)] text-[var(--secondary-foreground)]`}>
                                                                    <Check size={18} aria-hidden />
                                                                </button>
                                                                <button type="button" aria-label={t.rejectRequestOf(name)} disabled={busy !== null}
                                                                    onClick={() => void run(`reject-${r.id}`, () => rejectRequest(r.id), t.requestDeclined)}
                                                                    className={`${iconButton} border border-[color-mix(in_srgb,var(--destructive)_30%,transparent)] bg-[var(--destructive-soft)] text-[var(--destructive)]`}>
                                                                    <X size={18} aria-hidden />
                                                                </button>
                                                            </>
                                                        }
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                            {friends.length > 0 && (
                                <div>
                                    <h3 className="eyebrow mb-3">{t.friendsHeading(friends.length)}</h3>
                                    <ul className="flex flex-col gap-3">
                                        {friends.map(friend => {
                                            const name = friend.username || t.unknownUser;
                                            return (
                                                <li key={friend.friendshipId}>
                                                    <UserRow
                                                        name={name}
                                                        avatarUrl={friend.avatar_url}
                                                        actions={
                                                            <button type="button" aria-label={t.removeFriendOf(name)} disabled={busy !== null}
                                                                onClick={() => void handleRemove(friend.friendshipId, name)}
                                                                className={`${iconButton} border border-[color-mix(in_srgb,var(--destructive)_30%,transparent)] bg-[var(--destructive-soft)] text-[var(--destructive)]`}>
                                                                <UserMinus size={18} aria-hidden />
                                                            </button>
                                                        }
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )
                )}

                {tab === 'search' && (
                    <>
                        <label htmlFor={searchId} className="sr-only">{t.searchUsersLabel}</label>
                        <Input id={searchId} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t.searchUsersLabel} className="mb-4" />
                        {query.trim().length < MIN_QUERY ? (
                            <EmptyState icon={Search} title={t.typeAtLeast} />
                        ) : searching ? (
                            <Spinner label={t.searchingUsers} className="py-6" />
                        ) : results.length === 0 ? (
                            <EmptyState icon={Search} title={t.noUsersFound} />
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {results.map(person => {
                                    const pending = outgoingIds.has(person.id);
                                    return (
                                        <li key={person.id}>
                                            <UserRow
                                                name={person.username || t.unknownUser}
                                                avatarUrl={person.avatar_url}
                                                actions={
                                                    <Button
                                                        size="sm"
                                                        variant={pending ? 'outline' : 'default'}
                                                        disabled={pending}
                                                        isLoading={busy === `send-${person.id}`}
                                                        onClick={() => void run(`send-${person.id}`, () => sendRequest(person.id), t.requestSent)}
                                                    >
                                                        {pending ? t.pendingRequest : <><UserPlus size={16} aria-hidden /> {t.add}</>}
                                                    </Button>
                                                }
                                            />
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}

                {tab === 'invite' && (
                    <div className="flex flex-col items-center gap-3 text-center">
                        <p className="eyebrow">{t.inviteLinkLabel}</p>
                        <p className="max-w-xs text-sm text-[var(--muted-foreground)]">{t.inviteLinkHint}</p>
                        <Button variant="outline" onClick={() => void copyInvite()}>
                            <Copy size={16} aria-hidden /> {t.copyInviteLink}
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}
