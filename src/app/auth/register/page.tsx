'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { authErrorMessage } from '@/lib/authErrors';
import { USERNAME_MAX, isUsernameAvailable, isValidUsername } from '@/lib/usernameValidation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthCard, AuthHeader, FormMessage, authFieldLabel } from '@/components/auth/AuthParts';

const PASSWORD_MIN = 6;

export default function RegisterPage() {
    const { t } = useLanguage();
    const { user, isGuest } = useAuth();
    const router = useRouter();
    const ids = { username: useId(), email: useId(), password: useId(), usernameHint: useId() };
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        const name = username.trim();

        if (!name || !email.trim() || !password) return setError(t.fillAllFields);
        if (!isValidUsername(name)) return setError(t.usernameRules);
        if (password.length < PASSWORD_MIN) return setError(t.passwordMin(PASSWORD_MIN));

        setLoading(true);
        try {
            if (!(await isUsernameAvailable(name, user?.id))) {
                setError(t.usernameTaken);
                return;
            }

            if (isGuest && user) {
                // Invitado: su usuario anónimo pasa a ser una cuenta normal y conserva sus datos
                const { error: updateError } = await supabase.auth.updateUser({ email: email.trim(), password });
                if (updateError) throw updateError;
                await supabase.from('profiles').update({ username: name }).eq('id', user.id);
                setSuccess(t.guestConvertedCheckEmail);
                return;
            }

            // El nombre va en los metadatos: el trigger handle_new_user crea el perfil con él
            // (con confirmación de email aún no hay sesión y RLS impediría escribir el perfil)
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { username: name } },
            });
            if (signUpError) throw signUpError;

            if (data.session && data.user) {
                await supabase.from('profiles').upsert({ id: data.user.id, username: name });
                router.push('/');
            } else {
                setSuccess(t.checkEmailToConfirm);
            }
        } catch (err) {
            setError(authErrorMessage(err, t));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AuthHeader subtitle={isGuest ? t.convertGuestTitle : t.createAccountTitle} />
            <AuthCard>
                {isGuest && !success && <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">{t.convertGuestHint}</p>}
                {error && <FormMessage type="error">{error}</FormMessage>}
                {success && <FormMessage type="success">{success}</FormMessage>}

                {!success && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label htmlFor={ids.username} className={authFieldLabel}>{t.usernameLabel}</label>
                            <Input id={ids.username} autoComplete="username" maxLength={USERNAME_MAX} value={username} onChange={e => setUsername(e.target.value)} placeholder={t.chooseName} aria-describedby={ids.usernameHint} required />
                            <p id={ids.usernameHint} className="text-caption ml-1">{t.usernameRules}</p>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor={ids.email} className={authFieldLabel}>{t.emailLabel}</label>
                            <Input id={ids.email} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} required />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor={ids.password} className={authFieldLabel}>{t.passwordLabel}</label>
                            <Input id={ids.password} type="password" autoComplete="new-password" minLength={PASSWORD_MIN} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>
                        <Button type="submit" isLoading={loading} className="mt-6 w-full">{t.registerButton}</Button>
                    </form>
                )}

                {!isGuest && (
                    <p className="mt-8 text-center text-sm text-[var(--muted-foreground)]">
                        {t.haveAccountQuestion}{' '}
                        <Link href="/auth/login" className="font-bold text-[var(--primary)] underline-offset-4 hover:underline">{t.loginHere}</Link>
                    </p>
                )}
            </AuthCard>
        </>
    );
}
