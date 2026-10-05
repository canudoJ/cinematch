'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { authErrorMessage } from '@/lib/authErrors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthCard, FormMessage, authFieldLabel } from '@/components/auth/AuthParts';

export default function ResetPasswordPage() {
    const { t } = useLanguage();
    const emailId = useId();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/auth/reset-confirm`,
        });
        setLoading(false);
        if (error) setErrorMsg(authErrorMessage(error, t));
        else setSent(true);
    };

    return (
        <>
            <Link href="/auth/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
                <ArrowLeft size={18} aria-hidden /> {t.backToLogin}
            </Link>
            <div className="mb-10 text-center">
                <h1 className="title-page mb-2">{t.resetPassword}</h1>
                <p className="font-medium text-[var(--muted-foreground)]">{t.resetPasswordIntro}</p>
            </div>
            <AuthCard>
                {sent ? (
                    <div className="py-6 text-center" role="status">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary-soft)]">
                            <CheckCircle size={32} className="text-[var(--secondary)]" aria-hidden />
                        </div>
                        <h2 className="title-section mb-2">{t.resetLinkSentTitle}</h2>
                        <p className="mb-6 text-[var(--muted-foreground)]">{t.resetLinkSentBody}</p>
                        <Link href="/auth/login" className="font-medium text-[var(--secondary)] hover:underline">{t.backToLogin}</Link>
                    </div>
                ) : (
                    <>
                        {errorMsg && <FormMessage type="error">{errorMsg}</FormMessage>}
                        <form onSubmit={handleReset} className="space-y-5">
                            <div className="space-y-1">
                                <label htmlFor={emailId} className={authFieldLabel}>{t.emailLabel}</label>
                                <Input id={emailId} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} required />
                            </div>
                            <Button type="submit" isLoading={loading} className="mt-6 w-full">{t.sendResetLink}</Button>
                        </form>
                    </>
                )}
            </AuthCard>
        </>
    );
}
