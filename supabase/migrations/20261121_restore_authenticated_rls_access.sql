begin;

grant select, insert, update on public.sessions, public.participants, public.responses to authenticated;
grant select, insert on public.result_snapshots, public.participant_results to authenticated;

drop policy if exists "users can join sessions as self" on public.participants;

commit;
