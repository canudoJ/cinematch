'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChallenge } from '@/context/ChallengeContext';
import { searchContent } from '@/services/tmdb';
import { Movie } from '@/lib/data';
import { useFriends } from '@/hooks/useFriends';
import BackButton from '@/components/ui/BackButton';

export default function ChallengeModePage() {
    const router = useRouter();
    const { sendChallenge, sentChallenges } = useChallenge();
    const { friends, loading: friendsLoading } = useFriends();
    const [activeTab, setActiveTab] = useState<'send' | 'sent'>('send');

    // Send Tab State
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

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
    };

    const handleSend = async (friendId: string, friendName: string) => {
        if (!selectedMovie) return;
        try {
            await sendChallenge(selectedMovie, friendId);
            alert(`¡Reto enviado a ${friendName}!`);
            setSelectedMovie(null);
            setQuery('');
            setSearchResults([]);
            setActiveTab('sent');
        } catch (error: any) {
            alert(error.message || 'Error al enviar reto');
        }
    };

    return (
        <div style={{ height: '100vh', background: 'var(--bg-darker)', color: 'white', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <BackButton className="absolute left-5 top-1/2 transform -translate-y-1/2" />
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Centro de Retos 🥊
                </h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
                <button
                    onClick={() => setActiveTab('send')}
                    style={{
                        flex: 1, padding: '15px', background: 'none', border: 'none',
                        color: activeTab === 'send' ? '#e1b12c' : '#888',
                        fontWeight: 'bold', borderBottom: activeTab === 'send' ? '2px solid #e1b12c' : 'none',
                        transition: 'all 0.3s'
                    }}
                >
                    ENVIAR RETO
                </button>
                <button
                    onClick={() => setActiveTab('sent')}
                    style={{
                        flex: 1, padding: '15px', background: 'none', border: 'none',
                        color: activeTab === 'sent' ? '#e1b12c' : '#888',
                        fontWeight: 'bold', borderBottom: activeTab === 'sent' ? '2px solid #e1b12c' : 'none',
                        transition: 'all 0.3s'
                    }}
                >
                    MIS RETOS ({sentChallenges.length})
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {activeTab === 'send' ? (
                    <div className="animate-fade-in">
                        {/* Search */}
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Buscar película para retar..."
                                style={{
                                    flex: 1, padding: '15px', borderRadius: '12px', border: 'none',
                                    background: '#333', color: 'white', fontSize: '1rem'
                                }}
                            />
                            <button type="submit" style={{ padding: '0 20px', borderRadius: '12px', background: '#e1b12c', border: 'none', fontWeight: 'bold', fontSize: '1.2rem' }}>🔍</button>
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
                                <div style={{ background: '#252525', padding: '20px', borderRadius: '24px', textAlign: 'center', border: '1px solid #333' }}>
                                    <div style={{
                                        width: '120px', borderRadius: '12px', overflow: 'hidden', margin: '0 auto 15px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '2px solid #e1b12c'
                                    }}>
                                        <img src={selectedMovie.image} alt="Selected" style={{ width: '100%', display: 'block' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{selectedMovie.title}</h3>
                                    <p style={{ color: '#e1b12c', fontWeight: 'bold', marginBottom: '25px', fontSize: '0.9rem' }}>¿A QUIÉN QUIERES RETAR?</p>

                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {friendsLoading ? (
                                            <p className="text-gray-500 animate-pulse">Cargando amigos...</p>
                                        ) : friends.length === 0 ? (
                                            <p className="text-gray-500">No tienes amigos agregados aún. ¡Invita a alguien desde tu perfil!</p>
                                        ) : (
                                            friends.map(friend => (
                                                <button
                                                    key={friend.id}
                                                    onClick={() => handleSend(friend.id, friend.username || 'Amigo')}
                                                    style={{
                                                        padding: '15px', borderRadius: '16px', border: '1px solid #444',
                                                        background: '#333', color: 'white', fontSize: '1rem', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#444'; e.currentTarget.style.borderColor = '#e1b12c'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#333'; e.currentTarget.style.borderColor = '#444'; }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', background: '#e1b12c' }}>
                                                            {friend.avatar_url ? (
                                                                <img src={friend.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 'bold' }}>
                                                                    {(friend.username || '?')[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span style={{ fontWeight: 600 }}>{friend.username || 'Sin nombre'}</span>
                                                    </div>
                                                    <span>🔥</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedMovie(null)}
                                        style={{ marginTop: '20px', background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {sentChallenges.length === 0 && <p style={{ textAlign: 'center', color: '#666' }}>No has enviado retos aún.</p>}
                        {sentChallenges.map(challenge => (
                            <div key={challenge.id} style={{
                                background: '#252525', padding: '15px', borderRadius: '15px',
                                display: 'flex', gap: '15px', alignItems: 'center'
                            }}>
                                <img src={challenge.movie.image} style={{ width: '50px', height: '75px', borderRadius: '6px', objectFit: 'cover' }} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 5px 0' }}>{challenge.movie.title}</h4>
                                    <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                        Para: <span style={{ color: 'white', fontWeight: 'bold' }}>{challenge.receiverName || challenge.sender}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                                        {new Date(challenge.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.5rem' }}>
                                    {challenge.status === 'pending' ? '⏳' :
                                        challenge.status === 'accepted' ? '✅' : '❌'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
