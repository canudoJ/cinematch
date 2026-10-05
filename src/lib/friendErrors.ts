import { FriendshipError, type FriendshipErrorCode } from '@/context/FriendsContext';
import type { Translations } from '@/i18n/es';

/** Mensaje traducido para un error de amistad (o el genérico si es otro tipo de error) */
export function friendErrorMessage(error: unknown, t: Translations): string {
    const code: FriendshipErrorCode = error instanceof FriendshipError ? error.code : 'unknown';
    return t[`friendError_${code}`];
}
