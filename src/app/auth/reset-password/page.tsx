'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

export default function ResetPasswordPage() {
    const { t, language } = useLanguage();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const router = useRouter();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-confirm`,
            });

            if (error) throw error;

            setSuccess(true);
        } catch (error: any) {
            console.error('Reset password error:', error);
            setErrorMsg(error.message || 'Error al enviar el enlace de recuperación');
        } finally {
            setLoading(false);
        }
    };

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
                            ? 'Te enviaremos un enlace para restablecer tu contraseña'
                            : 'We\'ll send you a link to reset your password'}
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
                                {language === 'es' ? 'Enlace enviado' : 'Link sent'}
                            </h2>
                            <p className="text-[var(--muted-foreground)] mb-6">
                                {language === 'es'
                                    ? 'Revisa tu correo electrónico y sigue las instrucciones para restablecer tu contraseña.'
                                    : 'Check your email and follow the instructions to reset your password.'}
                            </p>
                            <Link
                                href="/auth/login"
                                className="inline-block text-[var(--secondary)] hover:underline font-medium"
                            >
                                {t.back} al inicio de sesión
                            </Link>
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
                                        {language === 'es' ? 'Email' : 'Email'}
                                    </label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={language === 'es' ? 'nombre@ejemplo.com' : 'name@example.com'}
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    isLoading={loading}
                                    className="w-full mt-6"
                                >
                                    {t.sendResetLink}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
