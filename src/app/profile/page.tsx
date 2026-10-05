'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Layers, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useUser } from '@/context/UserContext';
import { useDecks } from '@/context/DeckContext';
import { useFriends } from '@/context/FriendsContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import BackButton from '@/components/ui/BackButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { UsernameForm } from '@/components/profile/UsernameForm';
import { FriendsPanel } from '@/components/profile/FriendsPanel';
import type { AppLanguage } from '@/types';
import type { Theme } from '@/lib/theme';
import { Button, buttonVariants } from '@/components/ui/Button';

export default function ProfilePage() {
    const { isGuest, signOut } = useAuth();
    const { likedContent } = useUser();
    const { decks } = useDecks();
    const { friends } = useFriends();
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const confirm = useConfirm();
    const { showToast } = useToast();

    const stats = [
        { label: t.statsLiked, value: likedContent.length, icon: Heart, href: '/?open=library' },
        { label: t.statsDecks, value: decks.length, icon: Layers, href: '/?open=decks' },
        { label: t.statsFriends, value: friends.length, icon: Users, href: null },
    ];

    const handleSignOut = async () => {
        // Un invitado pierde sus datos al salir: se le avisa antes
        if (isGuest && !(await confirm({ title: t.guestSignOutTitle, message: t.guestSignOutBody, destructive: true, confirmLabel: t.signOut }))) return;
        try {
            await signOut();
        } catch {
            showToast(t.genericError, 'error');
        }
    };

    return (
        <main className="relative flex-1 overflow-y-auto bg-[var(--background)] p-6 pb-24 pt-12 text-[var(--foreground)]">
            <BackButton href="/" className="absolute left-8 top-12" />

            <div className="relative mx-auto max-w-xl animate-fade-in">
                <h1 className="title-page mb-10 text-center">{t.profile}</h1>

                <AvatarUploader />

                {isGuest && (
                    <div className="section-card mb-10 border-[color-mix(in_srgb,var(--secondary)_40%,transparent)]">
                        <p className="mb-1 font-bold">{t.guestAccountTitle}</p>
                        <p className="mb-4 text-sm text-[var(--muted-foreground)]">{t.guestAccountBody}</p>
                        <Link href="/auth/register" className={buttonVariants({ size: 'md', className: 'w-full sm:w-auto' })}>
                            {t.createAccountKeepData}
                        </Link>
                    </div>
                )}

                <UsernameForm />

                <section className="section-card mb-10" aria-labelledby="activity-heading">
                    <h2 id="activity-heading" className="eyebrow mb-4 text-[var(--secondary)]">{t.yourActivity}</h2>
                    <ul className="grid grid-cols-3 gap-3 text-center">
                        {stats.map(({ label, value, icon: Icon, href }) => {
                            const content = (
                                <>
                                    <Icon size={20} className="mx-auto mb-1 text-[var(--secondary)]" aria-hidden />
                                    <span className="block text-3xl font-black tabular-nums">{value}</span>
                                    <span className="text-caption block">{label}</span>
                                </>
                            );
                            return (
                                <li key={label}>
                                    {href ? (
                                        <Link href={href} className="block rounded-xl p-2 transition-colors hover:bg-[var(--surface-raised)]">{content}</Link>
                                    ) : (
                                        <div className="rounded-xl p-2">{content}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <FriendsPanel />

                <section className="section-card mb-10 space-y-6" aria-label={t.preferencesTitle}>
                    <div>
                        <h2 className="title-section mb-3">{t.language}</h2>
                        <SegmentedControl<AppLanguage>
                            label={t.language}
                            value={language}
                            onChange={setLanguage}
                            options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]}
                        />
                    </div>
                    <div>
                        <h2 className="title-section mb-3">{t.theme}</h2>
                        <SegmentedControl<Theme>
                            label={t.theme}
                            value={theme}
                            onChange={setTheme}
                            options={[{ value: 'light', label: t.lightMode }, { value: 'dark', label: t.darkMode }]}
                        />
                    </div>
                </section>

                <Button variant="danger" size="lg" onClick={() => void handleSignOut()} className="w-full">
                    <LogOut size={18} aria-hidden /> {t.signOut}
                </Button>
            </div>
        </main>
    );
}
