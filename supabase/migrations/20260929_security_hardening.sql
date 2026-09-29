-- Security hardening after initial schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.can_access_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1 from public.sessions s
      where s.id = target_session_id
        and s.host_user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.participants p
      where p.session_id = target_session_id
        and p.user_id = (select auth.uid())
    );
$$;

revoke all on function private.can_access_session(uuid) from public, anon;
grant execute on function private.can_access_session(uuid) to authenticated;

drop policy if exists "session members can read participants" on public.participants;
create policy "session members can read participants"
on public.participants for select to authenticated
using (private.can_access_session(session_id));

drop policy if exists "session members can read group snapshot" on public.result_snapshots;
create policy "session members can read group snapshot"
on public.result_snapshots for select to authenticated
using (private.can_access_session(session_id));

drop function if exists public.can_access_session(uuid);

alter function public.touch_response_updated_at() set search_path = public, pg_temp;

revoke all on function public.sync_participant_completion() from public, anon, authenticated;
revoke all on function public.touch_response_updated_at() from public, anon, authenticated;

drop policy if exists "users can create hosted sessions" on public.sessions;
create policy "users can create hosted sessions"
on public.sessions for insert to authenticated
with check (host_user_id = (select auth.uid()));

drop policy if exists "hosts can update own sessions" on public.sessions;
create policy "hosts can update own sessions"
on public.sessions for update to authenticated
using (host_user_id = (select auth.uid()))
with check (host_user_id = (select auth.uid()));

drop policy if exists "users can join sessions as self" on public.participants;
create policy "users can join sessions as self"
on public.participants for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users can update own participant row" on public.participants;
create policy "users can update own participant row"
on public.participants for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "self or host can read responses" on public.responses;
create policy "self or host can read responses"
on public.responses for select to authenticated
using (
  exists (
    select 1 from public.participants p
    where p.id = responses.participant_id
      and p.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.sessions s
    where s.id = responses.session_id
      and s.host_user_id = (select auth.uid())
  )
);

drop policy if exists "participant can insert own open-session response" on public.responses;
create policy "participant can insert own open-session response"
on public.responses for insert to authenticated
with check (
  exists (
    select 1 from public.participants p
    join public.sessions s on s.id = p.session_id
    where p.id = participant_id
      and p.user_id = (select auth.uid())
      and p.session_id = responses.session_id
      and s.status = 'open'
  )
);

drop policy if exists "participant can update own open-session response" on public.responses;
create policy "participant can update own open-session response"
on public.responses for update to authenticated
using (
  exists (
    select 1 from public.participants p
    join public.sessions s on s.id = p.session_id
    where p.id = participant_id
      and p.user_id = (select auth.uid())
      and p.session_id = responses.session_id
      and s.status = 'open'
  )
)
with check (
  exists (
    select 1 from public.participants p
    join public.sessions s on s.id = p.session_id
    where p.id = participant_id
      and p.user_id = (select auth.uid())
      and p.session_id = responses.session_id
      and s.status = 'open'
  )
);

drop policy if exists "host can create group snapshot" on public.result_snapshots;
create policy "host can create group snapshot"
on public.result_snapshots for insert to authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = result_snapshots.session_id
      and s.host_user_id = (select auth.uid())
  )
);

drop policy if exists "participant can read own result" on public.participant_results;
create policy "participant can read own result"
on public.participant_results for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "host can insert participant results" on public.participant_results;
create policy "host can insert participant results"
on public.participant_results for insert to authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = participant_results.session_id
      and s.host_user_id = (select auth.uid())
  )
);

create index if not exists responses_participant_id_idx on public.responses(participant_id);
create index if not exists participant_results_participant_id_idx on public.participant_results(participant_id);
