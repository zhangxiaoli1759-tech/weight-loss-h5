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

  // ---------- GOAL ----------
  async function getGoal() {
    if (sbMode && sbClient) {
      const { data, error } = await sbClient
        .from('goals').select('*').order('created_at', { ascending: false }).limit(1);
      if (error) throw error;
      return (data && data.length) ? data[0] : null;
    }
    try { return JSON.parse(localStorage.getItem(LS_GOAL) || 'null'); } catch (e) { return null; }
  }

  async function saveGoal(goal) {
    const rec = { ...goal, key: 'active', updated_at: new Date().toISOString() };
    if (sbMode && sbClient) {
      const { data, error } = await sbClient
        .from('goals').upsert(rec, { onConflict: 'key' }).select();
      if (error) throw error;
      return data[0];
    }
    localStorage.setItem(LS_GOAL, JSON.stringify(rec));
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
    getGoal, saveGoal, getCheckins, saveCheckin, deleteCheckin, nowLocalDate
  };
})();
