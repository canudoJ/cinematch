import { createBrowserClient } from '@/utils/supabase/client';

// Singleton instance for client-side usage
export const supabase = createBrowserClient();

// Types for easier debugging/usage (Optional, can be expanded based on generated types)
export type Profile = {
    id: string;
    username: string;
    avatar_url: string | null;
    level: number;
    is_premium: boolean;
};
