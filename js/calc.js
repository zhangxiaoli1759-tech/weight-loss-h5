// ============================================================
// 计算逻辑：预估体重(线性计划轨迹) / 每日需减 / 与昨日对比
// 所有重量单位 kg，保留 2 位小数
// ============================================================
(function () {
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  function daysBetween(aStr, bStr) {
    const a = new Date(aStr + 'T00:00:00');
    const b = new Date(bStr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  // 计划预估体重：从 initial(plan_start) 线性降到 target(target_date)
  function estimated(dateStr, goal) {
    if (!goal) return null;
    const total = daysBetween(goal.plan_start, goal.target_date);
    if (total <= 0) return null;
    let elapsed = daysBetween(goal.plan_start, dateStr);
    elapsed = Math.max(0, Math.min(total, elapsed));
    const daily = (goal.initial_weight - goal.target_weight) / total;
    return round2(goal.initial_weight - daily * elapsed);
  }

  // 计划每日应减 (kg/天)
  function dailyPlanLoss(goal) {
    if (!goal) return null;
    const total = daysBetween(goal.plan_start, goal.target_date);
    if (total <= 0) return null;
    return round2((goal.initial_weight - goal.target_weight) / total);
  }

  // 当前进度：距目标剩余天数 / 还需减重 / 建议每日减
  function remaining(goal, currentWeight, todayStr) {
    if (!goal) return null;
    const today = todayStr || (window.WL_DB && window.WL_DB.nowLocalDate());
    const days = daysBetween(today, goal.target_date);
    const toLose = round2(currentWeight - goal.target_weight);
    const needDaily = days > 0 ? round2(toLose / days) : null;
    return { days, toLose, needDaily };
  }

  // 与昨日对比：返回 (昨日体重 - 今日体重)，正数=掉秤，负数=反弹；无昨日返回 null
  function deltaVsYesterday(checkins, dateStr) {
    const sorted = [...checkins].sort((a, b) => a.checkin_date < b.checkin_date ? -1 : 1);
    const idx = sorted.findIndex(c => c.checkin_date === dateStr);
    if (idx < 0) return null;
    const cur = sorted[idx].weight;
    let prev = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (sorted[i].weight != null) { prev = sorted[i].weight; break; }
    }
    if (prev == null) return null;
    return round2(prev - cur);
  }

  window.WL_CALC = { estimated, dailyPlanLoss, remaining, deltaVsYesterday, round2, daysBetween };
})();
