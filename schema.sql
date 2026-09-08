-- ============================================================
-- 减肥打卡 H5 · Supabase 建表脚本
-- 在 Supabase 控制台 -> SQL Editor 中执行本文件
-- ============================================================

-- 1) 目标设置表（单行：用 key='active' 唯一标识当前目标）
create table if not exists public.goals (
  id            bigint generated always as identity primary key,
  key           text not null default 'active' unique,
  initial_weight numeric(5,2) not null,      -- 初始体重 (kg)
  target_weight  numeric(5,2) not null,      -- 目标体重 (kg)
  plan_start     date          not null,     -- 计划开始日期
  target_date    date          not null,     -- 目标达成日期
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

-- 2) 每日打卡记录表（按日期唯一）
create table if not exists public.checkins (
  id            bigint generated always as identity primary key,
  checkin_date  date          not null unique,  -- 打卡日期(当天)
  weight        numeric(5,2)  not null,        -- 今日体重 (kg)
  body_fat      numeric(4,2),                  -- 体脂率 (%) 可空
  bedtime       text,                          -- 入睡时间 如 '23:00'
  foot_bath     boolean       not null default true,   -- 泡脚 默认是
  sneaking      boolean       not null default false,  -- 偷吃 默认否
  exercise      boolean       not null default false,  -- 运动 默认无
  exercise_hours numeric(4,1),                 -- 运动时长(小时) 仅 exercise=true
  bowel         boolean       not null default false,  -- 排便 默认无
  note          text,                          -- 备注
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create index if not exists idx_checkins_date on public.checkins (checkin_date);

-- 3) 行级安全策略（个人单机使用：允许 anon 全量读写）
-- ⚠️ 安全提示：此策略对匿名角色开放全部权限，仅适用于「纯个人、无敏感数据」场景。
--    若需多用户/敏感数据，请改用 Supabase Auth 并改写为基于 auth.uid() 的策略。
alter table public.goals   enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "goals_anon_all" on public.goals;
create policy "goals_anon_all" on public.goals
  for all to anon using (true) with check (true);

drop policy if exists "checkins_anon_all" on public.checkins;
create policy "checkins_anon_all" on public.checkins
  for all to anon using (true) with check (true);
