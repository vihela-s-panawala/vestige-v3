create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  rating integer not null check (rating between 1 and 5),
  review text not null check (char_length(trim(review)) between 1 and 300),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

revoke all on public.feedback from anon, authenticated;
grant select, insert, delete on public.feedback to service_role;
