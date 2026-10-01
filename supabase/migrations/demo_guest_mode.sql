-- =============================================================================
-- Modo invitado + contenido de demostración
-- Ejecutar en Supabase → SQL Editor. Es idempotente: se puede ejecutar varias veces.
--
-- REQUISITO: existir una cuenta con username 'cinematch' (la cuenta oficial).
-- Créala desde la propia app (Registro) antes de ejecutar este script.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Barajas oficiales públicas (propiedad de la cuenta 'cinematch')
-- -----------------------------------------------------------------------------
do $$
declare
    official_id uuid;
    deck_id uuid;
    d record;
begin
    select id into official_id from public.profiles where username = 'cinematch';
    if official_id is null then
        raise exception 'No existe la cuenta oficial: regístrate en la app con el usuario "cinematch" y vuelve a ejecutar.';
    end if;

    -- Rehacer desde cero las barajas oficiales (deck_items se borran en cascada)
    delete from public.decks where user_id = official_id;

    for d in
        select * from (values
            (1, 'Clásicos que nunca fallan',
                'Para cuando nadie se pone de acuerdo: películas que gustan a todo el mundo.',
                array['Clásicos', 'Domingo'], 120,
                array['movie:238','movie:680','movie:13','movie:278','movie:105','movie:129','movie:496243','movie:157336']),
            (2, 'Noche de risas con amigos',
                'Comedias para ver en grupo, con palomitas y sin pensar demasiado.',
                array['Risas', 'Amigos'], 95,
                array['movie:8363','movie:120467','movie:546554','movie:808','movie:18785','movie:587792']),
            (3, 'Series para un maratón',
                'Temporadas que se ven en un fin de semana. Avisado quedas.',
                array['Maratón'], 88,
                array['tv:1396','tv:66732','tv:136315','tv:70523','tv:94605','tv:2316','tv:95396','tv:71446']),
            (4, 'Anime imprescindible',
                'De Ghibli a los shōnen modernos: la puerta de entrada al anime.',
                array['Anime', 'Fantasía'], 74,
                array['movie:372058','tv:1429','tv:31911','movie:128','tv:85937','tv:30991','movie:129']),
            (5, 'Para salir pensando',
                'Giros de guion, bucles temporales y finales que dan para una hora de charla.',
                array['Mind-bending', 'Sci-Fi'], 102,
                array['movie:27205','movie:77','movie:329865','movie:545611','movie:11324','movie:206487','tv:70523'])
        ) as t(ord, title, description, tags, views, items)
        order by ord
    loop
        insert into public.decks (user_id, title, description, tags, privacy, views)
        values (official_id, d.title, d.description, d.tags, 'public', d.views)
        returning id into deck_id;

        insert into public.deck_items (deck_id, movie_id, media_type)
        select deck_id, split_part(item, ':', 2)::int, split_part(item, ':', 1)
        from unnest(d.items) as item;
    end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Bienvenida a cada invitado: amistad con la cuenta oficial + un reto pendiente
--    Se dispara al crear un usuario anónimo (botón "Probar sin registrarse").
--    El nombre empieza por "zz_" para ejecutarse después de on_auth_user_created,
--    que es el trigger que crea el perfil.
-- -----------------------------------------------------------------------------
create or replace function public.welcome_guest_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    official_id uuid;
begin
    if not coalesce(new.is_anonymous, false) then
        return new;
    end if;

    select id into official_id from public.profiles where username = 'cinematch';
    if official_id is null then
        return new;
    end if;

    insert into public.friendships (requester_id, receiver_id, status)
    values (official_id, new.id, 'accepted');

    insert into public.challenges
        (sender_id, receiver_id, movie_id, movie_title, movie_image, movie_year, movie_rating, movie_type, status)
    values
        (official_id, new.id, 157336, 'Interstellar',
         'https://image.tmdb.org/t/p/w500/d1QKiYtceF3GDtxvTFXFAqwwah9.jpg', 2014, 8.4, 'movie', 'pending');

    return new;
exception when others then
    -- La bienvenida nunca debe impedir que el invitado entre
    return new;
end;
$$;

drop trigger if exists zz_on_guest_user_created on auth.users;
create trigger zz_on_guest_user_created
    after insert on auth.users
    for each row execute procedure public.welcome_guest_user();

-- -----------------------------------------------------------------------------
-- 3. Limpieza de invitados antiguos (opcional, ejecutar a mano cuando quieras)
--    Borra usuarios anónimos de más de 7 días; sus datos se eliminan en cascada.
-- -----------------------------------------------------------------------------
-- delete from auth.users
-- where is_anonymous is true
--   and created_at < now() - interval '7 days';
