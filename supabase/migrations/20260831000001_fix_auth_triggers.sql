-- Fix sign-up infinite recursion (profiles <-> users sync) that caused
-- "Database error saving new user" for virtual-email flow (username@wordhunt.internal)
-- and ensure both tables are populated on auth.users insert.

create or replace function public.sync_profiles_to_users()
returns trigger as $$
begin
  if pg_trigger_depth() > 2 then
    return new;
  end if;
  insert into public.users (id, username)
  values (new.id, new.username)
  on conflict (id) do update set username = excluded.username;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.sync_users_to_profiles()
returns trigger as $$
begin
  if pg_trigger_depth() > 2 then
    return new;
  end if;
  insert into public.profiles (id, username)
  values (new.id, new.username)
  on conflict (id) do update set username = excluded.username;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username',''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  insert into public.users (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username',''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
