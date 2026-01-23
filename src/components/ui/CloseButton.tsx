'use client';

import React from 'react';

interface CloseButtonProps {
    onClose: () => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function CloseButton({ onClose, className = '', size = 'md' }: CloseButtonProps) {
    const sizeClasses = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl'
    };

    return (
        <button
            onClick={onClose}
            className={`absolute top-4 right-4 bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 hover:border-purple-500 hover:text-purple-400 transition-all duration-300 ease-out cursor-pointer z-50 rounded-full w-10 h-10 flex items-center justify-center ${sizeClasses[size]} ${className}`}
            aria-label="Cerrar"
        >
            ×
        </button>
    );
}
