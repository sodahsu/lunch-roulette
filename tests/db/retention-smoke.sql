-- Executed only by the isolated Supabase runner; the enclosing transaction rolls everything back.
BEGIN;

CREATE TEMP TABLE retention_fixtures (
  id uuid primary key,
  code text,
  status public.session_status,
  created_age interval,
  revealed_age interval,
  expires boolean
);
INSERT INTO retention_fixtures VALUES
  (gen_random_uuid(), 'RET43A', 'revealed', interval '31 days', interval '31 days', true),
  (gen_random_uuid(), 'RET43B', 'revealed', interval '31 days', interval '29 days', false),
  (gen_random_uuid(), 'RET43C', 'open', interval '31 days', NULL, true),
  (gen_random_uuid(), 'RET43D', 'locked', interval '29 days', NULL, false);

INSERT INTO public.sessions (id, code, host_user_id, status, created_at, revealed_at)
SELECT id, code, gen_random_uuid(), status, now() - created_age,
       CASE WHEN status = 'revealed' THEN now() - revealed_age END
FROM retention_fixtures;

INSERT INTO public.participants (session_id, user_id, display_name)
SELECT id, gen_random_uuid(), 'Retention QA' FROM retention_fixtures;
INSERT INTO public.responses (session_id, participant_id)
SELECT session_id, id FROM public.participants WHERE session_id IN (SELECT id FROM retention_fixtures);
INSERT INTO public.result_snapshots (session_id, group_stats)
SELECT id, '{}' FROM retention_fixtures;
INSERT INTO public.participant_results (session_id, participant_id, user_id, result)
SELECT session_id, id, user_id, '{}' FROM public.participants WHERE session_id IN (SELECT id FROM retention_fixtures);

DO $$
DECLARE
  deleted_count bigint;
BEGIN
  deleted_count := public.delete_expired_sessions();
  IF deleted_count <> 2 THEN
    RAISE EXCEPTION 'Retention FAIL: expected 2 expired sessions deleted, got %', deleted_count;
  END IF;

  deleted_count := public.delete_expired_sessions();
  IF deleted_count <> 0 THEN
    RAISE EXCEPTION 'Retention FAIL: rerun should delete 0 sessions, got %', deleted_count;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM retention_fixtures fixture
    WHERE (SELECT count(*) FROM public.sessions WHERE id = fixture.id) <> CASE WHEN fixture.expires THEN 0 ELSE 1 END
       OR (SELECT count(*) FROM public.participants WHERE session_id = fixture.id) <> CASE WHEN fixture.expires THEN 0 ELSE 1 END
       OR (SELECT count(*) FROM public.responses WHERE session_id = fixture.id) <> CASE WHEN fixture.expires THEN 0 ELSE 1 END
       OR (SELECT count(*) FROM public.result_snapshots WHERE session_id = fixture.id) <> CASE WHEN fixture.expires THEN 0 ELSE 1 END
       OR (SELECT count(*) FROM public.participant_results WHERE session_id = fixture.id) <> CASE WHEN fixture.expires THEN 0 ELSE 1 END
  ) THEN
    RAISE EXCEPTION 'Retention FAIL: incorrect expiry or cascade';
  END IF;
END $$;

ROLLBACK;
