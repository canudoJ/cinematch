'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { authErrorMessage } from '@/lib/authErrors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthCard, FormMessage, authFieldLabel } from '@/components/auth/AuthParts';

const PASSWORD_MIN = 6;

/**
 * Destino del enlace del correo de recuperación. El cliente de Supabase procesa
 * el enlace (code o tokens) antes de que AuthProvider termine de cargar, así que
 * si hay sesión aquí es la de recuperación y se puede fijar la contraseña nueva.
 */
export default function ResetConfirmPage() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();
    const ids = { password: useId(), confirm: useId() };
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        if (password.length < PASSWORD_MIN) return setErrorMsg(t.passwordMin(PASSWORD_MIN));
        if (password !== confirmPassword) return setErrorMsg(t.passwordsDontMatch);

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) {
            setErrorMsg(authErrorMessage(error, t));
            return;
        }
        setDone(true);
        router.push('/');
    };

    return (
        <>
            <h1 className="title-page mb-10 text-center">{t.newPasswordTitle}</h1>
            <AuthCard>
                {!user || user.is_anonymous ? (
                    <div className="text-center">
                        <FormMessage type="error">{t.invalidResetLink}</FormMessage>
                        <Link href="/auth/reset-password" className="font-bold text-[var(--secondary)] hover:underline">{t.requestNewLink}</Link>
                    </div>
                ) : done ? (
                    <FormMessage type="success">{t.passwordUpdated}</FormMessage>
                ) : (
                    <>
                        {errorMsg && <FormMessage type="error">{errorMsg}</FormMessage>}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1">
                                <label htmlFor={ids.password} className={authFieldLabel}>{t.passwordLabel}</label>
                                <Input id={ids.password} type="password" autoComplete="new-password" minLength={PASSWORD_MIN} value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor={ids.confirm} className={authFieldLabel}>{t.confirmPasswordLabel}</label>
                                <Input id={ids.confirm} type="password" autoComplete="new-password" minLength={PASSWORD_MIN} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                            </div>
                            <Button type="submit" isLoading={loading} className="mt-6 w-full">{t.updatePassword}</Button>
                        </form>
                    </>
                )}
            </AuthCard>
        </>
    );
}
