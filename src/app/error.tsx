'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Button, buttonVariants } from '@/components/ui/Button';

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

/** Error de una página: pantalla amigable en lugar de una página en blanco */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
    const { t } = useLanguage();

    useEffect(() => {
        console.error('App error boundary:', error);
    }, [error]);

    return (
        <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
            <div role="alert" className="w-full max-w-md rounded-3xl border border-[color-mix(in_srgb,var(--secondary)_60%,transparent)] bg-[var(--card)] p-6 text-center shadow-[var(--shadow-neon-cyan)]">
                <h1 className="title-section mb-3 text-[var(--secondary)]">{t.errorTitle}</h1>
                <p className="mb-5 text-sm text-[var(--muted-foreground)]">{t.errorBody}</p>
                <div className="flex flex-col gap-3">
                    <Button onClick={reset} className="w-full">{t.retry}</Button>
                    <Link href="/" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>{t.goHomeButton}</Link>
                </div>
                {error.digest && <p className="mt-4 text-caption font-mono">{t.errorCode(error.digest)}</p>}
            </div>
        </div>
    );
}
