'use client';

import { useId, useState } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { safeRedirect } from '@/lib/safeRedirect';
import { ACCESS_API } from '@/lib/siteAccess';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthCard, AuthHeader, FormMessage, authFieldLabel } from '@/components/auth/AuthParts';

/** Pantalla de contraseña de la web privada (ver src/lib/siteAccess.ts) */
export default function AccessPage() {
    const { t } = useLanguage();
    const passwordId = useId();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);
        try {
            const res = await fetch(ACCESS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (!res.ok) {
                setErrorMsg(res.status === 401 ? t.accessWrongPassword : t.genericError);
                setLoading(false);
                return;
            }
            // Recarga completa: el servidor ya ve la cookie y deja pasar
            const next = new URLSearchParams(window.location.search).get('next');
            window.location.replace(safeRedirect(next));
        } catch {
            setErrorMsg(t.genericError);
            setLoading(false);
        }
    };

    return (
        <>
            <AuthHeader subtitle={t.accessSubtitle} />
            <AuthCard>
                {errorMsg && <FormMessage type="error">{errorMsg}</FormMessage>}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor={passwordId} className={authFieldLabel}>{t.accessPasswordLabel}</label>
                        <Input
                            id={passwordId}
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            autoFocus
                            required
                        />
                    </div>
                    <Button type="submit" size="lg" className="w-full" isLoading={loading} disabled={!password}>
                        {!loading && <Lock size={18} aria-hidden />}
                        {t.accessSubmit}
                    </Button>
                </form>
            </AuthCard>
        </>
    );
}
