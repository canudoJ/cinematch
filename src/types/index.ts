export type Profile = {
    id: string;
    username: string | null;
    avatar_url: string | null;
    level: number;
    is_premium: boolean;
    updated_at?: string;
};

export type UserSession = {
    id: string;
    email?: string;
};
