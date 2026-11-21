BEGIN;

CREATE TEMP TABLE retention_fixtures (id uuid, code text, status public.session_status, age interval, expires boolean);
INSERT INTO retention_fixtures VALUES
  (gen_random_uuid(), 'RET43A', 'revealed', interval '721 hours', true),
  (gen_random_uuid(), 'RET43B', 'revealed', interval '719 hours', false),
  (gen_random_uuid(), 'RET43C', 'revealed', interval '720 hours', false),
  (gen_random_uuid(), 'RET43D', 'open', interval '721 hours', false),
  (gen_random_uuid(), 'RET43E', 'locked', interval '721 hours', false),
  (gen_random_uuid(), 'RET43F', 'revealed', NULL, false);

INSERT INTO public.sessions (id, code, host_user_id, status, created_at, revealed_at)
SELECT id, code, gen_random_uuid(), status, now() - interval '1000 hours',
       CASE WHEN status = 'revealed' THEN now() - age END
FROM retention_fixtures;

INSERT INTO public.participants (session_id, user_id, display_name)
SELECT id, gen_random_uuid(), 'Retention QA' FROM retention_fixtures;
INSERT INTO public.responses (session_id, participant_id)
SELECT session_id, id FROM public.participants WHERE session_id IN (SELECT id FROM retention_fixtures);
INSERT INTO public.result_snapshots (session_id, group_stats)
SELECT id, '{}' FROM retention_fixtures;
INSERT INTO public.participant_results (session_id, participant_id, user_id, result)
SELECT session_id, id, user_id, '{}' FROM public.participants WHERE session_id IN (SELECT id FROM retention_fixtures);

\ir ../../openspec/changes/data-retention-rls/cleanup-expired-sessions.sql

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
