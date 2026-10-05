'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import { Check, Circle, Search, Swords, Users } from 'lucide-react';
import { useChallenge } from '@/context/ChallengeContext';
import { useFriends } from '@/context/FriendsContext';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { searchContent } from '@/services/tmdb';
import { tmdbItemToMovie } from '@/lib/movies';
import { toTmdbLang } from '@/lib/region';
import { GameHeader } from '@/components/layout/GameHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Poster } from '@/components/ui/Poster';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import MovieDetailsModal from '@/components/MovieDetailsModal';
import { ChallengeRow } from '@/components/challenges/ChallengeRow';
import type { ContentType, Movie } from '@/types';

type Tab = 'send' | 'received' | 'sent';

export default function ChallengeModePage() {
    const { sendChallenge, sentChallenges, receivedChallenges, resolveChallenge } = useChallenge();
    const { friends, loading: friendsLoading } = useFriends();
    const { addLike } = useUser();
    const { t, language } = useLanguage();
    const { showToast } = useToast();
    const searchId = useId();

    const [tab, setTab] = useState<Tab>('send');
    const [query, setQuery] = useState('');
    const [searchType, setSearchType] = useState<ContentType>('movie');
    const [results, setResults] = useState<Movie[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setSearching(true);
        try {
            const items = await searchContent(query, searchType, toTmdbLang(language));
            setResults(items.map(item => tmdbItemToMovie(item, searchType, language)));
        } finally {
            setSearching(false);
        }
    };

    const handleSend = async () => {
        if (!selectedMovie || selectedFriends.length === 0) return;
        setSending(true);
        const outcomes = await Promise.allSettled(
            selectedFriends.map(id => sendChallenge(selectedMovie, id, friends.find(f => f.id === id)?.username ?? '')),
        );
        setSending(false);
        const ok = outcomes.filter(o => o.status === 'fulfilled').length;
        const failed = outcomes.length - ok;
        showToast(t.challengesSent(ok, failed), failed === 0 ? 'success' : ok > 0 ? 'info' : 'error');
        if (ok > 0) {
            setSelectedMovie(null);
            setSelectedFriends([]);
            setTab('sent');
        }
    };

    const handleResolve = async (challengeId: string, movie: Movie, accepted: boolean) => {
        const ok = await resolveChallenge(challengeId, accepted);
        if (!ok) {
            showToast(t.genericError, 'error');
        } else if (accepted) {
            await addLike(movie); // igual que al aceptar desde el feed
            showToast(t.challengeAccepted, 'success');
        }
    };

    const toggleFriend = (id: string) =>
        setSelectedFriends(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    const noFriends = !friendsLoading && friends.length === 0;

    const sendTab = noFriends ? (
        <EmptyState
            icon={Users}
            title={t.needFriendsToChallenge}
            action={<Link href="/profile" className={buttonVariants({ size: 'lg' })}>{t.goToProfile}</Link>}
        />
    ) : !selectedMovie ? (
        <>
            <form onSubmit={handleSearch} className="mb-5 flex flex-wrap gap-2.5">
                <label htmlFor={searchId} className="sr-only">{t.searchMovieToChallenge}</label>
                <select
                    aria-label={t.mediaTypeLabel}
                    value={searchType}
                    onChange={e => setSearchType(e.target.value as ContentType)}
                    className="field-select"
                >
                    <option value="movie">{t.movies}</option>
                    <option value="tv">{t.tvShows}</option>
                </select>
                <Input id={searchId} value={query} onChange={e => setQuery(e.target.value)} placeholder={t.challengeSearchPlaceholder} className="min-w-[160px] flex-1" />
                <Button type="submit" variant="outline" size="icon-lg" isLoading={searching} aria-label={t.search}>
                    <Search size={20} aria-hidden />
                </Button>
            </form>
            {searching ? (
                <Spinner label={t.searching} />
            ) : results === null ? (
                <EmptyState icon={Swords} title={t.challengeSearchTitle} hint={t.challengeSearchHint} />
            ) : results.length === 0 ? (
                <p className="text-center text-sm text-[var(--muted-foreground)]">{t.noSearchResults}</p>
            ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
                    {results.map(movie => (
                        <li key={movie.id}>
                            <button
                                type="button"
                                onClick={() => { setSelectedMovie(movie); setSelectedFriends([]); }}
                                aria-label={movie.title}
                                className="relative block aspect-[2/3] w-full overflow-hidden rounded-xl transition-transform hover:scale-105"
                            >
                                <Poster src={movie.image} alt="" sizes="120px" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    ) : (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 text-center animate-pop-in">
            <div className="relative mx-auto mb-4 aspect-[2/3] w-[120px] overflow-hidden rounded-xl border-2 border-[var(--secondary)] shadow-[var(--shadow-lg)]">
                <Poster src={selectedMovie.image} alt="" sizes="120px" />
            </div>
            <h2 className="mb-1 font-display text-2xl font-extrabold leading-tight">{selectedMovie.title}</h2>
            <p className="eyebrow mb-6 text-[var(--secondary)]">{t.whoToChallenge}</p>

            {friendsLoading ? (
                <Spinner label={t.loadingFriends} />
            ) : (
                <ul className="mb-5 grid gap-2.5">
                    {friends.map(friend => {
                        const isSelected = selectedFriends.includes(friend.id);
                        return (
                            <li key={friend.id}>
                                <button
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => toggleFriend(friend.id)}
                                    className={`flex w-full items-center justify-between rounded-2xl border p-3.5 transition-colors ${isSelected ? 'border-2 border-[var(--secondary)] bg-[var(--secondary-soft)]' : 'border-[var(--border-strong)] hover:border-[var(--secondary)]'}`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Avatar src={friend.avatar_url} name={friend.username} size={32} />
                                        <span className="font-semibold">{friend.username || t.unknownUser}</span>
                                    </span>
                                    {isSelected ? <Check size={20} strokeWidth={3} aria-hidden /> : <Circle size={20} aria-hidden />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <Button size="lg" className="mb-3 w-full" disabled={selectedFriends.length === 0} isLoading={sending} onClick={() => void handleSend()}>
                <Swords size={20} aria-hidden /> {t.sendChallengeTo(selectedFriends.length)}
            </Button>
            <button type="button" onClick={() => setSelectedMovie(null)} className="text-sm text-[var(--muted-foreground)] underline">
                {t.pickAnotherMovie}
            </button>
        </div>
    );

    return (
        <div className="flex min-h-full flex-1 flex-col bg-[var(--background)] text-[var(--foreground)]">
            <GameHeader mode="challenge" title={t.challengeCenter} />

            <Tabs<Tab>
                label={t.challengeTabsLabel}
                className="px-5 pb-3"
                value={tab}
                onChange={setTab}
                items={[
                    { id: 'send', label: t.sendChallenge },
                    { id: 'received', label: t.myChallenges },
                    { id: 'sent', label: t.sentChallenges },
                ]}
            />

            <div role="tabpanel" className="custom-scrollbar mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-5 pb-24 animate-fade-in">
                {tab === 'send' && sendTab}
                {tab === 'received' && (
                    receivedChallenges.length === 0
                        ? <EmptyState icon={Swords} title={t.noReceivedChallenges} />
                        : (
                            <ul className="flex flex-col gap-3">
                                {receivedChallenges.map(c => (
                                    <li key={c.id}>
                                        <ChallengeRow
                                            challenge={c}
                                            direction="received"
                                            onOpenDetails={() => setDetailsMovie(c.movie)}
                                            onResolve={accepted => void handleResolve(c.id, c.movie, accepted)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )
                )}
                {tab === 'sent' && (
                    sentChallenges.length === 0
                        ? <EmptyState icon={Swords} title={t.noSentChallenges} />
                        : (
                            <ul className="flex flex-col gap-3">
                                {sentChallenges.map(c => (
                                    <li key={c.id}>
                                        <ChallengeRow challenge={c} direction="sent" onOpenDetails={() => setDetailsMovie(c.movie)} />
                                    </li>
                                ))}
                            </ul>
                        )
                )}
            </div>

            {detailsMovie && <MovieDetailsModal movie={detailsMovie} onClose={() => setDetailsMovie(null)} />}
        </div>
    );
}
