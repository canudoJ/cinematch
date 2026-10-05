-- =============================================================================
-- Revisión de calidad: ruleta multijugador, barajas y videoteca
-- Ejecutar en Supabase → SQL Editor. Idempotente: se puede ejecutar varias veces.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Ruleta: pertenencia a una sala sin recursión de RLS
--    Las políticas de roulette_lobbies y roulette_lobby_members se consultaban
--    entre sí (riesgo de "infinite recursion detected in policy"). Estas funciones
--    SECURITY DEFINER leen las tablas sin pasar por RLS.
-- -----------------------------------------------------------------------------
create or replace function public.is_lobby_member(p_lobby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.roulette_lobby_members
        where lobby_id = p_lobby_id and user_id = auth.uid()
    );
$$;

create or replace function public.is_lobby_host(p_lobby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.roulette_lobbies
        where id = p_lobby_id and host_id = auth.uid()
    );
$$;

-- Salas: las ve el anfitrión y cualquier miembro; solo el anfitrión las borra
drop policy if exists "roulette_lobbies_select_own" on public.roulette_lobbies;
create policy "roulette_lobbies_select_own"
    on public.roulette_lobbies for select
    using (host_id = auth.uid() or public.is_lobby_member(id));

drop policy if exists "roulette_lobbies_delete_host" on public.roulette_lobbies;
create policy "roulette_lobbies_delete_host"
    on public.roulette_lobbies for delete
    using (host_id = auth.uid());

-- Miembros: cada miembro ve a todos los de su sala (antes un invitado no veía al anfitrión)
alter table public.roulette_lobby_members enable row level security;
drop policy if exists "roulette_members_select_own_lobbies" on public.roulette_lobby_members;
create policy "roulette_members_select_own_lobbies"
    on public.roulette_lobby_members for select
    using (user_id = auth.uid() or public.is_lobby_member(lobby_id) or public.is_lobby_host(lobby_id));

-- Votos: solo los miembros votan; el anfitrión ve todos y puede borrarlos al reiniciar ronda
alter table public.roulette_votes enable row level security;
drop policy if exists "roulette_votes_select_own_or_host" on public.roulette_votes;
create policy "roulette_votes_select_own_or_host"
    on public.roulette_votes for select
    using (user_id = auth.uid() or public.is_lobby_host(lobby_id));

drop policy if exists "roulette_votes_insert_self" on public.roulette_votes;
create policy "roulette_votes_insert_self"
    on public.roulette_votes for insert
    with check (user_id = auth.uid() and public.is_lobby_member(lobby_id));

drop policy if exists "roulette_votes_delete_host" on public.roulette_votes;
create policy "roulette_votes_delete_host"
    on public.roulette_votes for delete
    using (public.is_lobby_host(lobby_id));

-- Unirse por código: el usuario aún no es miembro, así que no puede leer la sala por RLS.
-- Esta función valida el código, le añade como invitado y devuelve el id de la sala.
create or replace function public.join_lobby_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_lobby_id uuid;
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;

    select id into v_lobby_id
    from public.roulette_lobbies
    where code = upper(trim(p_code)) and status = 'waiting';

    if v_lobby_id is null then
        return null;
    end if;

    insert into public.roulette_lobby_members (lobby_id, user_id, role)
    values (v_lobby_id, auth.uid(), 'guest')
    on conflict (lobby_id, user_id) do nothing;

    return v_lobby_id;
end;
$$;

grant execute on function public.join_lobby_by_code(text) to authenticated;

-- Realtime: la ruleta depende de recibir los cambios de estas tablas
do $$
declare
    t text;
begin
    foreach t in array array['roulette_lobbies', 'roulette_lobby_members', 'roulette_invitations'] loop
        if not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
        ) then
            execute format('alter publication supabase_realtime add table public.%I', t);
        end if;
    end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Videoteca: permitir actualizar los datos de una película guardada
--    (plataformas y enlaces que se completan después de dar like)
-- -----------------------------------------------------------------------------
drop policy if exists "Users can update their own library" on public.user_library;
create policy "Users can update their own library"
    on public.user_library for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. Barajas: contar visitas también de visitantes sin sesión
-- -----------------------------------------------------------------------------
create or replace function public.increment_deck_views(deck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.decks
    set views = coalesce(views, 0) + 1
    where id = deck_id and privacy = 'public';
end;
$$;

grant execute on function public.increment_deck_views(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Nombres de usuario únicos sin distinguir mayúsculas ("Javier" = "javier")
-- -----------------------------------------------------------------------------
do $$
begin
    if exists (
        select lower(username) from public.profiles
        where username is not null
        group by lower(username) having count(*) > 1
    ) then
        raise notice 'Hay nombres de usuario duplicados (sin distinguir mayúsculas); el índice no se ha creado.';
    else
        create unique index if not exists profiles_username_lower_key
            on public.profiles (lower(username));
    end if;
end $$;
