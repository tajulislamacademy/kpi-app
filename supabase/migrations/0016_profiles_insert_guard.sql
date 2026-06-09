-- ============================================================================
-- Migration 0016 — Close the profiles privilege-escalation hole (BLOCKER B1)
-- ----------------------------------------------------------------------------
-- protect_root_admin() was a BEFORE UPDATE trigger only. The profiles write
-- policy is broad (is_admin_user()), so ANY promoted limited admin could INSERT
-- a brand-new profiles row with role='admin' / is_admin=true / permissions=ALL
-- (the trigger never fired on INSERT) and self-promote by proxy with no
-- admins.manage capability. This makes the trigger fire on INSERT *and* UPDATE
-- and rejects privileged INSERTs from callers lacking admins.manage.
--
-- Idempotent. Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

create or replace function public.protect_root_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- Creating an elevated account requires admins.manage. (Root bootstrap is
    -- done out-of-band / by an existing root, which holds the cap.)
    if (new.is_admin
        or new.role = 'admin'
        or new.is_root
        or coalesce(array_length(new.permissions, 1), 0) > 0)
       and not public.has_cap('admins.manage') then
      raise exception 'not authorized to create privileged accounts';
    end if;
    return new;
  end if;

  -- UPDATE path (unchanged behavior from 0013).
  if old.is_root then
    new.role := 'admin';      -- root is always a full admin
    new.is_root := true;      -- and can't be un-rooted
  end if;
  if (new.is_admin    is distinct from old.is_admin
      or new.permissions is distinct from old.permissions
      or new.role        is distinct from old.role
      or new.is_root     is distinct from old.is_root)
     and not public.has_cap('admins.manage') then
    raise exception 'not authorized to change admin privileges';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_root_admin on public.profiles;
create trigger trg_protect_root_admin
  before insert or update on public.profiles
  for each row execute function public.protect_root_admin();

-- ----------------------------------------------------------------------------
-- TEARDOWN: re-create the function as BEFORE UPDATE only (see 0013).
-- ============================================================================
