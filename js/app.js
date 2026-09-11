// ============================================================
// 主逻辑：表单 / 列表 / 图表 / 目标 / 设置
// ============================================================
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let GOAL = null;
  let GOALS = [];          // 全部历史目标（最新在前）
  let CHECKINS = [];

  // ---------- 工具 ----------
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 1800);
  }
  function fmt(n, d = 2) { return (n == null || isNaN(n)) ? '--' : Number(n).toFixed(d); }
  function showMsg(el, text, ok) {
    el.textContent = text; el.className = 'form-msg ' + (ok ? 'ok' : 'err');
  }

  // 读取分段控件布尔值
  function segVal(name) {
    const seg = document.querySelector(`.seg[data-name="${name}"]`);
    const active = seg.querySelector('button.active');
    return active.getAttribute('data-val') === 'true';
  }

  // ---------- 初始化 ----------
  async function init() {
    $('fDate').value = WL_DB.nowLocalDate();
    bindSegs();
    bindForms();
    updateModeBadge();

    const badge = $('modeBadge');
    badge.textContent = '连接中…';
    badge.className = 'badge badge-loading';

    const ok = await WL_DB.initSB();
    updateModeBadge();
    if (!ok) {
      const cfg = WL_DB.getSBConfig();
      // 配置存在但连不上 → 多半是网络/国内访问 Supabase 超时；配置都没填才正常走本地
      if (cfg) toast('⚠️ 云端连接失败，暂时用本地模式（检查网络后下拉刷新）');
    }

    try {
      GOALS = await WL_DB.getGoals();
      GOAL = GOALS.length ? GOALS[0] : null;
      CHECKINS = await WL_DB.getCheckins();
    } catch (e) {
      console.error(e);
      toast('读取数据失败：' + e.message);
    }
    renderAll();
  }

  function updateModeBadge() {
    const b = $('modeBadge');
    if (WL_DB.isSB()) { b.textContent = '云端'; b.className = 'badge badge-cloud'; }
    else { b.textContent = '本地'; b.className = 'badge badge-local'; }
  }

  // ---------- 事件绑定 ----------
  function bindSegs() {
    document.querySelectorAll('.seg').forEach(seg => {
      seg.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (seg.dataset.name === 'exercise') {
            $('exerciseHoursField').classList.toggle('hidden', btn.dataset.val !== 'true');
          }
        });
      });
    });
  }

  function bindForms() {
    $('checkinForm').addEventListener('submit', onCheckinSubmit);
    $('goalForm').addEventListener('submit', onGoalSubmit);
    $('settingsForm').addEventListener('submit', onSettingsSubmit);
    $('btnCheckin').addEventListener('click', openCheckinModal);
    $('btnEditGoal').addEventListener('click', openGoalModal);
    $('btnSettings').addEventListener('click', openSettingsModal);
    $('btnClearSB').addEventListener('click', clearSB);
    $('linkWeight').addEventListener('click', () => openPage('weight'));
    $('linkFat').addEventListener('click', () => openPage('fat'));
    $('linkGoals').addEventListener('click', () => openPage('goals'));
    document.querySelectorAll('[data-page-back]').forEach(b => b.addEventListener('click', closePage));
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModals));
    document.querySelectorAll('.modal-mask').forEach(m => m.addEventListener('click', closeModals));
  }

  function closeModals() {
    $('goalModal').classList.add('hidden');
    $('settingsModal').classList.add('hidden');
    $('checkinModal').classList.add('hidden');
  }

  function resetSeg(name, val) {
    const seg = document.querySelector(`.seg[data-name="${name}"]`);
    if (!seg) return;
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.val === val));
  }

  function openCheckinModal() {
    $('fDate').value = WL_DB.nowLocalDate();
    $('fWeight').value = '';
    $('fBodyFat').value = '';
    $('fBedtime').value = '23:00';
    $('fExerciseHours').value = '';
    $('fNote').value = '';
    showMsg($('formMsg'), '', true);
    resetSeg('foot_bath', 'true');
    resetSeg('sneaking', 'false');
    resetSeg('bowel', 'false');
    resetSeg('exercise', 'false');
    $('exerciseHoursField').classList.add('hidden');
    $('checkinModal').classList.remove('hidden');
  }

  // ---------- 打卡提交 ----------
  async function onCheckinSubmit(e) {
    e.preventDefault();
    const msg = $('formMsg');
    const date = $('fDate').value;
    if (!date) { showMsg(msg, '请选择日期', false); return; }
    const weight = parseFloat($('fWeight').value);
    if (isNaN(weight)) { showMsg(msg, '请输入体重', false); return; }
    const bodyFatRaw = $('fBodyFat').value;
    const bodyFat = bodyFatRaw === '' ? null : parseFloat(bodyFatRaw);
    const rec = {
      checkin_date: date,
      weight: WL_CALC.round2(weight),
      body_fat: bodyFat,
      bedtime: $('fBedtime').value || '23:00',
      foot_bath: segVal('foot_bath'),
      sneaking: segVal('sneaking'),
      bowel: segVal('bowel'),
      exercise: segVal('exercise'),
      exercise_hours: segVal('exercise') ? parseFloat($('fExerciseHours').value || '0') : null,
      note: $('fNote').value.trim()
    };

    try {
      await WL_DB.saveCheckin(rec);
      CHECKINS = await WL_DB.getCheckins();
      // 若当天是第一条记录且未设目标，提示去设目标
      showMsg(msg, '✅ 已保存 ' + date + ' 的打卡', true);
      renderAll();
      closeModals();
      toast('打卡成功');
    } catch (err) {
      console.error(err);
      showMsg(msg, '保存失败：' + err.message, false);
    }
  }

  // ---------- 目标提交 ----------
  async function onGoalSubmit(e) {
    e.preventDefault();
    const goal = {
      plan_start: $('gPlanStart').value,
      initial_weight: parseFloat($('gInitial').value),
      target_weight: parseFloat($('gTargetInput').value),
      target_date: $('gTargetDate').value
    };
    if (!goal.plan_start || !goal.target_date || isNaN(goal.initial_weight) || isNaN(goal.target_weight)) {
      toast('请完整填写目标'); return;
    }
    try {
      const saved = await WL_DB.saveGoal(goal);
      GOALS = await WL_DB.getGoals();
      GOAL = GOALS.length ? GOALS[0] : saved;
      CHECKINS = await WL_DB.getCheckins();
      closeModals();
      renderAll();
      toast('目标已保存');
    } catch (err) {
      console.error(err); toast('保存目标失败：' + err.message);
    }
  }

  function openGoalModal() {
    if (GOAL) {
      $('gPlanStart').value = GOAL.plan_start;
      $('gInitial').value = GOAL.initial_weight;
      $('gTargetInput').value = GOAL.target_weight;
      $('gTargetDate').value = GOAL.target_date;
    } else {
      $('gPlanStart').value = WL_DB.nowLocalDate();
    }
    $('goalModal').classList.remove('hidden');
  }

  // ---------- 设置提交 ----------
  async function onSettingsSubmit(e) {
    e.preventDefault();
    const url = $('sUrl').value.trim();
    const key = $('sKey').value.trim();
    const m = $('settingsMsg');
    if (!url || !key) { showMsg(m, 'URL 与 Key 都不能为空', false); return; }
    WL_DB.setSBConfig({ url, anonKey: key });
    const ok = await WL_DB.initSB();
    updateModeBadge();
    if (ok) {
      showMsg(m, '✅ 已连接云端', true);
      try {
        GOALS = await WL_DB.getGoals();
        GOAL = GOALS.length ? GOALS[0] : null;
        CHECKINS = await WL_DB.getCheckins();
        renderAll();
      } catch (err) { toast('读取云端数据失败：' + err.message); }
      setTimeout(closeModals, 800);
    } else {
      showMsg(m, '连接失败，请检查 URL / Key', false);
    }
  }

  function openSettingsModal() {
    const cfg = WL_DB.getSBConfig();
    $('sUrl').value = cfg ? cfg.url : '';
    $('sKey').value = cfg ? cfg.anonKey : '';
    $('settingsModal').classList.remove('hidden');
  }

  function clearSB() {
    localStorage.removeItem('wl_supabase');
    WL_DB.setSBConfig(null);
    updateModeBadge();
    toast('已切换为本地存储');
  }

  // ---------- 打卡复制 ----------
  function shortDate(dateStr) {
    const p = dateStr.split('-');
    return `${parseInt(p[1], 10)}.${parseInt(p[2], 10)}`;
  }
  // 数字去尾零：72.80 → 72.8 / 1.0 → 1
  function num(v) {
    if (v == null || isNaN(Number(v))) return '';
    const n = Number(v);
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  }
  function buildCopyText(c) {
    const p = c.checkin_date.split('-');
    const lines = [
      `${shortDate(c.checkin_date)}打卡记录`,
      `日期：${p[0]}/${p[1]}/${p[2]}`,
      `今日体重：${num(c.weight)}kg`
    ];
    if (c.body_fat != null) lines.push(`体脂率：${num(c.body_fat)}%`);
    lines.push(`昨晚入睡时间：${c.bedtime || '--'}`);
    lines.push(`泡脚：${c.foot_bath ? '是' : '否'}`);
    lines.push(`偷吃：${c.sneaking ? '是' : '否'}`);
    lines.push(`排便：${c.bowel ? '有' : '无'}`);
    if (c.exercise) {
      lines.push(`运动：有${c.exercise_hours ? `（${num(c.exercise_hours)}小时）` : ''}`);
    } else {
      lines.push('运动：无');
    }
    if (c.note && c.note.trim()) lines.push(`备注：${c.note.trim()}`);
    return lines.join('\n');
  }
  async function copyText(text) {
    const fb = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      return ok;
    };
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; }
      catch (e) { return fb(); }
    }
    return fb();
  }
  async function onCopy(date) {
    const c = CHECKINS.find(x => x.checkin_date === date);
    if (!c) { toast('未找到该记录'); return; }
    const ok = await copyText(buildCopyText(c));
    if (ok) toast(`✅ 已复制 ${shortDate(date)} 打卡记录，可直接粘贴`);
    else toast('复制失败，请长按手动复制');
  }

  // ---------- 渲染 ----------
  function renderAll() {
    renderGoal();
    renderStats();
    renderList();
    renderGoalHistory();
  }

  function renderGoal() {
    if (!GOAL) {
      $('goalEmpty').classList.remove('hidden');
      $('goalBody').classList.add('hidden');
      return;
    }
    $('goalEmpty').classList.add('hidden');
    $('goalBody').classList.remove('hidden');
    const latest = latestWeight();
    $('gInit').textContent = fmt(GOAL.initial_weight);
    $('gTarget').textContent = fmt(GOAL.target_weight);
    $('gStart').textContent = GOAL.plan_start;
    $('gEnd').textContent = GOAL.target_date;
    $('gCurrent').textContent = latest == null ? '--' : fmt(latest);
    const lost = (latest != null) ? WL_CALC.round2(GOAL.initial_weight - latest) : null;
    $('gLost').textContent = lost == null ? '--' : fmt(lost);
    const rem = WL_CALC.remaining(GOAL, latest != null ? latest : GOAL.initial_weight);
    $('gToLoseInline').textContent = rem ? fmt(rem.toLose) : '--';
    $('gDays').textContent = rem ? rem.days : '--';
    $('gNeedDaily').textContent = rem && rem.needDaily != null ? fmt(rem.needDaily) : '--';
  }

  function latestWeight() {
    if (!CHECKINS.length) return null;
    const sorted = [...CHECKINS].sort((a, b) => a.checkin_date < b.checkin_date ? 1 : -1);
    return sorted[0].weight;
  }

  function renderStats() { /* 已并入 renderGoal 概览 */ }

  function renderList() {
    const body = $('recBody');
    body.innerHTML = '';
    const sorted = [...CHECKINS].sort((a, b) => a.checkin_date < b.checkin_date ? 1 : -1);
    $('listCount').textContent = sorted.length ? `共 ${sorted.length} 条` : '';
    $('listEmpty').classList.toggle('hidden', sorted.length > 0);

    // 建议每日减（与目标概览口径一致：基于最新体重）
    const latestW = latestWeight();
    let needDaily = null;
    if (GOAL && latestW != null) {
      const rem = WL_CALC.remaining(GOAL, latestW);
      if (rem && rem.needDaily != null) needDaily = rem.needDaily;
    }

    sorted.forEach(c => {
      const est = WL_CALC.estimated(c.checkin_date, GOAL);
      const delta = WL_CALC.deltaVsYesterday(CHECKINS, c.checkin_date);
      // 当天掉秤 >= 建议每日减 → 👍；小于 → 👎（无昨日体重或未设目标不显示）
      const rate = (needDaily != null && delta != null)
        ? (delta >= needDaily ? '👍 ' : '👎 ')
        : '';
      const tr = document.createElement('tr');

      const tags = [];
      tags.push(c.foot_bath ? '<span class="tag">泡脚</span>' : '<span class="tag no">无泡脚</span>');
      tags.push(c.sneaking ? '<span class="tag no">偷吃</span>' : '<span class="tag">无偷吃</span>');
      tags.push(c.exercise ? `<span class="tag">动${c.exercise_hours || ''}</span>` : '<span class="tag no">无运动</span>');

      let deltaHtml = '<span class="muted">--</span>';
      if (delta != null) {
        if (delta > 0) deltaHtml = `<span class="down">▼${fmt(delta)}</span>`;
        else if (delta < 0) deltaHtml = `<span class="up">▲${fmt(-delta)}</span>`;
        else deltaHtml = '<span class="muted">0</span>';
      }

      tr.innerHTML = `
        <td><div class="date">${rate}${c.checkin_date}</div><div>${tags.join('')}</div></td>
        <td>${est == null ? '--' : fmt(est)}</td>
        <td><b>${fmt(c.weight)}</b></td>
        <td>${c.body_fat == null ? '--' : fmt(c.body_fat)}</td>
        <td>${c.bedtime || '--'}</td>
        <td>${deltaHtml}</td>
        <td><div class="row-ops">
          <button class="copy-btn" data-copy="${c.checkin_date}">复制</button>
          <button class="del-btn" data-del="${c.checkin_date}">删</button>
        </div></td>`;
      body.appendChild(tr);
    });

    body.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => onCopy(btn.dataset.copy));
    });

    body.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('确定删除 ' + btn.dataset.del + ' 的记录？')) return;
        try {
          await WL_DB.deleteCheckin(btn.dataset.del);
          CHECKINS = await WL_DB.getCheckins();
          renderAll();
          toast('已删除');
        } catch (e) { toast('删除失败：' + e.message); }
      });
    });
  }

  // ---------- 图表页面 ----------
  function openPage(which) {
    closeModals();
    if (which === 'weight') { $('weightPage').classList.remove('hidden'); renderWeightPage(); }
    else if (which === 'fat') { $('fatPage').classList.remove('hidden'); renderFatPage(); }
    else if (which === 'goals') { $('goalHistPage').classList.remove('hidden'); renderGoalHistory(); }
    window.scrollTo(0, 0);
  }
  function closePage() {
    $('weightPage').classList.add('hidden');
    $('fatPage').classList.add('hidden');
    $('goalHistPage').classList.add('hidden');
  }

  function buildWeightChart(canvasId, refName) {
    const sorted = [...CHECKINS].sort((a, b) => a.checkin_date < b.checkin_date ? -1 : 1);
    const labels = sorted.map(c => c.checkin_date);
    const actual = sorted.map(c => c.weight);
    const est = sorted.map(c => WL_CALC.estimated(c.checkin_date, GOAL));
    const ctx = $(canvasId).getContext('2d');
    if (window[refName]) window[refName].destroy();
    window[refName] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '实际体重', data: actual, borderColor: '#ff6b6b', backgroundColor: 'rgba(255,107,107,.12)', tension: .3, fill: true, pointRadius: 3, spanGaps: true },
          ...(GOAL ? [{ label: '预估体重', data: est, borderColor: '#9aa3af', borderDash: [6, 4], tension: .3, pointRadius: 0, fill: false, spanGaps: true }] : [])
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } } },
        scales: { y: { ticks: { font: { size: 11 } } }, x: { ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } } }
      }
    });
  }

  function buildFatChart(canvasId, refName) {
    const sorted = [...CHECKINS].filter(c => c.body_fat != null).sort((a, b) => a.checkin_date < b.checkin_date ? -1 : 1);
    const labels = sorted.map(c => c.checkin_date);
    const vals = sorted.map(c => c.body_fat);
    const ctx = $(canvasId).getContext('2d');
    if (window[refName]) window[refName].destroy();
    window[refName] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: '体脂率(%)', data: vals, borderColor: '#5b6bdf', backgroundColor: 'rgba(91,107,223,.12)', tension: .3, fill: true, pointRadius: 3, spanGaps: true }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } } },
        scales: { y: { ticks: { font: { size: 11 } } }, x: { ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } } }
      }
    });
  }

  function fatDelta(dateStr) {
    const sorted = [...CHECKINS].filter(c => c.body_fat != null).sort((a, b) => a.checkin_date < b.checkin_date ? -1 : 1);
    const i = sorted.findIndex(c => c.checkin_date === dateStr);
    if (i <= 0) return null;
    return WL_CALC.round2(sorted[i - 1].body_fat - sorted[i].body_fat);
  }

  function deltaHtml(delta) {
    if (delta == null) return '<span class="muted">--</span>';
    if (delta > 0) return `<span class="down">▼${fmt(delta)}</span>`;
    if (delta < 0) return `<span class="up">▲${fmt(-delta)}</span>`;
    return '<span class="muted">0</span>';
  }

  function renderWeightPage() {
    buildWeightChart('weightChartPage', 'weightPageChart');
    const body = $('weightRecBody'); body.innerHTML = '';
    $('weightListCount').textContent = CHECKINS.length ? `共 ${CHECKINS.length} 条` : '';
    const sorted = [...CHECKINS].sort((a, b) => a.checkin_date < b.checkin_date ? 1 : -1);
    sorted.forEach(c => {
      const est = WL_CALC.estimated(c.checkin_date, GOAL);
      const delta = WL_CALC.deltaVsYesterday(CHECKINS, c.checkin_date);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><div class="date">${c.checkin_date}</div></td><td>${est == null ? '--' : fmt(est)}</td><td><b>${fmt(c.weight)}</b></td><td>${deltaHtml(delta)}</td>`;
      body.appendChild(tr);
    });
  }

  function renderFatPage() {
    buildFatChart('fatChartPage', 'fatPageChart');
    const body = $('fatRecBody'); body.innerHTML = '';
    const sorted = [...CHECKINS].filter(c => c.body_fat != null).sort((a, b) => a.checkin_date < b.checkin_date ? 1 : -1);
    $('fatListCount').textContent = sorted.length ? `共 ${sorted.length} 条` : '暂无';
    sorted.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><div class="date">${c.checkin_date}</div></td><td><b>${fmt(c.body_fat)}</b></td><td>${deltaHtml(fatDelta(c.checkin_date))}</td>`;
      body.appendChild(tr);
    });
  }

  // ---------- 历史目标 ----------
  function renderGoalHistory() {
    const body = $('goalHistBody');
    if (!body) return;
    body.innerHTML = '';
    const latest = latestWeight();
    const list = [...GOALS].sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || '')));
    $('goalHistCount').textContent = list.length ? `共 ${list.length} 条` : '';
    $('goalHistEmpty').classList.toggle('hidden', list.length > 0);

    list.forEach(g => {
      // 实际减重 = 该目标初始体重 − 当前最新体重（每天随打卡更新）
      const lost = latest == null ? null : WL_CALC.round2(Number(g.initial_weight) - latest);
      let lostHtml = '<span class="muted">--</span>';
      if (lost != null) {
        if (lost > 0) lostHtml = `<span class="down">▼${fmt(lost)}</span>`;
        else if (lost < 0) lostHtml = `<span class="up">▲${fmt(-lost)}</span>`;
        else lostHtml = '<span class="muted">0</span>';
      }
      // 是否达成 = 当前体重 ≤ 目标体重
      const reached = latest != null && latest <= Number(g.target_weight);
      const reachedHtml = reached
        ? '<span class="pill-ok">✅ 达成</span>'
        : '<span class="pill-no">❌ 未达成</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmt(g.initial_weight)}</td>
        <td>${fmt(g.target_weight)}</td>
        <td><div class="date">${shortDate(g.plan_start)}~${shortDate(g.target_date)}</div></td>
        <td>${lostHtml}</td>
        <td>${reachedHtml}</td>`;
      body.appendChild(tr);
    });
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
