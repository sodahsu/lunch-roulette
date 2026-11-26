create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.delete_expired_sessions()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  deleted_count bigint;
begin
  delete from public.sessions
  where (status = 'revealed' and revealed_at <= statement_timestamp() - interval '30 days')
     or (status <> 'revealed' and created_at <= statement_timestamp() - interval '30 days');

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_expired_sessions() from public, anon, authenticated;

select cron.schedule(
  'delete-expired-sessions',
  '0 3 * * *',
  'select public.delete_expired_sessions();'
);
