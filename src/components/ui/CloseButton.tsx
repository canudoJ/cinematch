'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { iconButtonClass } from './iconButton';

interface CloseButtonProps {
    onClose: () => void;
    className?: string;
}

export default function CloseButton({ onClose, className = '' }: CloseButtonProps) {
    const { t } = useLanguage();
    return (
        <button type="button" onClick={onClose} className={`${iconButtonClass} ${className}`} aria-label={t.close}>
            <X size={22} aria-hidden />
        </button>
    );
}
