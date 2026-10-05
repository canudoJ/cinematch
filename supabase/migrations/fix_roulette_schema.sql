-- Schema for CineRuleta multiplayer lobbies & invitations
-- This file is intended to be run in your Supabase project.

-- 1) Main lobby table -------------------------------------------------------
create table if not exists public.roulette_lobbies (
    id uuid primary key default gen_random_uuid(),
    code text unique not null, -- short human‑friendly code (e.g. 1ZJN)
    host_id uuid not null references public.profiles (id) on delete cascade,
    config jsonb not null,      -- stores RouletteConfig (mediaType, sourceType, sourceValue, providers, minRating, randomPage, etc.)
    status text not null default 'waiting', -- waiting | in_progress | finished
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists roulette_lobbies_code_idx on public.roulette_lobbies (code);

-- 2) Lobby members ----------------------------------------------------------
create table if not exists public.roulette_lobby_members (
    id uuid primary key default gen_random_uuid(),
    lobby_id uuid not null references public.roulette_lobbies (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role text not null default 'guest', -- host | guest
    joined_at timestamptz not null default now(),
    unique (lobby_id, user_id)
);

create index if not exists roulette_lobby_members_lobby_idx on public.roulette_lobby_members (lobby_id);
create index if not exists roulette_lobby_members_user_idx on public.roulette_lobby_members (user_id);

-- 3) Invitations ------------------------------------------------------------
create table if not exists public.roulette_invitations (
    id uuid primary key default gen_random_uuid(),
    lobby_id uuid not null references public.roulette_lobbies (id) on delete cascade,
    sender_id uuid not null references public.profiles (id) on delete cascade,
    receiver_id uuid not null references public.profiles (id) on delete cascade,
    status text not null default 'pending', -- pending | accepted | declined | expired
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists roulette_invitations_receiver_idx on public.roulette_invitations (receiver_id);
create index if not exists roulette_invitations_lobby_idx on public.roulette_invitations (lobby_id);

-- 4) Votes (swipes) ---------------------------------------------------------
create table if not exists public.roulette_votes (
    id uuid primary key default gen_random_uuid(),
    lobby_id uuid not null references public.roulette_lobbies (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    movie_id text not null,
    vote text not null check (vote in ('like', 'skip')),
    created_at timestamptz not null default now(),
    unique (lobby_id, user_id, movie_id)
);

create index if not exists roulette_votes_lobby_idx on public.roulette_votes (lobby_id);
create index if not exists roulette_votes_user_idx on public.roulette_votes (user_id);

alter table public.roulette_lobbies enable row level security;
alter table public.roulette_lobby_members enable row level security;
alter table public.roulette_invitations enable row level security;
alter table public.roulette_votes enable row level security;

-- Policies for roulette_lobbies
create policy "roulette_lobbies_select_own"
    on public.roulette_lobbies
    for select
    using (
        auth.uid() = host_id
        or exists (
            select 1 from public.roulette_lobby_members m
            where m.lobby_id = roulette_lobbies.id
              and m.user_id = auth.uid()
        )
    );

create policy "roulette_lobbies_insert_host"
    on public.roulette_lobbies
    for insert
    with check (auth.uid() = host_id);

create policy "roulette_lobbies_update_host"
    on public.roulette_lobbies
    for update
    using (auth.uid() = host_id);

-- Policies for roulette_lobby_members
create policy "roulette_members_select_own_lobbies"
    on public.roulette_lobby_members
    for select
    using (
        user_id = auth.uid()
        or exists (
            select 1 from public.roulette_lobbies l
            where l.id = lobby_id
              and l.host_id = auth.uid()
        )
    );

create policy "roulette_members_insert_self"
    on public.roulette_lobby_members
    for insert
    with check (user_id = auth.uid());

create policy "roulette_members_delete_self"
    on public.roulette_lobby_members
    for delete
    using (user_id = auth.uid());

-- Policies for roulette_invitations
create policy "roulette_inv_select_sender_or_receiver"
    on public.roulette_invitations
    for select
    using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "roulette_inv_insert_sender"
    on public.roulette_invitations
    for insert
    with check (sender_id = auth.uid());

create policy "roulette_inv_update_receiver"
    on public.roulette_invitations
    for update
    using (receiver_id = auth.uid());

-- Policies for roulette_votes
create policy "roulette_votes_select_own_or_host"
    on public.roulette_votes
    for select
    using (
        user_id = auth.uid()
        or exists (
            select 1 from public.roulette_lobbies l
            where l.id = lobby_id
              and l.host_id = auth.uid()
        )
    );

create policy "roulette_votes_insert_self"
    on public.roulette_votes
    for insert
    with check (user_id = auth.uid());

create policy "roulette_votes_update_self"
    on public.roulette_votes
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

