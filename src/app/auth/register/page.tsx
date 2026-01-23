'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMsg(null);
        if (!email || !password) return setError('Please fill in all fields');

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            if (data.session) {
                // Successful auto-login (if email confirm disabled)
                router.push('/');
            } else if (data.user) {
                // User created but waiting for confirmation
                setMsg('Success! Please check your email to confirm your account.');
                setLoading(false);
            }
        } catch (err) {
            setError('An unexpected error occurred');
            setLoading(false);
        }
    };

    return (
        <main className="container" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh', maxWidth: '400px' }}>
            <div className="animate-fade-in" style={{ width: '100%', textAlign: 'center' }}>
                <h1 style={{ marginBottom: '30px', fontWeight: 800, fontSize: '2rem' }}>Create Account</h1>

                {error && (
                    <div style={{
                        background: 'rgba(255, 71, 87, 0.1)',
                        border: '1px solid var(--accent-red-alt)',
                        color: 'var(--accent-red-alt)',
                        padding: '10px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                {msg && (
                    <div style={{
                        background: 'rgba(75, 255, 179, 0.1)',
                        border: '1px solid var(--accent-green)',
                        color: 'var(--accent-green)',
                        padding: '10px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.9rem'
                    }}>
                        {msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #333',
                            background: 'var(--bg-dark)',
                            color: 'white',
                            fontSize: '1rem',
                            opacity: loading ? 0.7 : 1
                        }}
                    />
                    <input
                        type="password"
                        placeholder="Choose Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #333',
                            background: 'var(--bg-dark)',
                            color: 'white',
                            fontSize: '1rem',
                            opacity: loading ? 0.7 : 1
                        }}
                    />
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: '10px', opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
                    >
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <p style={{ marginTop: '20px', color: '#666', fontSize: '0.9rem' }}>
                    Already have an account? <Link href="/auth/login" style={{ color: 'var(--primary)' }}>Login</Link>
                </p>
            </div>
        </main>
    );
}
