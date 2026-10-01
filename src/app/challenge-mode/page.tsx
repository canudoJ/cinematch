'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChallenge } from '@/context/ChallengeContext';
import { searchContent, getWatchLink } from '@/services/tmdb';
import { Movie } from '@/lib/data';
import { useFriends } from '@/hooks/useFriends';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { buildPlatformSearchUrl } from '@/services/tmdb';
import BackButton from '@/components/ui/BackButton';
import MovieDetailsModal from '@/components/MovieDetailsModal';
import { Swords, Search, Check, Circle, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function ChallengeModePage() {
    const router = useRouter();
    const { sendChallenge, sentChallenges, pendingChallenges, receivedChallenges } = useChallenge();
    const { friends, loading: friendsLoading } = useFriends();
    const { platforms } = useUser();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'send' | 'received' | 'sent'>('send');

    // Send Tab State
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    
    // Details Modal State
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedChallengeMovie, setSelectedChallengeMovie] = useState<Movie | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        const results = await searchContent(query);
        setSearchResults(results || []);
    };

    const handleSelectMovie = (item: any) => {
        // Map TMDB result to our Movie interface
        const movie: Movie = {
            id: item.id.toString(),
            title: item.title || item.name,
            image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
            year: parseInt((item.release_date || item.first_air_date || '0').split('-')[0]),
            type: item.media_type || 'movie',
            rating: item.vote_average,
            synopsis: item.overview,
            synopsis_es: item.overview, // Fallback
            genres: item.genre_ids
        };
        setSelectedMovie(movie);
        setSelectedFriends([]); // Reset selected friends when selecting a new movie
    };

    const handleToggleFriend = (friendId: string) => {
        setSelectedFriends(prev => {
            if (prev.includes(friendId)) {
                return prev.filter(id => id !== friendId);
            } else {
                return [...prev, friendId];
            }
        });
    };

    const handleWatchNow = async (movie: Movie) => {
        const region = typeof navigator !== 'undefined' ? (navigator.language.split('-')[1]?.toUpperCase() || 'ES') : 'ES';
        try {
            const { providers } = await getWatchLink(movie.id, movie.type || 'movie', platforms || [], region, movie.title);
            const link = providers.length > 0
                ? providers[0].link
                : buildPlatformSearchUrl('', movie.title) || `https://www.google.com/search?q=ver+${encodeURIComponent(movie.title)}+online`;
            window.open(link, '_blank', 'noopener,noreferrer');
        } catch {
            window.open(`https://www.google.com/search?q=ver+${encodeURIComponent(movie.title)}+online`, '_blank', 'noopener,noreferrer');
        }
    };

    const handleViewDetails = (movie: Movie) => {
        setSelectedChallengeMovie(movie);
        setShowDetailsModal(true);
    };

    const handleSendChallenges = async () => {
        if (!selectedMovie || selectedFriends.length === 0) return;
        
        try {
            let successCount = 0;
            let errorCount = 0;
            
            // Enviar reto a todos los amigos seleccionados
            for (const friendId of selectedFriends) {
                try {
                    await sendChallenge(selectedMovie, friendId);
                    successCount++;
                } catch (error: any) {
                    console.error('Error al enviar reto:', error);
                    errorCount++;
                }
            }
            
            // No limpiar si todos fallaron
            if (successCount === 0) return;
            
            // Limpiar estado
            setSelectedMovie(null);
            setSelectedFriends([]);
            setQuery('');
            setSearchResults([]);
            setActiveTab('send'); // Volver a la pantalla principal de envío
        } catch (error: any) {
            console.error('Error al enviar retos:', error);
        }
    };

    return (
        <div style={{ height: '100vh', background: 'var(--background)', color: 'white', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <BackButton className="absolute left-5 top-1/2 transform -translate-y-1/2" />
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '1px' }}>
                    <span className="inline-flex items-center gap-2"><Swords size={24} className="text-[var(--secondary)]" aria-hidden /> {t.challengeCenter}</span>
                </h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                <button
                    onClick={() => setActiveTab('send')}
                    style={{
                        flex: 1,
                        padding: '14px',
                        background: activeTab === 'send' ? 'var(--background)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'send' ? 'var(--secondary)' : 'var(--muted-foreground)',
                        fontWeight: 'bold',
                        borderBottom: activeTab === 'send' ? '2px solid var(--secondary)' : 'none',
                        transition: 'all 0.3s'
                    }}
                >
                    {t.sendChallenge}
                </button>
                <button
                    onClick={() => setActiveTab('received')}
                    style={{
                        flex: 1, padding: '15px', background: 'none', border: 'none',
                        color: activeTab === 'received' ? 'var(--secondary)' : 'var(--muted-foreground)',
                        fontWeight: 'bold', borderBottom: activeTab === 'received' ? '2px solid var(--secondary)' : 'none',
                        transition: 'all 0.3s'
                    }}
                >
                    {t.myChallenges}
                </button>
                <button
                    onClick={() => setActiveTab('sent')}
                    style={{
                        flex: 1, padding: '15px', background: 'none', border: 'none',
                        color: activeTab === 'sent' ? 'var(--secondary)' : 'var(--muted-foreground)',
                        fontWeight: 'bold', borderBottom: activeTab === 'sent' ? '2px solid var(--secondary)' : 'none',
                        transition: 'all 0.3s'
                    }}
                >
                    {t.sentChallenges}
                </button>
            </div>

            {/* Content - padding-bottom para que al hacer scroll llegue hasta el BottomNav */}
            <div
                className="custom-scrollbar"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    paddingBottom: 'calc(20px + 72px + env(safe-area-inset-bottom, 0))',
                }}
            >
                {activeTab === 'send' ? (
                    <div className="animate-fade-in">
                        {/* Search */}
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={t.searchMovieToChallenge}
                                style={{
                                    flex: 1, padding: '15px', borderRadius: '12px', border: '2px solid var(--border)',
                                    background: 'var(--card)', color: 'var(--foreground)', fontSize: '1rem'
                                }}
                            />
                            <button type="submit" style={{ padding: '0 20px', borderRadius: '12px', background: 'var(--secondary)', color: 'var(--background)', border: 'none', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Search size={22} aria-hidden /></button>
                        </form>

                        {/* Results */}
                        {!selectedMovie ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px' }}>
                                {searchResults.map(item => (
                                    <div key={item.id} onClick={() => handleSelectMovie(item)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '2/3' }}>
                                            <img
                                                src={item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300'}
                                                alt={item.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="animate-pop-in">
                                {/* Selected Movie & Friend Picker */}
                                <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '24px', textAlign: 'center', border: '1px solid var(--border)' }}>
                                    <div style={{
                                        width: '120px', borderRadius: '12px', overflow: 'hidden', margin: '0 auto 15px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '2px solid var(--secondary)'
                                    }}>
                                        <img src={selectedMovie.image} alt="Selected" style={{ width: '100%', display: 'block' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{selectedMovie.title}</h3>
                                    <p style={{ color: 'var(--secondary)', fontWeight: 'bold', marginBottom: '25px', fontSize: '0.9rem' }}>{t.whoToChallenge}</p>

                                    <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                                        {friendsLoading ? (
                                            <p className="text-[var(--muted-foreground)] animate-pulse">{t.loadingFriends}</p>
                                        ) : friends.length === 0 ? (
                                            <p className="text-[var(--muted-foreground)]">{t.noFriendsYet || "No tienes amigos agregados aún. ¡Invita a alguien desde tu perfil!"}</p>
                                        ) : (
                                            friends.map(friend => {
                                                const isSelected = selectedFriends.includes(friend.id);
                                                return (
                                                    <button
                                                        key={friend.id}
                                                        onClick={() => handleToggleFriend(friend.id)}
                                                        style={{
                                                            padding: '15px', borderRadius: '16px', 
                                                            border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border)',
                                                            background: isSelected ? 'var(--muted)' : 'var(--card)', 
                                                            color: 'var(--foreground)', fontSize: '1rem', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={e => { 
                                                            if (!isSelected) {
                                                                e.currentTarget.style.background = 'var(--border)'; 
                                                                e.currentTarget.style.borderColor = 'var(--secondary)';
                                                            }
                                                        }}
                                                        onMouseLeave={e => { 
                                                            if (!isSelected) {
                                                                e.currentTarget.style.background = 'var(--card)'; 
                                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                            }
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ 
                                                                width: '30px', 
                                                                height: '30px', 
                                                                borderRadius: '50%', 
                                                                overflow: 'hidden', 
                                                                background: isSelected ? 'var(--secondary)' : 'var(--border)',
                                                                border: isSelected ? '2px solid var(--secondary)' : 'none'
                                                            }}>
                                                                {friend.avatar_url ? (
                                                                    <img src={friend.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? 'black' : 'white', fontWeight: 'bold' }}>
                                                                        {(friend.username || '?')[0].toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span style={{ fontWeight: 600 }}>{friend.username || 'Sin nombre'}</span>
                                                        </div>
                                                        <span style={{ fontSize: '1.2rem' }}>
                                                            {isSelected ? <Check size={20} strokeWidth={3} aria-hidden /> : <Circle size={20} strokeWidth={2} aria-hidden />}
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Botón de enviar reto - solo visible cuando hay amigos seleccionados */}
                                    {selectedFriends.length > 0 && (
                                        <button
                                            onClick={handleSendChallenges}
                                            style={{
                                                width: '100%',
                                                padding: '15px',
                                                borderRadius: '16px',
                                                background: 'var(--secondary)',
                                                color: 'var(--background)',
                                                border: 'none',
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                marginBottom: '15px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Swords size={20} className="inline-block mr-2 -mt-0.5" aria-hidden /> Enviar Reto a {selectedFriends.length} {selectedFriends.length === 1 ? 'Amigo' : 'Amigos'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setSelectedMovie(null);
                                            setSelectedFriends([]);
                                        }}
                                        style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--muted-foreground)', textDecoration: 'underline', cursor: 'pointer' }}
                                    >
                                        {t.cancel}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'received' ? (
                    <div className="animate-fade-in flex flex-col gap-3 w-full max-w-4xl mx-auto">
                        {receivedChallenges.length === 0 && <p className="text-center text-[var(--muted-foreground)]">{t.noReceivedChallenges}</p>}
                        {receivedChallenges.map(challenge => (
                            <div
                                key={challenge.id}
                                className="relative w-full max-w-4xl mx-auto rounded-xl p-3 flex gap-3 items-center overflow-hidden"
                                style={{
                                    background: 'var(--card)',
                                    border: challenge.status === 'pending' ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <img
                                    src={challenge.movie.image}
                                    alt={challenge.movie.title}
                                    onClick={() => handleViewDetails(challenge.movie)}
                                    className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded shrink-0 bg-[var(--border)] cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                <div className="flex flex-col flex-1 min-w-0 justify-center gap-2">
                                    <div>
                                        <h4 className="text-sm sm:text-base font-bold text-white truncate leading-tight pr-1">{challenge.movie.title}</h4>
                                        <p className="text-xs text-[var(--muted-foreground)] truncate">
                                            De: <span className="text-[var(--foreground)] font-bold">{challenge.sender}</span>
                                            <span className="hidden min-[350px]:inline"> · {new Date(challenge.timestamp).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-0.5">
                                        <button
                                            onClick={() => handleWatchNow(challenge.movie)}
                                            className="text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition hover:opacity-90"
                                            style={{
                                                background: 'var(--secondary)',
                                                color: 'var(--background)',
                                                border: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {t.watchNow}
                                        </button>
                                        <button
                                            onClick={() => handleViewDetails(challenge.movie)}
                                            className="text-[10px] sm:text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition"
                                            style={{
                                                background: 'transparent',
                                                color: 'var(--foreground)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            {t.details}
                                        </button>
                                    </div>
                                </div>
                                <div className="shrink-0 text-[var(--secondary)] ml-1">
                                    {challenge.status === 'pending' ? <Clock size={20} className="text-[var(--muted-foreground)]" aria-hidden /> :
                                        challenge.status === 'accepted' ? <CheckCircle size={20} aria-hidden /> : <XCircle size={20} className="text-[var(--destructive)]" aria-hidden />}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="animate-fade-in flex flex-col gap-3 w-full max-w-4xl mx-auto">
                        {sentChallenges.length === 0 && <p className="text-center text-[var(--muted-foreground)]">{t.noSentChallenges}</p>}
                        {sentChallenges.map(challenge => (
                            <div
                                key={challenge.id}
                                className="relative w-full max-w-4xl mx-auto rounded-xl p-3 flex gap-3 items-center overflow-hidden border border-white/5"
                                style={{ background: 'var(--card)' }}
                            >
                                <img
                                    src={challenge.movie.image}
                                    alt={challenge.movie.title}
                                    onClick={() => handleViewDetails(challenge.movie)}
                                    className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded shrink-0 bg-[var(--border)] cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                <div className="flex flex-col flex-1 min-w-0 justify-center gap-1.5">
                                    <h4 className="text-sm sm:text-base font-bold text-white truncate leading-tight pr-1">{challenge.movie.title}</h4>
                                    <p className="text-xs text-[var(--muted-foreground)] truncate">
                                        Para: <span className="text-[var(--foreground)] font-bold">{challenge.receiverName || challenge.sender}</span>
                                        <span className="hidden min-[350px]:inline"> · {new Date(challenge.timestamp).toLocaleDateString()}</span>
                                    </p>
                                </div>
                                <div className="shrink-0 text-[var(--secondary)] ml-1">
                                    {challenge.status === 'pending' ? <Clock size={20} className="text-[var(--muted-foreground)]" aria-hidden /> :
                                        challenge.status === 'accepted' ? <CheckCircle size={20} aria-hidden /> : <XCircle size={20} className="text-[var(--destructive)]" aria-hidden />}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Movie Details Modal */}
            {showDetailsModal && selectedChallengeMovie && (
                <MovieDetailsModal
                    movie={selectedChallengeMovie}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedChallengeMovie(null);
                    }}
                />
            )}
        </div>
    );
}
