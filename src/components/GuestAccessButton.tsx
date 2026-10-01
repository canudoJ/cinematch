'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { Button, type ButtonProps } from '@/components/ui/Button';

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
    const { signInAsGuest } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            await signInAsGuest();
            showToast('Estás usando CineMatch como invitado', 'success');
            router.push(redirectTo);
            router.refresh();
        } catch {
            showToast('No se pudo entrar como invitado. Inténtalo de nuevo.', 'error');
            setLoading(false);
        }
    };

    return (
        <Button type="button" variant={variant} size="lg" isLoading={loading} onClick={handleClick} className={className}>
            {!loading && <Sparkles size={18} aria-hidden />}
            Probar sin registrarse
        </Button>
    );
}
