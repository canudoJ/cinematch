export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'cinematch_theme';

export const isTheme = (value: string): value is Theme => value === 'light' || value === 'dark';

/**
 * Se ejecuta en <head> antes del primer pintado para aplicar el tema guardado
 * sin parpadeo. Debe producir el mismo resultado que applyTheme().
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')==='light'?'light':'dark';document.documentElement.classList.add('theme-'+t);document.documentElement.style.colorScheme=t}catch(e){document.documentElement.classList.add('theme-dark')}`;

export function applyTheme(theme: Theme) {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme}`);
    root.style.colorScheme = theme;
}
