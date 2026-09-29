-- Lunch Roulette MVP schema
create extension if not exists pgcrypto;

create type public.session_status as enum ('open', 'locked', 'revealed');

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_user_id uuid not null,
  status public.session_status not null default 'open',
  questionnaire_version text not null default 'v0.1',
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  revealed_at timestamptz
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 24),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (session_id, user_id)
);

create table public.responses (
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  is_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (session_id, participant_id)
);

create table public.result_snapshots (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  group_stats jsonb not null,
  created_at timestamptz not null default now()
);

create table public.participant_results (
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  user_id uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (session_id, participant_id)
);

alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.responses enable row level security;
alter table public.result_snapshots enable row level security;
alter table public.participant_results enable row level security;

create or replace function public.can_access_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.sessions s
      where s.id = target_session_id
        and s.host_user_id = auth.uid()
    )
    or exists (
      select 1 from public.participants p
      where p.session_id = target_session_id
        and p.user_id = auth.uid()
    );
$$;

create policy "authenticated users can read sessions"
on public.sessions for select to authenticated
using (true);

create policy "users can create hosted sessions"
on public.sessions for insert to authenticated
with check (host_user_id = auth.uid());

create policy "hosts can update own sessions"
on public.sessions for update to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

create policy "session members can read participants"
on public.participants for select to authenticated
using (public.can_access_session(session_id));

create policy "users can join sessions as self"
on public.participants for insert to authenticated
with check (user_id = auth.uid());

create policy "users can update own participant row"
on public.participants for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "self or host can read responses"
on public.responses for select to authenticated
using (
  exists (
    select 1 from public.participants p
    where p.id = responses.participant_id
      and p.user_id = auth.uid()
  )
  or exists (
    select 1 from public.sessions s
    where s.id = responses.session_id
      and s.host_user_id = auth.uid()
  )
);

create policy "participant can insert own open-session response"
on public.responses for insert to authenticated
with check (
  exists (
    select 1 from public.participants p
    join public.sessions s on s.id = p.session_id
    where p.id = participant_id
      and p.user_id = auth.uid()
      and p.session_id = responses.session_id
      and s.status = 'open'
  )
);

create policy "participant can update own open-session response"
on public.responses for update to authenticated
using (
  exists (
    select 1 from public.participants p
    join public.sessions s on s.id = p.session_id
    where p.id = participant_id
      and p.user_id = auth.uid()
      and p.session_id = responses.session_id
      and s.status = 'open'
  )
)
with check (
  exists (
    select 1 from public.participants p
    join public.sessions s on s.id = p.session_id
    where p.id = participant_id
      and p.user_id = auth.uid()
      and p.session_id = responses.session_id
      and s.status = 'open'
  )
);

create policy "session members can read group snapshot"
on public.result_snapshots for select to authenticated
using (public.can_access_session(session_id));

create policy "host can create group snapshot"
on public.result_snapshots for insert to authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = result_snapshots.session_id
      and s.host_user_id = auth.uid()
  )
);

create policy "participant can read own result"
on public.participant_results for select to authenticated
using (user_id = auth.uid());

create policy "host can insert participant results"
on public.participant_results for insert to authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = participant_results.session_id
      and s.host_user_id = auth.uid()
  )
);

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.responses;
alter publication supabase_realtime add table public.result_snapshots;
alter publication supabase_realtime add table public.participant_results;

create or replace function public.touch_response_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger responses_touch_updated_at
before update on public.responses
for each row execute function public.touch_response_updated_at();

create or replace function public.sync_participant_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.participants
  set completed_at = case when new.is_complete then now() else null end,
      last_seen_at = now()
  where id = new.participant_id
    and session_id = new.session_id;
  return new;
end;
$$;

create trigger responses_sync_participant_completion
after insert or update of is_complete on public.responses
for each row execute function public.sync_participant_completion();
