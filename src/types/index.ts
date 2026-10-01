export type Profile = {
    id: string;
    username: string | null;
    avatar_url: string | null;
    level: number;
    is_premium: boolean;
    // Preferencias persistidas en DB
    preferred_genres?: string[] | null;
    preferred_platforms?: string[] | null;
    preferred_content_types?: string[] | null;
    updated_at?: string;
};

export type UserSession = {
    id: string;
    email?: string;
};
