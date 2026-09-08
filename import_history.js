#!/usr/bin/env node
/**
 * 历史数据导入：把旧版 checkin_data.json 映射为 Supabase checkins 的 INSERT 语句。
 *
 * 用法：
 *   node import_history.js /path/to/checkin_data.json > inserts.sql
 * 然后把 inserts.sql 在 Supabase 控制台 SQL Editor 中执行即可。
 *
 * 数据模型对齐说明：
 *   旧版：weights[日期] = 当天早上体重；behaviors[日期] = 前一天(日期-1)的行为。
 *   新版：checkins 一行 = 一天，体重取当天早上，行为取前一日(即旧 behaviors[同一日期])。
 *   因此 checkin_date = D 时，weight=weights[D]，行为字段取自 behaviors[D]。
 *
 * 泡脚/偷吃/排便 由旧 note 文本启发式解析（含「无xx」判为负）。运动沿用旧 exercise 字段（小时数未知置 NULL）。
 * 该解析为启发式，导入后请在应用内人工核对。
 */
const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('用法: node import_history.js <checkin_data.json>'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const weights = data.weights || {};
const bodyfats = data.bodyfats || {};
const behaviors = data.behaviors || {};

function parseBool(note, posKw, negKw) {
  if (!note) return false;
  if (negKw && note.includes(negKw)) return false;
  return note.includes(posKw);
}
// 旧数据日期形如 '8.3'，统一转成 Postgres 合法日期 '2026-08-03'
function normDate(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [m, d] = String(s).split('.').map(Number);
  if (m && d) return `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return s;
}
const v = (x) => x == null ? 'NULL'
  : (typeof x === 'number' ? x : `'${String(x).replace(/'/g, "''")}'`);

let sql = '-- 由 import_history.js 生成，可在 Supabase SQL Editor 执行\n';
for (const [date, w] of Object.entries(weights)) {
  const b = behaviors[date] || {};
  const note = b.note || '';
  const exercise = !!(b.exercise && !['无', '—', '-', ''].includes(b.exercise));
  sql += `INSERT INTO checkins (checkin_date,weight,body_fat,bedtime,foot_bath,sneaking,exercise,exercise_hours,bowel,note) `
    + `VALUES (${v(normDate(date))},${v(Number(w))},${v(bodyfats[date] != null ? Number(bodyfats[date]) : null)},`
    + `${v(b.sleep || null)},${parseBool(note, '泡脚', '无泡脚')},${parseBool(note, '偷吃', '无偷吃')},`
    + `${exercise},NULL,${parseBool(note, '排便', '无排便')},${v(note)}) `
    + `ON CONFLICT (checkin_date) DO UPDATE SET weight=EXCLUDED.weight, body_fat=EXCLUDED.body_fat, `
    + `bedtime=EXCLUDED.bedtime, foot_bath=EXCLUDED.foot_bath, sneaking=EXCLUDED.sneaking, `
    + `exercise=EXCLUDED.exercise, bowel=EXCLUDED.bowel, note=EXCLUDED.note;\n`;
}

// 目标（若存在）
if (data.plan_start && data.plan_end && data.start_weight && data.target_weight) {
  const ps = normDate(data.plan_start);
  const pe = normDate(data.plan_end);
  sql += `\n-- 可选：写入目标（如已手动设置目标请忽略）\n`
    + `INSERT INTO goals (key,initial_weight,target_weight,plan_start,target_date) `
    + `VALUES ('active',${Number(data.start_weight)},${Number(data.target_weight)},${v(ps)},${v(pe)}) `
    + `ON CONFLICT (key) DO UPDATE SET initial_weight=EXCLUDED.initial_weight, target_weight=EXCLUDED.target_weight, plan_start=EXCLUDED.plan_start, target_date=EXCLUDED.target_date;\n`;
}
process.stdout.write(sql);
