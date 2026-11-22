-- 냥냥 방위대 플레이 기록 표
-- Supabase → SQL Editor → New query 에 붙여 넣고 Run

create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_name_time on public.events (name, created_at desc);

alter table public.events enable row level security;

-- 게임(로그인한 게스트 포함)은 자기 기록을 '쓰기'만 할 수 있다. 읽기는 대시보드(관리자)에서만.
drop policy if exists "insert own events" on public.events;
create policy "insert own events" on public.events
  for insert to authenticated
  with check (user_id = auth.uid());

-- ───── 자주 볼 숫자 (필요할 때 하나씩 실행) ─────

-- 1) 날짜별 방문자 수
-- select date_trunc('day', created_at) as day, count(distinct user_id) as players
-- from events where name = 'session' group by 1 order by 1 desc;

-- 2) 스테이지별 도전·승리·포기 (어디서 막히는지)
-- select data->>'stage' as stage, count(*) as tries,
--        count(*) filter (where (data->>'win')::bool) as wins,
--        count(distinct user_id) as players
-- from events where name = 'stage_end' group by 1 order by 1;

-- 3) 플레이어가 마지막으로 도달한 스테이지 (이탈 지점)
-- select last_stage, count(*) from (
--   select user_id, max((regexp_replace(data->>'stage', '\D', '', 'g'))::int) as last_stage
--   from events where name = 'stage_end' and (data->>'win')::bool group by user_id
-- ) t group by 1 order by 1;

-- 4) 광고: 종류별 시청 수와 끝까지 본 비율
-- select data->>'kind' as kind, count(*) as shown,
--        count(*) filter (where (data->>'ok')::bool) as rewarded
-- from events where name = 'ad' group by 1;

-- 5) 다음 날 다시 온 비율 (재방문율)
-- with d as (select user_id, date_trunc('day', created_at)::date as day from events where name = 'session' group by 1, 2)
-- select a.day, count(distinct a.user_id) as players,
--        count(distinct b.user_id) as came_back_next_day
-- from d a left join d b on b.user_id = a.user_id and b.day = a.day + 1
-- group by 1 order by 1 desc;
