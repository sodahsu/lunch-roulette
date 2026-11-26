select cron.unschedule('delete-expired-sessions');

drop function if exists public.delete_expired_sessions();

-- This rollback only disables future runs; deleted rows are not restored.
