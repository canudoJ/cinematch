'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, PlayCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { isUsernameAvailable } from '@/lib/usernameValidation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthProvider';

export default function RegisterPage() {
    const { t, language } = useLanguage();
    const { user, isGuest } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMsg(null);

        if (!email || !password || !username.trim()) {
            setError(language === 'es' ? 'Por favor completa todos los campos' : 'Please fill in all fields');
            return;
        }

        setCheckingUsername(true);
        const isAvailable = await isUsernameAvailable(username.trim());
        setCheckingUsername(false);

        if (!isAvailable) {
            setError(t.usernameTaken);
            return;
        }

        setLoading(true);

        // Invitado → se convierte su usuario anónimo en una cuenta normal,
        // conservando biblioteca, barajas y amigos.
        if (isGuest && user) {
            try {
                const { error: updateError } = await supabase.auth.updateUser({ email, password });
                if (updateError) throw updateError;

                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ username: username.trim() })
                    .eq('id', user.id);
                if (profileError) console.error('Error updating profile:', profileError);

                setMsg(language === 'es'
                    ? '¡Listo! Revisa tu correo para confirmar la cuenta. Todo lo que hiciste como invitado se conserva.'
                    : 'Done! Check your email to confirm your account. Everything you did as a guest is kept.');
            } catch (err) {
                setError(err instanceof Error ? err.message : (language === 'es' ? 'Ocurrió un error inesperado' : 'An unexpected error occurred'));
            }
            setLoading(false);
            return;
        }

        try {
            // El username va en los metadatos: el trigger handle_new_user crea el perfil con él.
            // Si hay confirmación de email no existe sesión todavía y el insert de abajo lo bloquearía RLS.
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { username: username.trim() } },
            });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            if (data.user) {
                if (data.session) {
                    // Sin confirmación de email ya hay sesión: asegurar el perfil por si no existe el trigger
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({ id: data.user.id, username: username.trim() });
                    if (profileError) console.error('Error creating profile:', profileError);

                    router.push('/');
                } else {
                    setMsg(language === 'es'
                        ? '¡Éxito! Revisa tu correo para confirmar tu cuenta.'
                        : 'Success! Please check your email to confirm your account.');
                    setLoading(false);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : (language === 'es' ? 'Ocurrió un error inesperado' : 'An unexpected error occurred'));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Fondo ambiental */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--primary)] opacity-5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[var(--primary)] opacity-10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary)]/10 mb-4">
                        <PlayCircle size={32} className="text-[var(--primary)]" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter mb-2 italic">CINEMATCH</h1>
                    <p className="text-[var(--muted-foreground)] font-medium">
                        {language === 'es' ? 'Crear cuenta' : 'Create Account'}
                    </p>
                </div>

                <div className="bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] p-8 rounded-3xl shadow-2xl">
                    {error && (
                        <div className="bg-[var(--destructive)]/10 border border-[var(--destructive)]/50 text-[var(--destructive)] px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm font-medium">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {msg && (
                        <div className="bg-[var(--secondary)]/10 border border-[var(--secondary)]/50 text-[var(--secondary)] px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm font-medium">
                            <CheckCircle size={18} />
                            <span>{msg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">
                                {language === 'es' ? 'Nombre de usuario' : 'Username'}
                            </label>
                            <Input
                                type="text"
                                placeholder={language === 'es' ? 'Nombre de usuario' : 'Username'}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading || checkingUsername}
                                required
                                minLength={3}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">Email</label>
                            <Input
                                type="email"
                                placeholder={language === 'es' ? 'Email' : 'Email'}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading || checkingUsername}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">
                                {language === 'es' ? 'Contraseña' : 'Password'}
                            </label>
                            <Input
                                type="password"
                                placeholder={language === 'es' ? 'Contraseña' : 'Password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading || checkingUsername}
                                required
                                minLength={6}
                            />
                        </div>

                        <Button
                            type="submit"
                            isLoading={loading || checkingUsername}
                            className="w-full mt-6"
                        >
                            {checkingUsername
                                ? (language === 'es' ? 'Verificando...' : 'Checking...')
                                : loading
                                    ? (language === 'es' ? 'Creando cuenta...' : 'Creating Account...')
                                    : (language === 'es' ? 'Registrarse' : 'Register')
                            }
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[var(--muted-foreground)] text-sm">
                            {language === 'es' ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}
                            <Link href="/auth/login" className="text-[var(--primary)] font-bold hover:underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded">
                                {language === 'es' ? 'Iniciar sesión' : 'Login'}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
