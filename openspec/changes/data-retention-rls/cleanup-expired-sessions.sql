WITH deleted AS (
  DELETE FROM public.sessions
  WHERE status = 'revealed' AND revealed_at < now() - interval '720 hours'
  RETURNING id
)
SELECT count(*) AS deleted_sessions FROM deleted;
