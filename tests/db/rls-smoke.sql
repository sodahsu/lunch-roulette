-- Manual RLS smoke tests for Lunch Roulette.
-- Run against a disposable/test room. These checks document the expected authorization behavior.

-- Expected:
-- 1. A room participant can read room members but only their own response.
-- 2. A host can read all participant responses in the hosted room.
-- 3. An outsider can read neither participants nor responses.
-- 4. A participant update after session status = locked affects 0 rows.
-- 5. A new participant insert after session status = locked is rejected by RLS.

-- Test fixture identities used during initial verification:
-- host: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- participant Soda: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
-- outsider: dddddddd-dddd-dddd-dddd-dddddddddddd
-- room: 11111111-1111-1111-1111-111111111111

-- Participant visibility
begin;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select
  (select count(*) from public.participants
   where session_id='11111111-1111-1111-1111-111111111111') as visible_participants,
  (select count(*) from public.responses
   where session_id='11111111-1111-1111-1111-111111111111') as visible_responses;
rollback;

-- Host visibility
begin;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select
  (select count(*) from public.participants
   where session_id='11111111-1111-1111-1111-111111111111') as visible_participants,
  (select count(*) from public.responses
   where session_id='11111111-1111-1111-1111-111111111111') as visible_responses;
rollback;

-- Outsider visibility
begin;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select
  (select count(*) from public.participants
   where session_id='11111111-1111-1111-1111-111111111111') as visible_participants,
  (select count(*) from public.responses
   where session_id='11111111-1111-1111-1111-111111111111') as visible_responses;
rollback;
