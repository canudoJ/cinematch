import { createBrowserClient } from '@/utils/supabase/client';

/** Cliente Supabase del navegador (singleton): usarlo siempre en lugar de crear otro */
export const supabase = createBrowserClient();
