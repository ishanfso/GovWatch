-- GovWatch Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query → Run

-- 1. User profiles (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  city text default 'Bangalore',
  role text default 'viewer',
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Shared issue state (one row per issue, visible to all logged-in users)
create table if not exists public.issue_actions (
  issue_id text primary key,
  status text default 'open',
  assigned_to jsonb,
  notes text,
  updated_by_email text,
  updated_at timestamptz default now()
);

-- 3. Comments per issue
create table if not exists public.issue_comments (
  id uuid default gen_random_uuid() primary key,
  issue_id text not null,
  user_email text,
  body text not null,
  created_at timestamptz default now()
);

-- RLS Policies
alter table public.issue_actions enable row level security;
alter table public.issue_comments enable row level security;
alter table public.profiles enable row level security;

-- issue_actions: authenticated users can read + write everything
create policy "read issue_actions" on public.issue_actions for select to authenticated using (true);
create policy "write issue_actions" on public.issue_actions for all to authenticated using (true) with check (true);

-- issue_comments: authenticated users can read + write
create policy "read comments" on public.issue_comments for select to authenticated using (true);
create policy "write comments" on public.issue_comments for all to authenticated using (true) with check (true);

-- profiles: authenticated users can read all, update own
create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

-- Enable Realtime on issue_actions (so status changes sync live across users)
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table issue_actions, issue_comments;
commit;
