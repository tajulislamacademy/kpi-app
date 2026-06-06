-- ============================================================================
-- Migration 0007 — admin password reset (SQL, no service_role/Edge Function)
-- Lets an admin set/reset the login password of any user that has an auth
-- account. SECURITY DEFINER runs as the function owner so it can write auth.users;
-- the body enforces admin-only. Uses pgcrypto bcrypt, which GoTrue accepts.
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

create or replace function public.admin_set_password(p_profile_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_auth uuid;
begin
  if public.my_role() <> 'admin' then
    raise exception 'not authorized';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'password too short';
  end if;
  select auth_id into v_auth from public.profiles where id = p_profile_id;
  if v_auth is null then
    raise exception 'user has no login account';
  end if;
  update auth.users
    set encrypted_password = crypt(p_password, gen_salt('bf')),
        updated_at = now()
    where id = v_auth;
end;
$$;

-- Only logged-in users can call it; the body further restricts to admins.
revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
