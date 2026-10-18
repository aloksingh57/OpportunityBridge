create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  role text not null default 'student'
    check (role in ('student', 'job-seeker', 'founder', 'investor', 'mentor', 'advisor', 'recruiter')),
  location text not null default 'Not provided'
    check (char_length(location) between 2 and 100),
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'name', ''));
  requested_location text := pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'location', ''));
begin
  insert into public.profiles (id, name, role, location)
  values (
    new.id,
    case
      when pg_catalog.char_length(requested_name) between 2 and 80 then requested_name
      else 'New member'
    end,
    'student',
    case
      when pg_catalog.char_length(requested_location) between 2 and 100 then requested_location
      else 'Not provided'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
