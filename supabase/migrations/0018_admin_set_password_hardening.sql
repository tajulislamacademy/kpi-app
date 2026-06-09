-- ============================================================================
-- Migration 0018 — Harden admin_set_password (BLOCKER B5)
-- ----------------------------------------------------------------------------
-- The function gated on is_admin_user() (ANY admin, incl. a limited admin with
-- no accounts.manage cap) and never protected the ROOT account — so a non-root
-- admin could reset the root admin's password and take over the system.
-- Now: require the accounts.manage capability, and refuse to reset a root
-- target unless the caller is themselves root.
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

create or replace function public.admin_set_password(p_profile_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_auth        uuid;
  v_target_root boolean;
  v_caller_root boolean;
begin
  if not public.has_cap('accounts.manage') then
    raise exception 'not authorized';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'password too short';
  end if;

  select auth_id, coalesce(is_root, false)
    into v_auth, v_target_root
    from public.profiles where id = p_profile_id;

  select coalesce(is_root, false) into v_caller_root
    from public.profiles where auth_id = auth.uid();

  if v_target_root and not coalesce(v_caller_root, false) then
    raise exception 'cannot reset the root admin password';
  end if;
  if v_auth is null then
    raise exception 'user has no login account';
  end if;

  update auth.users
    set encrypted_password = crypt(p_password, gen_salt('bf')),
        updated_at = now()
    where id = v_auth;
end;
$$;

-- ----------------------------------------------------------------------------
-- TEARDOWN: re-create with the is_admin_user() guard (see 0011) to revert.
-- ============================================================================
