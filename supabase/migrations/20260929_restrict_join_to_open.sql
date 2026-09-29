-- Prevent direct API inserts into participants after a room is locked.
drop policy if exists "users can join sessions as self" on public.participants;
drop policy if exists "users can join open sessions as self" on public.participants;

create policy "users can join open sessions as self"
on public.participants for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.sessions s
    where s.id = participants.session_id
      and s.status = 'open'
  )
);
