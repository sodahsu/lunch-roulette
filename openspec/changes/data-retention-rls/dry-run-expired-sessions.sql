-- Read-only preview of the sessions that the scheduled function would delete now.
select
  count(*) filter (where status = 'revealed') as revealed_sessions,
  count(*) filter (where status <> 'revealed') as unrevealed_sessions,
  count(*) as total_sessions
from public.sessions
where (status = 'revealed' and revealed_at <= statement_timestamp() - interval '30 days')
   or (status <> 'revealed' and created_at <= statement_timestamp() - interval '30 days');
