/** Estilo compartido de los botones circulares de icono (volver, cerrar, compartir, reiniciar…) */
export const iconButtonClass = [
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
    'border-2 border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-raised)_85%,transparent)] backdrop-blur-md',
    'text-[var(--foreground)] shadow-[var(--shadow-lg)] transition-all duration-200 ease-out',
    'hover:border-[var(--secondary)] hover:text-[var(--secondary)] active:scale-95',
].join(' ');
