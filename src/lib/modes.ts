import { Flame, Heart, Layers, Swords, Target, type LucideIcon } from 'lucide-react';

/**
 * Identidad visual de cada modo: el mismo color e icono en el menú "Elige tu modo",
 * en el título de su pantalla y en la cabecera mientras se juega.
 */
export type AppMode = 'iceBreaker' | 'roulette' | 'challenge' | 'decks' | 'library';

export const MODES: Record<AppMode, { accent: string; icon: LucideIcon }> = {
    iceBreaker: { accent: 'var(--primary)', icon: Flame },
    roulette: { accent: 'var(--secondary)', icon: Target },
    challenge: { accent: 'var(--warning)', icon: Swords },
    decks: { accent: 'var(--accent-mid)', icon: Layers },
    library: { accent: 'var(--secondary)', icon: Heart },
};
