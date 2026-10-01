'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

export default function ResetConfirmPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        // Procesar el callback de Supabase y verificar sesión
        const checkSession = async () => {
            try {
                // Supabase procesa automáticamente los hash fragments (#access_token, etc.) del URL
                // Esperar un momento para que Supabase procese los tokens
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Session error:', error);
                    setErrorMsg(language === 'es' 
                        ? 'Error al procesar el enlace. Solicita un nuevo enlace.'
                        : 'Error processing link. Please request a new one.');
                    setVerifying(false);
                    return;
                }

                if (!session) {
                    // Intentar obtener el hash de la URL manualmente si existe
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const type = hashParams.get('type');
                    
                    if (accessToken && type === 'recovery') {
                        // Si hay tokens en el hash, intentar establecer la sesión
                        const { error: exchangeError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: hashParams.get('refresh_token') || ''
                        });
                        
                        if (exchangeError) {
                            console.error('Session exchange error:', exchangeError);
                            setErrorMsg(language === 'es' 
                                ? 'Enlace inválido o expirado. Solicita un nuevo enlace.'
                                : 'Invalid or expired link. Please request a new one.');
                        } else {
                            // Limpiar el hash de la URL
                            window.history.replaceState(null, '', window.location.pathname);
                        }
                    } else {
                        setErrorMsg(language === 'es' 
                            ? 'Enlace inválido o expirado. Solicita un nuevo enlace.'
                            : 'Invalid or expired link. Please request a new one.');
                    }
                }
                
                setVerifying(false);
            } catch (err: any) {
                console.error('Error checking session:', err);
                setErrorMsg(language === 'es' 
                    ? 'Error al verificar el enlace.'
                    : 'Error verifying link.');
                setVerifying(false);
            }
        };

        checkSession();
    }, [language]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (password !== confirmPassword) {
            setErrorMsg(language === 'es' 
                ? 'Las contraseñas no coinciden'
                : 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setErrorMsg(language === 'es' 
                ? 'La contraseña debe tener al menos 6 caracteres'
                : 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
        } catch (error: any) {
            console.error('Reset password error:', error);
            setErrorMsg(error.message || (language === 'es' 
                ? 'Error al restablecer la contraseña'
                : 'Error resetting password'));
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4">
                <Loader2 className="animate-spin text-[var(--secondary)] mb-4" size={48} />
                <p className="text-[var(--muted-foreground)]">{language === 'es' ? 'Verificando...' : 'Verifying...'}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Fondo ambiental */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--primary)] opacity-5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[var(--primary)] opacity-10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                {/* Botón volver */}
                <Link 
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">{t.back}</span>
                </Link>

                {/* Cabecera */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black tracking-tighter mb-2">
                        {t.resetPassword}
                    </h1>
                    <p className="text-[var(--muted-foreground)] font-medium">
                        {language === 'es' 
                            ? 'Ingresa tu nueva contraseña'
                            : 'Enter your new password'}
                    </p>
                </div>

                {/* Tarjeta de formulario */}
                <div className="bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] p-8 rounded-3xl shadow-2xl">
                    {success ? (
                        <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--secondary)]/10 mb-4">
                                <CheckCircle size={32} className="text-[var(--secondary)]" />
                            </div>
                            <h2 className="text-xl font-bold mb-2 text-[var(--foreground)]">
                                {language === 'es' ? '¡Contraseña restablecida!' : 'Password reset!'}
                            </h2>
                            <p className="text-[var(--muted-foreground)] mb-6">
                                {language === 'es'
                                    ? 'Redirigiendo al inicio de sesión...'
                                    : 'Redirecting to login...'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {errorMsg && (
                                <div className="bg-[var(--destructive)]/10 border border-[var(--destructive)]/50 text-[var(--destructive)] px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm font-medium">
                                    <AlertCircle size={18} />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <form onSubmit={handleReset} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">
                                        {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
                                    </label>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">
                                        {language === 'es' ? 'Confirmar Contraseña' : 'Confirm Password'}
                                    </label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    isLoading={loading}
                                    className="w-full mt-6"
                                >
                                    {language === 'es' ? 'Restablecer Contraseña' : 'Reset Password'}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
