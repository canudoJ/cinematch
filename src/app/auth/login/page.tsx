'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GuestAccessButton } from '@/components/GuestAccessButton';

// Solo rutas internas: evita redirecciones abiertas a otros dominios
function getRedirectTarget(): string {
    if (typeof window === 'undefined') return '/';
    const target = new URLSearchParams(window.location.search).get('redirect');
    return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
}

export default function LoginPage() {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const router = useRouter();
    const [redirectTo, setRedirectTo] = useState('/');

    useEffect(() => {
        setRedirectTo(getRedirectTarget());
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Esperar un momento para que la sesión se establezca
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verificar que la sesión se estableció correctamente
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Redirigir después de confirmar la sesión
                router.push(redirectTo);
                router.refresh();
            } else {
                throw new Error('No se pudo establecer la sesión');
            }

        } catch (error) {
            console.error('Login error:', error);
            setErrorMsg(error instanceof Error ? error.message : 'Error al iniciar sesión');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* 1. FONDO AMBIENTAL (El brillo rojo y morado detrás) */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--primary)] opacity-5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[var(--primary)] opacity-10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">

                {/* 2. CABECERA CON LOGO */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary)]/10 mb-4 animate-pulse">
                        <PlayCircle size={32} className="text-[var(--primary)]" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter mb-2 italic">
                        CINEMATCH
                    </h1>
                    <p className="text-[var(--muted-foreground)] font-medium">Tu próxima película favorita te espera.</p>
                </div>

                {/* 3. TARJETA DE FORMULARIO (Efecto Cristal) */}
                <div className="bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] p-8 rounded-3xl shadow-2xl">

                    {/* Mensaje de Error (Solo sale si hay error) */}
                    {errorMsg && (
                        <div className="bg-[var(--destructive)]/10 border border-[var(--destructive)]/50 text-[var(--destructive)] px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Input Email */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nombre@ejemplo.com"
                                required
                            />
                        </div>

                        {/* Input Contraseña */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">Contraseña</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <div className="text-right mt-2">
                                <Link href="/auth/reset-password" className="text-xs text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded">
                                    {t.forgotPassword}
                                </Link>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            isLoading={loading}
                            className="w-full mt-6"
                        >
                            ENTRAR
                        </Button>
                    </form>

                    {/* Acceso de invitado: prueba la app sin crear cuenta */}
                    <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                        <span className="h-px flex-1 bg-[var(--border)]" />
                        o
                        <span className="h-px flex-1 bg-[var(--border)]" />
                    </div>
                    <GuestAccessButton redirectTo={redirectTo} className="w-full mt-6" />

                    {/* Link a Registro */}
                    <div className="mt-8 text-center">
                        <p className="text-[var(--muted-foreground)] text-sm">
                            ¿No tienes cuenta?{' '}
                            <Link href="/auth/register" className="text-[var(--primary)] font-bold hover:underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded">
                                Regístrate aquí
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}