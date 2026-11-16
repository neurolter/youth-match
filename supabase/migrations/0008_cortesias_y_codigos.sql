-- Premium de cortesía (dado por el admin) y códigos promocionales para probadores.

-- Códigos promocionales
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 3 and 40),
  days int not null check (days between 1 and 730),
  max_uses int check (max_uses is null or max_uses > 0),
  uses int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
drop policy if exists "codigos: admin" on public.promo_codes;
create policy "codigos: admin" on public.promo_codes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create table if not exists public.promo_redemptions (
  code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code_id, user_id)
);
create index if not exists promo_redemptions_user_idx on public.promo_redemptions (user_id);
alter table public.promo_redemptions enable row level security;
drop policy if exists "canjes: admin" on public.promo_redemptions;
create policy "canjes: admin" on public.promo_redemptions for select to authenticated
  using ((select public.is_admin()));

-- Extiende (o crea) el Premium de cortesía de un usuario. Uso interno.
create or replace function public.extend_courtesy_premium(uid uuid, days int, source text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  current_end timestamptz;
  new_end timestamptz;
begin
  select max(current_period_end) into current_end from public.subscriptions
   where user_id = uid and plan_id <> 'gratis' and status in ('activa', 'prueba');
  new_end := greatest(coalesce(current_end, now()), now()) + make_interval(days => days);

  update public.subscriptions set status = 'expirada'
   where user_id = uid and provider in ('cortesia', 'codigo') and status in ('activa', 'prueba');

  insert into public.subscriptions (user_id, plan_id, status, provider, current_period_end)
  values (uid, 'premium_mensual', 'prueba', source, new_end);
  return new_end;
end $$;
revoke execute on function public.extend_courtesy_premium(uuid, int, text) from public, anon, authenticated;

-- Canjear un código (lo usa el propio usuario desde /planes)
create or replace function public.redeem_promo_code(input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c public.promo_codes;
  until timestamptz;
begin
  if uid is null then return jsonb_build_object('ok', false, 'message', 'Inicia sesión para canjear tu código.'); end if;

  select * into c from public.promo_codes where code = upper(trim(input)) for update;
  if not found or not c.active then
    return jsonb_build_object('ok', false, 'message', 'Ese código no existe o ya no está activo.');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('ok', false, 'message', 'Ese código ya venció.');
  end if;
  if c.max_uses is not null and c.uses >= c.max_uses then
    return jsonb_build_object('ok', false, 'message', 'Ese código ya alcanzó su límite de usos.');
  end if;
  if exists (select 1 from public.promo_redemptions where code_id = c.id and user_id = uid) then
    return jsonb_build_object('ok', false, 'message', 'Ya usaste este código.');
  end if;

  insert into public.promo_redemptions (code_id, user_id) values (c.id, uid);
  update public.promo_codes set uses = uses + 1 where id = c.id;
  until := public.extend_courtesy_premium(uid, c.days, 'codigo');
  return jsonb_build_object('ok', true, 'until', until, 'days', c.days);
end $$;
revoke execute on function public.redeem_promo_code(text) from public, anon;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- Admin: lista de usuarios con su correo y estado Premium
create or replace function public.admin_users()
returns table (
  id uuid, email text, full_name text, country text, role text, onboarded boolean,
  created_at timestamptz, last_sign_in_at timestamptz,
  premium_until timestamptz, premium_source text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.country, p.role, p.onboarded,
           u.created_at, u.last_sign_in_at, s.current_period_end, s.provider
      from public.profiles p
      join auth.users u on u.id = p.id
      left join lateral (
        select x.current_period_end, x.provider from public.subscriptions x
         where x.user_id = p.id and x.plan_id <> 'gratis' and x.status in ('activa', 'prueba')
           and (x.current_period_end is null or x.current_period_end > now())
         order by x.current_period_end desc nulls first limit 1
      ) s on true
     order by u.created_at desc;
end $$;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- Admin: dar Premium de cortesía (días > 0) o quitarlo (días = 0)
create or replace function public.admin_set_premium(uid uuid, days int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  if days <= 0 then
    update public.subscriptions set status = 'cancelada'
     where user_id = uid and provider in ('cortesia', 'codigo') and status in ('activa', 'prueba');
    return null;
  end if;
  return public.extend_courtesy_premium(uid, days, 'cortesia');
end $$;
revoke execute on function public.admin_set_premium(uuid, int) from public, anon;
grant execute on function public.admin_set_premium(uuid, int) to authenticated;
