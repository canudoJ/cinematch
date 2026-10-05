import { THEME_INIT_SCRIPT, applyTheme, isTheme } from '../theme';
import { friendErrorMessage } from '../friendErrors';
import { FriendshipError } from '@/context/FriendsContext';
import { es } from '@/i18n/es';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('tema', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        localStorage.clear();
    });

    it('applyTheme deja una sola clase de tema en <html>', () => {
        applyTheme('light');
        applyTheme('dark');
        expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
        expect(document.documentElement.classList.contains('theme-light')).toBe(false);
        expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('el script previo al pintado aplica el tema guardado', () => {
        localStorage.setItem('cinematch_theme', 'light');
        new Function(THEME_INIT_SCRIPT)();
        expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });

    it('isTheme valida los valores guardados', () => {
        expect(isTheme('light')).toBe(true);
        expect(isTheme('purple')).toBe(false);
    });
});

describe('errores de amistad', () => {
    it('traduce el código del error', () => {
        expect(friendErrorMessage(new FriendshipError('already_friends'), es)).toBe(es.friendError_already_friends);
    });

    it('cualquier otro error da el mensaje genérico', () => {
        expect(friendErrorMessage(new Error('x'), es)).toBe(es.friendError_unknown);
    });
});
