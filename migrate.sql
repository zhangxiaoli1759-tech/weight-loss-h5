-- ============================================================
-- 减肥打卡 H5 · 一键迁移脚本（Schema + 历史数据）
-- 用法：Supabase 控制台 -> SQL Editor -> 粘贴本文件 -> Run
-- 说明：表/策略均为 IF NOT EXISTS / DROP POLICY IF EXISTS，可重复执行。
-- 数据来源：旧 checkin_data.json（与腾讯文档打卡总览一致），已按「体重当天 / 行为前一天」正确关联。
-- ============================================================

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


-- ============================================================
-- 历史打卡数据（37 行）+ 目标（1 行）
-- ============================================================

-- 由 import_history.js 生成（checkin_date 行为已按「前一天」正确关联），可在 Supabase SQL Editor 执行
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-03',76.4,NULL,'23:50',false,true,false,NULL,false,'偷吃：新白鹿；睡晚了：23:50；晚上微微饥饿感（注：此为计划前一日 8.2 的数据，不计入计划统计）') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-04',75.75,NULL,'23:40',false,false,false,NULL,false,'22:41躺下失眠至23:40；无偷吃，8+16严格；蛋白粉17:30补喝1包') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-05',75.35,NULL,'23:00',false,false,false,NULL,false,'失眠半小时') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-06',74.95,NULL,'22:40',true,false,false,NULL,false,'泡脚') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-07',74.4,NULL,'23:00',true,false,false,NULL,false,'泡脚；失眠睡得不太好') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-08',74.1,NULL,'0:30',true,false,false,NULL,false,'泡脚；试吃雪花酥一块') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-09',73.8,NULL,'23:37',true,false,true,NULL,false,'泡脚；18点左右吃了一点麻辣香锅但涮水了') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-10',74.35,NULL,'23:30',true,false,true,NULL,false,'泡脚；中午吃面，早上喝清汤面茶') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-11',74.3,NULL,'23:30',true,true,false,NULL,false,'泡脚20分钟；偷吃三口自己卤的鸡腿肉') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-12',73.65,NULL,'22:50',true,false,false,NULL,false,'泡脚20分钟；无运动无偷吃') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-13',73.45,NULL,'22:50',true,false,false,NULL,true,'泡脚半小时；早上排便；无偷吃') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-14',73.35,NULL,'23:30',true,false,false,NULL,false,'泡脚15分钟；无排便') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-15',73.15,NULL,'23:30',true,false,false,NULL,false,'泡脚15分钟；无排便，晚上西梅饮后排便') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-16',73.35,NULL,'23:30',true,false,false,NULL,true,'泡脚15分钟；有排便') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-17',74,NULL,'23:20',true,false,true,NULL,false,'泡脚20分钟；无偷吃；无排便') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-18',73.55,NULL,'23:30',true,false,false,NULL,false,'泡脚20分钟；失眠严重；无偷吃无运动') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-19',73.65,NULL,'22:15',true,false,false,NULL,false,'泡脚 无运动无偷吃无排便 生理期第一天') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-20',73.25,NULL,'23:10',true,false,true,NULL,false,'泡脚 无偷吃无排便 生理期第二天') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-22',73.35,NULL,'00:00',true,true,false,NULL,true,'有偷吃：关东煮一串、魔芋粉丝一串、萝卜、一小碗番茄土豆炖牛肋条；有排便；有泡脚') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-21',73.5,NULL,'22:50',true,true,false,NULL,true,'泡脚；有偷吃半个馒头半根玉米；有排便') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-23',73.35,NULL,'23:30',true,true,false,NULL,true,'昨晚睡的比较好；有偷吃半根玉米几口零食；无运动；有泡脚20分钟；有排便') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-25',73.45,NULL,'23:50',false,false,false,NULL,false,'无泡脚无运动无排便；昨天出差未坚持8+16减肥标准') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-26',72.85,NULL,'23:10',true,false,true,NULL,true,'泡脚；排便；无偷吃') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-27',72.75,NULL,'23:10',true,false,true,NULL,false,'泡脚；无排便；喝了一杯蜜雪冰城羽衣甘蓝无糖少冰') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-28',72.5,NULL,'23:15',true,false,false,NULL,false,'无运动无偷吃无排便有泡脚') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-29',72.4,NULL,'22:43',false,false,false,NULL,true,'无运动无泡脚；晚上有喝两杯豆浆一杯苹果汁自制的；有排便') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-30',73.1,NULL,'23:40',false,true,false,NULL,true,'有排便；偷吃菜夹馍西瓜汁') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-31',72.9,NULL,'22:50',true,false,false,NULL,false,'泡脚；四点以后有喝豆浆、西瓜汁') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-08-24',73.4,NULL,'23:40',true,true,false,NULL,false,'有泡脚；无运动；偷吃兰州拉面') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-09-01',73.15,NULL,'22:00',false,false,true,NULL,false,'无泡脚无排便；19:30左右吃了3串关东煮的魔芋粉丝；昨天下午16:00没喝蛋白粉') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-09-02',72.8,NULL,'23:20',true,false,true,NULL,true,'失眠很长时间；有少量排便；泡脚；无偷吃') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-09-03',72.8,39.5,'23:10',true,false,true,NULL,false,'泡脚；无排便；无偷吃') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-09-05',72.95,39.5,'22:00',true,false,false,NULL,true,'晚上无偷吃有泡脚有排便') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-09-06',72.8,39.8,'22:00',false,false,true,NULL,true,'无泡脚有排便无偷吃无运动') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-09-07',73.1,40,'22:50',true,true,true,NULL,true,'跳操一小时，泡脚，少量排便，昨天中午吃了自制面条关东煮寿司三个喝了西瓜汁一杯，四点以后没有偷吃') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-09-04',72.6,39.3,'22:30',false,false,true,NULL,true,'无泡脚有排便无偷吃') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;
INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) VALUES ('2026-09-08',72.8,39.8,'22:50',true,false,true,NULL,true,'泡脚；有少量排便；无偷吃') ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;

-- 可选：写入目标（如已手动设置目标请忽略）
INSERT INTO goals (key,initial_weight,target_weight,plan_start,target_date) VALUES ('active',76.4,68.5,'2026-08-03','2026-09-26') ON CONFLICT (key) DO UPDATE SET initial_weight=EXCLUDED.initial_weight, target_weight=EXCLUDED.target_weight, plan_start=EXCLUDED.plan_start, target_date=EXCLUDED.target_date;
