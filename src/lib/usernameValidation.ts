import { supabase } from './supabase';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** Letras (con tildes), números, guion bajo y punto */
const USERNAME_RE = /^[\p{L}\p{N}_.]+$/u;

/** ¿Cumple el formato? (la BD exige al menos 3 caracteres) */
export function isValidUsername(username: string): boolean {
    const name = username.trim();
    return name.length >= USERNAME_MIN && name.length <= USERNAME_MAX && USERNAME_RE.test(name);
}

/**
 * ¿Está libre el nombre? Compara sin distinguir mayúsculas ("Javier" = "javier").
 * `excludeUserId` permite conservar el propio nombre al editar el perfil.
 * Ante un error de red devuelve false para no crear duplicados.
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const escaped = username.trim().replace(/[\\%_]/g, char => `\\${char}`);
    const { data, error } = await supabase.from('profiles').select('id').ilike('username', escaped).limit(2);
    if (error) {
        console.error('Error checking username availability:', error.message);
        return false;
    }
    return (data ?? []).every(row => row.id === excludeUserId);
}
