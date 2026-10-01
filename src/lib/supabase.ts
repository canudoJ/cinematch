import { createBrowserClient } from '@/utils/supabase/client';

// Singleton instance for client-side usage
export const supabase = createBrowserClient();

// Re-export Profile from the single source of truth
export type { Profile } from '@/types/index';
