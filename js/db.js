// ============================================================
// 数据层：Supabase 优先，未配置时自动回退 localStorage
// 暴露 window.WL_DB
// ============================================================
(function () {
  const LS_GOAL = 'wl_goal';
  const LS_CHECKINS = 'wl_checkins';
  const LS_SB = 'wl_supabase';

  function getSBConfig() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SB) || 'null');
      if (s && s.url && s.anonKey) return s;
    } catch (e) {}
    if (window.WL_CONFIG && window.WL_CONFIG.SUPABASE_URL && window.WL_CONFIG.SUPABASE_ANON_KEY) {
      return { url: window.WL_CONFIG.SUPABASE_URL, anonKey: window.WL_CONFIG.SUPABASE_ANON_KEY };
    }
    return null;
  }

  let sbClient = null;
  let sbMode = false;

  async function initSB() {
    const cfg = getSBConfig();
    if (!cfg) { sbMode = false; return false; }
    try {
      if (!window.supabase) throw new Error('Supabase JS 未加载');
      sbClient = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: false }
      });
      // 探活：尝试读取目标表首行
      const { error } = await sbClient.from('goals').select('id').limit(1);
      if (error) throw error;
      sbMode = true;
      return true;
    } catch (e) {
      console.error('[WL] Supabase 初始化失败，回退本地：', e.message);
      sbMode = false;
      return false;
    }
  }

  function nowLocalDate() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }

  // ---------- GOAL（历史化：每次保存新增一行，当前目标 = 最新一行） ----------
  function normalizeGoalList(raw) {
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];   // 兼容早期「单对象」本地存储
  }
  function goalTime(g) { return String((g && g.created_at) || ''); }
  function sortGoalsDesc(list) {
    return list.slice().sort((a, b) => goalTime(b).localeCompare(goalTime(a)));
  }
  function isSameGoal(a, b) {
    if (!a || !b) return false;
    return Number(a.initial_weight) === Number(b.initial_weight)
      && Number(a.target_weight) === Number(b.target_weight)
      && a.plan_start === b.plan_start
      && a.target_date === b.target_date;
  }

  // 全部历史目标（最新在前）
  async function getGoals() {
    if (sbMode && sbClient) {
      const { data, error } = await sbClient
        .from('goals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    try {
      return sortGoalsDesc(normalizeGoalList(JSON.parse(localStorage.getItem(LS_GOAL) || 'null')));
    } catch (e) { return []; }
  }

  // 当前目标 = 最新一条
  async function getGoal() {
    const list = await getGoals();
    return list.length ? list[0] : null;
  }

  // 保存目标：作为一条新历史插入；与最新一条完全相同则不重复插入
  async function saveGoal(goal) {
    const now = new Date().toISOString();
    const rec = {
      ...goal,
      key: 'v' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      created_at: now, updated_at: now
    };
    if (sbMode && sbClient) {
      const list = await getGoals();
      if (list.length && isSameGoal(list[0], goal)) return list[0];
      try {
        // 正常路径：追加一条历史（key 唯一，不冲突）
        const { data, error } = await sbClient.from('goals').insert(rec).select();
        if (error) throw error;
        return data[0];
      } catch (e) {
        // 兜底：若云端不允许追加多行，退回「更新当前行」，保证保存目标不失败
        console.warn('[WL] 追加目标历史失败，回退单行更新：', e.message);
        const fallback = { ...goal, key: 'active', updated_at: now };
        const { data, error } = await sbClient
          .from('goals').upsert(fallback, { onConflict: 'key' }).select();
        if (error) throw error;
        return data[0];
      }
    }
    const arr = normalizeGoalList((() => {
      try { return JSON.parse(localStorage.getItem(LS_GOAL) || 'null'); } catch (e) { return null; }
    })());
    const sorted = sortGoalsDesc(arr);
    if (sorted.length && isSameGoal(sorted[0], goal)) return sorted[0];
    arr.push(rec);
    localStorage.setItem(LS_GOAL, JSON.stringify(arr));
    return rec;
  }

  // ---------- CHECKINS ----------
  async function getCheckins() {
    if (sbMode && sbClient) {
      const { data, error } = await sbClient
        .from('checkins').select('*').order('checkin_date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    try {
      const arr = JSON.parse(localStorage.getItem(LS_CHECKINS) || '[]');
      return arr.sort((a, b) => a.checkin_date < b.checkin_date ? -1 : 1);
    } catch (e) { return []; }
  }

  async function saveCheckin(c) {
    const rec = { ...c, updated_at: new Date().toISOString() };
    if (sbMode && sbClient) {
      const { data, error } = await sbClient
        .from('checkins').upsert(rec, { onConflict: 'checkin_date' }).select();
      if (error) throw error;
      return data[0];
    }
    const arr = JSON.parse(localStorage.getItem(LS_CHECKINS) || '[]');
    const i = arr.findIndex(x => x.checkin_date === c.checkin_date);
    if (i >= 0) arr[i] = rec; else arr.push(rec);
    localStorage.setItem(LS_CHECKINS, JSON.stringify(arr));
    return rec;
  }

  async function deleteCheckin(date) {
    if (sbMode && sbClient) {
      const { error } = await sbClient.from('checkins').delete().eq('checkin_date', date);
      if (error) throw error;
      return;
    }
    let arr = JSON.parse(localStorage.getItem(LS_CHECKINS) || '[]');
    arr = arr.filter(x => x.checkin_date !== date);
    localStorage.setItem(LS_CHECKINS, JSON.stringify(arr));
  }

  window.WL_DB = {
    initSB, getSBConfig,
    setSBConfig: (cfg) => localStorage.setItem(LS_SB, JSON.stringify(cfg)),
    isSB: () => sbMode,
    getGoal, getGoals, saveGoal, getCheckins, saveCheckin, deleteCheckin, nowLocalDate
  };
})();
