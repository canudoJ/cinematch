'use client';

import React, { useId, useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { USERNAME_MAX, isUsernameAvailable, isValidUsername } from '@/lib/usernameValidation';

export function UsernameForm() {
    const { user, profile, updateProfile } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const inputId = useId();
    const hintId = useId();
    /** Borrador; mientras no se edita, refleja el nombre guardado */
    const [draft, setDraft] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const value = draft ?? profile?.username ?? '';
    const unchanged = value.trim() === (profile?.username ?? '');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || unchanged) return;
        const name = value.trim();
        if (!isValidUsername(name)) {
            showToast(t.usernameRules, 'error');
            return;
        }
        setSaving(true);
        try {
            if (!(await isUsernameAvailable(name, user.id))) {
                showToast(t.usernameTaken, 'error');
                return;
            }
            await updateProfile({ username: name });
            setDraft(null);
            showToast(t.usernameUpdated, 'success');
        } catch {
            showToast(t.genericError, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="section-card mb-10">
            <label htmlFor={inputId} className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-[var(--secondary)]">
                {t.usernameLabel}
            </label>
            <div className="flex gap-3">
                <Input
                    id={inputId}
                    value={value}
                    onChange={e => setDraft(e.target.value)}
                    maxLength={USERNAME_MAX}
                    placeholder={t.chooseName}
                    aria-describedby={hintId}
                    autoComplete="username"
                    className="flex-1"
                />
                <Button type="submit" variant="outline" size="icon-lg" disabled={unchanged} isLoading={saving} aria-label={t.saveUsername}>
                    <Save size={22} className="text-[var(--secondary)]" aria-hidden />
                </Button>
            </div>
            <p id={hintId} className="text-caption ml-1 mt-2">{t.usernameRules}</p>
        </form>
    );
}
