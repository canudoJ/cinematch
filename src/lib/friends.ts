import { supabase } from '@/lib/supabase';
import type { FriendshipRow, ProfileSummary } from '@/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida un UUID antes de interpolarlo en un filtro .or() de PostgREST */
export function assertUuid(value: string): string {
    if (!UUID_RE.test(value)) throw new Error(`Invalid id: ${value}`);
    return value;
}

/** IDs de los amigos aceptados de un usuario */
export async function getFriendIds(userId: string): Promise<string[]> {
    const id = assertUuid(userId);
    const { data, error } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id')
        .or(`requester_id.eq.${id},receiver_id.eq.${id}`)
        .eq('status', 'accepted');
    if (error) {
        console.error('Error loading friend ids:', error.message);
        return [];
    }
    return (data as Pick<FriendshipRow, 'requester_id' | 'receiver_id'>[]).map(f =>
        f.requester_id === id ? f.receiver_id : f.requester_id,
    );
}

/** Filas de amistad entre dos usuarios, en cualquier dirección y estado */
export async function getFriendshipsBetween(a: string, b: string): Promise<FriendshipRow[]> {
    const x = assertUuid(a);
    const y = assertUuid(b);
    const { data, error } = await supabase
        .from('friendships')
        .select('id, requester_id, receiver_id, status, created_at')
        .or(`and(requester_id.eq.${x},receiver_id.eq.${y}),and(requester_id.eq.${y},receiver_id.eq.${x})`);
    if (error) throw error;
    return (data ?? []) as FriendshipRow[];
}

/** Perfiles resumidos indexados por id */
export async function fetchProfilesMap(ids: string[]): Promise<Map<string, ProfileSummary>> {
    const unique = [...new Set(ids)].filter(Boolean);
    const map = new Map<string, ProfileSummary>();
    if (unique.length === 0) return map;
    const { data, error } = await supabase.from('profiles').select('id, username, avatar_url').in('id', unique);
    if (error) console.error('Error loading profiles:', error.message);
    (data as ProfileSummary[] | null)?.forEach(p => map.set(p.id, p));
    return map;
}
