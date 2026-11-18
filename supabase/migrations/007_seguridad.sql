-- =====================================================================
-- 007_seguridad.sql
-- Ejecutar en Supabase SQL Editor (aplicada en producción el 2026-11-18)
--
-- Cierra lo que se podía hacer con la clave pública o con una cuenta
-- cualquiera:
--   1. Funciones RPC que se podían llamar sin sesión.
--   2. Funciones que daban datos o permisos de otros usuarios.
--   3. Recuperación social rediseñada: iniciarla ya no revela si un correo
--      existe ni afecta a nadie, y cancelarla exige sesión.
--   4. Políticas RLS que dejaban saltarse las RPC (unirse a cualquier grupo,
--      autoaprobar contactos o recuperaciones, escribir como otro miembro).
--
-- Si creas una función nueva en public: Postgres la deja ejecutable por
-- anon. Si no es para la pantalla de login, haz
--   revoke execute on function ... from public, anon;
-- =====================================================================

begin;

-- ── 1. Funciones obsoletas o rotas ───────────────────────────────────
-- start_recovery_request: sin sesión creaba una solicitud y, por el
-- trigger de abajo, dejaba a la víctima invisible para su familia 48 h.
drop function if exists public.start_recovery_request(text, text);
-- approve_recovery_request: usaba columnas que ya no existen; la buena es
-- approve_recovery.
drop function if exists public.approve_recovery_request(uuid);
-- Ocultar la ubicación al *iniciar* una recuperación lo podía disparar
-- cualquiera contra cualquiera.
drop trigger if exists recovery_pauses_location on public.recovery_requests;
drop function if exists public.on_recovery_started();

