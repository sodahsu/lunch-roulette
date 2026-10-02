-- 只修正仍可繼續作答的場次；已鎖定或揭曉的歷史結果必須保持不變。
update public.responses as response
set is_complete = false
from public.sessions as session
where response.session_id = session.id
  and session.status = 'open'
  and response.is_complete = true
  and nullif(response.answers ->> 'food-avoid', '') is null;
