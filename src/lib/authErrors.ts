import type { Translations } from '@/i18n/es';

export type AuthErrorCode = 'invalid_credentials' | 'email_not_confirmed' | 'email_in_use' | 'weak_password' | 'rate_limit' | 'unknown';

/** Clasifica un error de Supabase Auth (por código o, en versiones antiguas, por mensaje) */
export function authErrorCode(error: unknown): AuthErrorCode {
    const { code, message, status } = (error ?? {}) as { code?: string; message?: string; status?: number };
    const text = `${code ?? ''} ${message ?? ''}`.toLowerCase();
    if (text.includes('invalid_credentials') || text.includes('invalid login credentials')) return 'invalid_credentials';
    if (text.includes('email_not_confirmed') || text.includes('email not confirmed')) return 'email_not_confirmed';
    if (text.includes('already') && (text.includes('registered') || text.includes('exists'))) return 'email_in_use';
    if (text.includes('weak_password') || text.includes('password should')) return 'weak_password';
    if (status === 429 || text.includes('rate limit') || text.includes('over_')) return 'rate_limit';
    return 'unknown';
}

/** Mensaje traducido para un error de autenticación */
export function authErrorMessage(error: unknown, t: Translations): string {
    return t[`authError_${authErrorCode(error)}`];
}
