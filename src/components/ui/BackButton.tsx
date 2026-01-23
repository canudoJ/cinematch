'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

interface BackButtonProps {
    href?: string;
    fallback?: string;
    className?: string;
    onClick?: () => void;
}

export default function BackButton({ href, fallback = '/', className = '', onClick }: BackButtonProps) {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
        } else if (!href) {
            router.back();
        }
    };

    // Icon (Chevron Left)
    const icon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
        </svg>
    );

    const baseStyles = `
        flex items-center justify-center 
        w-10 h-10 rounded-full 
        bg-black/50 backdrop-blur-md 
        border border-white/10 
        text-white 
        hover:bg-white/10 hover:border-purple-500 hover:text-purple-400
        transition-all duration-300 ease-out
        cursor-pointer z-50
    `;

    if (href) {
        return (
            <Link href={href} className={`${baseStyles} ${className}`}>
                {icon}
            </Link>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={`${baseStyles} ${className}`}
            aria-label="Go back"
        >
            {icon}
        </button>
    );
}