-- ── 2. Recuperación social ───────────────────────────────────────────
-- Iniciar (sin sesión): misma respuesta exista o no la cuenta, no cancela
-- solicitudes ajenas y como mucho una solicitud por cuenta cada 24 h.
create or replace function public.create_recovery_request(p_email text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where email = lower(trim(p_email));

  if v_user is not null
     and not exists (select 1 from account_panic_locks
                     where user_id = v_user and locked_until > now())
     and not exists (select 1 from recovery_requests
                     where user_id = v_user
                       and (status in ('pending', 'approved')
                            or initiated_at > now() - interval '24 hours'))
     and (select count(*) from trusted_contacts
          where user_id = v_user and status = 'accepted') >= 3
  then
    insert into recovery_requests (user_id, required_approvals) values (v_user, 3);
  end if;

  return json_build_object('status', 'sent_if_exists', 'request_id', null);
end;
$$;

-- Cancelar: solo el dueño, con sesión. Bloquea nuevas solicitudes 7 días.
drop function if exists public.panic_cancel_recovery(text);
create function public.panic_cancel_recovery(p_email text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Por seguridad, inicia sesión para cancelar una recuperación. Si no recuerdas tu contraseña, restablécela con tu correo.';
  end if;

  update recovery_requests set status = 'cancelled', cancelled_by_user = true
  where user_id = v_user and status in ('pending', 'approved');

  insert into account_panic_locks (user_id, locked_until)
  values (v_user, now() + interval '7 days')
  on conflict (user_id) do update
    set locked_at = now(), locked_until = excluded.locked_until;

  return json_build_object('cancelled', true);
end;
$$;

-- Aprobar: solo un contacto *aceptado* y sobre una solicitud vigente.
create or replace function public.approve_recovery(p_request_id uuid, p_biometric_verified boolean)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_request recovery_requests%rowtype;
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  if not p_biometric_verified then raise exception 'Aprobación requiere biometría'; end if;

  select * into v_request from recovery_requests where id = p_request_id;
  if not found or v_request.status <> 'pending' or v_request.expires_at < now() then
    raise exception 'Solicitud no válida o ya procesada';
  end if;

  if not exists (
    select 1 from trusted_contacts
    where user_id = v_request.user_id and contact_id = v_user and status = 'accepted'
  ) then
    raise exception 'No eres contacto de confianza de este usuario';
  end if;

  insert into recovery_approvals (request_id, approver_id, biometric_verified)
  values (p_request_id, v_user, true)
  on conflict (request_id, approver_id) do nothing;

  return json_build_object('approved', true);
end;
$$;

-- ── 3. Funciones que daban datos de otros ────────────────────────────
-- Tokens push de los miembros de un grupo: solo si eres miembro.
create or replace function public.get_group_push_tokens(p_group_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not is_group_member(p_group_id) then return null; end if;
  return (
    select json_agg(pt.token)
    from push_tokens pt
    join group_members gm on gm.user_id = pt.user_id
    where gm.group_id = p_group_id and pt.user_id <> auth.uid()
  );
end;
$$;

-- Tokens push de tus contactos de confianza: solo los tuyos.
create or replace function public.get_trusted_contact_tokens(p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_user_id <> auth.uid() then return null; end if;
  return (
    select json_agg(pt.token)
    from push_tokens pt
    join trusted_contacts tc on tc.contact_id = pt.user_id
    where tc.user_id = p_user_id and tc.status = 'accepted'
  );
end;
$$;

-- Resolver un SOS: el dueño, alguien de su grupo o un contacto aceptado.
create or replace function public.resolve_sos_alert(p_alert_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'No autenticado'; end if;

  update sos_alerts s
  set resolved_at = now(), status = 'resolved', resolved_by = v_user
  where s.id = p_alert_id and s.resolved_at is null
    and (s.user_id = v_user
         or exists (select 1 from group_members gm
                    where gm.group_id = s.group_id and gm.user_id = v_user)
         or exists (select 1 from trusted_contacts tc
                    where tc.user_id = s.user_id and tc.contact_id = v_user
                      and tc.status = 'accepted'));

  return json_build_object('resolved', found);
end;
$$;

-- La app llama con p_contact_id; la función esperaba p_contact_user_id y
-- ninguna invitación llegaba a guardarse.
drop function if exists public.invite_trusted_contact(uuid);
create function public.invite_trusted_contact(p_contact_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  if v_user = p_contact_id then raise exception 'No puedes agregarte a ti mismo'; end if;
  if (select count(*) from trusted_contacts where user_id = v_user and status = 'accepted') >= 5 then
    raise exception 'Máximo 5 contactos de confianza';
  end if;
  insert into trusted_contacts (user_id, contact_id, status)
  values (v_user, p_contact_id, 'pending')
  on conflict (user_id, contact_id) do nothing;
  return json_build_object('invited', true);
end;
$$;

alter table public.trusted_contacts
  add constraint trusted_contacts_user_contact_key unique (user_id, contact_id);

-- ── 4. Quién puede ejecutar qué ──────────────────────────────────────
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- Sin sesión solo lo de la pantalla de recuperación, más los helpers que
-- usan las políticas RLS (solo miran auth.uid()).
grant execute on function public.create_recovery_request(text),
                          public.panic_cancel_recovery(text),
                          public.is_group_member(uuid),
                          public.is_group_admin(uuid)
  to anon;

-- Limpieza diaria: la corre pg_cron como postgres.
revoke execute on function public.cleanup_old_data() from authenticated;

-- search_path fijo en todas las funciones de public.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  loop
    execute format('alter function %s set search_path = public', f.sig);
  end loop;
end $$;

-- ── 5. Políticas RLS ─────────────────────────────────────────────────
-- users_share_group(a, b) acepta cualquier par de ids: fuera de anon, y
-- sus políticas pasan a ser solo para usuarios con sesión.
alter policy profiles_select_own on public.profiles to authenticated;
alter policy invisible_select_shared on public.invisible_mode to authenticated;
alter policy locations_select_shared on public.locations to authenticated;
alter policy sos_select_trusted_or_group on public.sos_alerts to authenticated;

-- Grupos: se entra solo con código (join_group_with_code) o creándolo
-- (create_group_with_invite). Antes cualquiera podía meterse, incluso como
-- owner, en un grupo ajeno.
drop policy if exists members_insert_self_or_admin on public.group_members;

-- Contactos de confianza: invitar y aceptar solo por RPC. Antes uno podía
-- insertarse contactos ya "accepted" y recibir sus tokens push.
drop policy if exists trusted_manage_own on public.trusted_contacts;
create policy trusted_delete_involved on public.trusted_contacts for delete to authenticated
  using (user_id = auth.uid() or contact_id = auth.uid());

-- Recuperación: el estado y las aprobaciones cambian solo por las RPC.
-- Antes un contacto podía marcar la solicitud como aprobada y cualquier
-- cuenta podía insertar aprobaciones.
drop policy if exists rr_insert on public.recovery_requests;
drop policy if exists rr_update on public.recovery_requests;
drop policy if exists recovery_update_panic on public.recovery_requests;
drop policy if exists rr_select on public.recovery_requests;
drop policy if exists recovery_select_involved on public.recovery_requests;
create policy recovery_select_involved on public.recovery_requests for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from trusted_contacts tc
    where tc.user_id = recovery_requests.user_id
      and tc.contact_id = auth.uid() and tc.status = 'accepted'));
drop policy if exists ra_insert on public.recovery_approvals;
drop policy if exists approvals_insert_trusted on public.recovery_approvals;

-- Zonas: crear solo en grupos propios (esta política lo saltaba).
drop policy if exists "usuario puede gestionar sus zonas" on public.geofences;

-- SOS: solo el dueño edita su alerta (el video). Resolver va por RPC.
drop policy if exists sos_update on public.sos_alerts;
drop policy if exists sos_update_own_or_trusted on public.sos_alerts;
create policy sos_update_own on public.sos_alerts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Chat y check-ins: leer si eres del grupo, escribir solo como tú mismo.
drop policy if exists "miembros del grupo pueden leer y escribir" on public.group_messages;
create policy group_messages_select_member on public.group_messages for select to authenticated
  using (is_group_member(group_id));
create policy group_messages_insert_own on public.group_messages for insert to authenticated
  with check (user_id = auth.uid() and is_group_member(group_id));
create policy group_messages_delete_own on public.group_messages for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "miembros del grupo pueden ver check-ins" on public.checkins;
create policy checkins_select_member on public.checkins for select to authenticated
  using (is_group_member(group_id));
create policy checkins_insert_own on public.checkins for insert to authenticated
  with check (user_id = auth.uid() and is_group_member(group_id));

commit;
