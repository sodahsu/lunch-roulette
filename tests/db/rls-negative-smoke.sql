-- 僅在隔離測試 Supabase 執行：node scripts/run-isolated-rls.mjs
-- BEGIN/ROLLBACK 保證測試房間不持久化；無 DDL、無 Migration。
-- 要求已套用正式 schema 與既有安全加固 Migration，具可 SET ROLE authenticated 的測試管理員。
BEGIN;

INSERT INTO public.sessions (id, code, host_user_id, status)
VALUES
 ('11111111-1111-1111-1111-111111111111', 'RLS43A', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'open'),
 ('22222222-2222-2222-2222-222222222222', 'RLS43B', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'open');

INSERT INTO public.participants (id, session_id, user_id, display_name)
VALUES
 ('33333333-3333-3333-3333-333333333331','11111111-1111-1111-1111-111111111111','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','QA-A'),
 ('33333333-3333-3333-3333-333333333332','11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','QA-B'),
 ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','QA-C');

INSERT INTO public.responses (session_id, participant_id, answers, is_complete)
VALUES
 ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333331','{"q":"A"}',false),
 ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333332','{"q":"B"}',false),
 ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','{"q":"C"}',false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.responses) <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: participant can read other player responses';
  END IF;
  IF (SELECT count(*) FROM public.participants) <> 2 THEN
    RAISE EXCEPTION 'RLS FAIL: participant can read other room participants';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.responses) <> 0 OR
     (SELECT count(*) FROM public.participants) <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: outsider can read participant or response rows';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.responses WHERE session_id='11111111-1111-1111-1111-111111111111') <> 2 THEN
    RAISE EXCEPTION 'RLS FAIL: host cannot read room responses required for final reveal';
  END IF;
  IF (SELECT count(*) FROM public.responses WHERE session_id='22222222-2222-2222-2222-222222222222') <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: host can read another room';
  END IF;
END $$;

RESET ROLE;
UPDATE public.sessions SET status = 'locked', locked_at = now()
WHERE id = '11111111-1111-1111-1111-111111111111';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
DO $$
DECLARE affected integer;
BEGIN
  UPDATE public.responses SET answers = '{"q":"CHANGED"}'
  WHERE session_id='11111111-1111-1111-1111-111111111111'
    AND participant_id='33333333-3333-3333-3333-333333333331';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'RLS FAIL: locked response changed'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.participants (session_id, user_id, display_name)
    VALUES ('11111111-1111-1111-1111-111111111111',
            '99999999-9999-9999-9999-999999999999', 'late');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'RLS FAIL: late join accepted after lock'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
