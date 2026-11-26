WITH deleted AS (
  DELETE FROM public.sessions
  WHERE (status = 'revealed' AND revealed_at <= statement_timestamp() - interval '30 days')
     OR (status <> 'revealed' AND created_at <= statement_timestamp() - interval '30 days')
  RETURNING id
)
SELECT count(*) AS deleted_sessions FROM deleted;
