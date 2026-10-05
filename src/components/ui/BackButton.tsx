'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { iconButtonClass } from './iconButton';

interface BackButtonProps {
    /** Destino fijo; sin él, vuelve a la página anterior (o ejecuta onClick) */
    href?: string;
    className?: string;
    onClick?: () => void;
}

export default function BackButton({ href, className = '', onClick }: BackButtonProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const classes = `${iconButtonClass} ${className}`;
    const icon = <ChevronLeft size={24} aria-hidden />;

    if (href) {
        return (
            <Link href={href} className={classes} aria-label={t.back}>
                {icon}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={e => {
                e.stopPropagation();
                if (onClick) onClick();
                else router.back();
            }}
            className={classes}
            aria-label={t.back}
        >
            {icon}
        </button>
    );
}
