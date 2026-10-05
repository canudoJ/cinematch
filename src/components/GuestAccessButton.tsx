'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

interface GuestAccessButtonProps {
    /** Ruta a la que ir tras entrar como invitado */
    redirectTo?: string;
    variant?: ButtonProps['variant'];
    className?: string;
}

/**
 * Entra en la app con una cuenta de invitado (usuario anónimo de Supabase),
 * sin pedir email ni contraseña.
 */
export function GuestAccessButton({ redirectTo = '/', variant = 'outline', className }: GuestAccessButtonProps) {
    const { signInAsGuest, isGuest } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            await signInAsGuest();
            if (!isGuest) showToast(t.guestWelcome, 'success');
            router.push(redirectTo);
            router.refresh();
        } catch {
            showToast(t.guestFailed, 'error');
            setLoading(false);
        }
    };

    return (
        <Button type="button" variant={variant} size="lg" isLoading={loading} onClick={handleClick} className={className}>
            {!loading && <Sparkles size={18} aria-hidden />}
            {isGuest ? t.continueAsGuest : t.tryAsGuest}
        </Button>
    );
}
