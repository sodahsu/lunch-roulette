-- Host-only overview access: participant results stay private until final reveal.
drop policy if exists "host can read revealed participant results" on public.participant_results;
create policy "host can read revealed participant results"
on public.participant_results for select to authenticated
using (
  exists (
    select 1
    from public.sessions s
    where s.id = participant_results.session_id
      and s.host_user_id = (select auth.uid())
      and s.status = 'revealed'
  )
);
