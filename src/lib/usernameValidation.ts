import { supabase } from './supabase';

/**
 * Verifica si un nombre de usuario está disponible
 * @param username - El nombre de usuario a verificar
 * @param excludeUserId - ID de usuario a excluir de la verificación (útil al editar perfil)
 * @returns true si está disponible, false si ya está en uso
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    try {
        const query = supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        const { data, error } = await query;

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking username availability:', error);
            return false; // En caso de error, asumir que no está disponible para evitar duplicados
        }

        if (!data) return true; // No existe, está disponible

        // Si se proporciona excludeUserId y coincide, está disponible (es el mismo usuario)
        if (excludeUserId && data.id === excludeUserId) return true;

        return false; // Existe y no es el mismo usuario
    } catch (error) {
        console.error('Error in username validation:', error);
        return false;
    }
}
