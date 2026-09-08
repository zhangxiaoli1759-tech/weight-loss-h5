# 减肥打卡 H5 🍃

移动端优先的减肥打卡 Web 应用：每日记录体重 / 体脂率 / 入睡时间 / 泡脚 / 偷吃 / 运动 / 排便，自动计算预估体重曲线、与昨日对比、距目标剩余天数与每日需减进度，并用图表展示体重与体脂变化趋势。

- 前端：纯静态 H5（HTML + CSS + 原生 JS），无需构建
- 图表：[Chart.js](https://www.chartjs.org/) v4（CDN）
- 存储：[Supabase](https://supabase.com/)（Postgres），未配置时自动回退浏览器 `localStorage`
- 部署：GitHub Pages

线上地址：https://zhangxiaoli1759-tech.github.io/weight-loss-h5/

## 功能
1. **每日打卡**：体重（2 位小数）、体脂率（2 位小数，选填）、入睡时间（默认 23:00 可改）、泡脚（默认是）、偷吃（默认否）、运动（默认无，选「有」弹出行时长）、排便（默认无）。
2. **记录列表**：预估体重 / 实际体重 / 体脂率 / 入睡时间 / 与昨日对比（昨日 − 今日，绿↓=掉秤、红▲=反弹）。
3. **变化曲线**：体重图含「实际 vs 预估」两条线；体脂率独立曲线。
4. **目标设置**：初始体重、目标体重、计划开始日期、目标达成日期。保存后自动计算「当前体重 / 距目标还差 / 剩余天数 / 建议每日减」。

## 预估体重算法
以目标为锚做**线性插值**：从「初始体重(计划开始日)」匀速降到「目标体重(达成日)」。
```
每日计划减重 = (初始体重 − 目标体重) / 总天数
预估(某日)   = 初始体重 − 每日计划减重 × 已过天数
```
「建议每日减」= (当前体重 − 目标体重) / 距达成剩余天数，用于衡量当前节奏是否达标。

## 本地运行
```bash
cd weight-loss-h5
python3 -m http.server 8099
# 浏览器打开 http://localhost:8099
```
未配置 Supabase 时数据存于浏览器本地，可直接体验。

## 接入 Supabase（数据云端保存）
1. 在 [supabase.com](https://supabase.com/) 新建项目。
2. 打开 **SQL Editor**，执行本仓库 `schema.sql`（建表 + 行级安全策略）。
3. 进入 **Project Settings → API**，复制 Project URL 与 `anon` / `public` key。
4. 在页面右上角 **⚙ 设置** 中粘贴 URL 与 Key 并保存，即切换为云端存储。
   （也可直接把值写进 `js/config.js` 的 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 后重新部署。）

> ⚠️ 安全提示：`schema.sql` 中的 RLS 策略对匿名角色开放全部权限，仅适用于「纯个人、无敏感数据」场景。若需多用户或敏感数据，请改用 Supabase Auth 并改为基于 `auth.uid()` 的策略。

## 历史数据导入（可选）
如需把旧版 `checkin_data.json`（体重/体脂/行为）导入 Supabase，可参照 `schema.sql` 的表结构，将旧数据映射为 `checkins` 行（一行 = 一天）后通过 Supabase 客户端批量插入。
