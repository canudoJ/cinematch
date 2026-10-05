'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { safeRedirect } from '@/lib/safeRedirect';
import { authErrorMessage } from '@/lib/authErrors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GuestAccessButton } from '@/components/GuestAccessButton';
import { AuthCard, AuthHeader, FormMessage, authFieldLabel } from '@/components/auth/AuthParts';

/** Destino tras entrar (?redirect=…), solo si es una ruta interna */
function redirectTarget(): string {
    if (typeof window === 'undefined') return '/';
    return safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
}

export default function LoginPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const ids = { email: useId(), password: useId() };
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
            setErrorMsg(authErrorMessage(error, t));
            setLoading(false);
            return;
        }
        router.push(redirectTarget());
        router.refresh();
    };

    return (
        <>
            <AuthHeader subtitle={t.authTagline} />
            <AuthCard>
                {errorMsg && <FormMessage type="error">{errorMsg}</FormMessage>}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1">
                        <label htmlFor={ids.email} className={authFieldLabel}>{t.emailLabel}</label>
                        <Input id={ids.email} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} required />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor={ids.password} className={authFieldLabel}>{t.passwordLabel}</label>
                        <Input id={ids.password} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        <div className="mt-2 text-right">
                            <Link href="/auth/reset-password" className="text-xs text-[var(--primary)] hover:underline">{t.forgotPassword}</Link>
                        </div>
                    </div>
                    <Button type="submit" isLoading={loading} className="mt-6 w-full">{t.loginButton}</Button>
                </form>

                <div className="eyebrow mt-6 flex items-center gap-3" aria-hidden>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    {t.orSeparator}
                    <span className="h-px flex-1 bg-[var(--border)]" />
                </div>
                <GuestAccessButton redirectTo={redirectTarget()} className="mt-6 w-full" />

                <p className="mt-8 text-center text-sm text-[var(--muted-foreground)]">
                    {t.noAccountQuestion}{' '}
                    <Link href="/auth/register" className="font-bold text-[var(--primary)] underline-offset-4 hover:underline">{t.registerHere}</Link>
                </p>
            </AuthCard>
        </>
    );
}
