/**
 * ============================================================================
 * PAKKAWARU GROUP — DASHBOARD OMSET (app.js v8)
 * v7: data diambil LANGSUNG dari Google Sheet lewat Apps Script API
 *     (tidak ada lagi angka/kredensial yang tertanam di file ini).
 * - Login (username/password/PIN) diperiksa di SERVER, bukan di browser
 * - Auto-refresh tiap 2 menit + tombol Refresh + penanda "Data s.d."
 * - Emas SJP/PPM: bisa dilihat Riil 100% maupun ÷3
 * ============================================================================
 */

// Tempel URL Web App Apps Script di sini (berakhiran /exec).
// Boleh dikosongkan: layar login akan meminta URL-nya sekali saja.
const API_URL_DEFAULT = 'https://script.google.com/macros/s/AKfycbzx8YqZnUEvAmANZwueuD50DZxvLfupRK0DzVT0RmaolNYxWrJ2smwyi4PxqcRIoc1mjw/exec';

const SESSION_KEY = 'pg_token_v7';
const DATA_CACHE_KEY = 'pg_data_cache_v7';
const REFRESH_MS = 120000;
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const SOURCE_NAMES = {
  tiktokSafwan: 'Tiktok Safwan', shopeeSafwan: 'Shopee Safwan', shopeeMalaysia: 'Shopee Malaysia',
  tiktokAnsan: 'Tiktok Ansan', metaLp: 'Meta Pakkawaru', shopeeAnsan: 'Shopee Ansan', shopeeBasyirah: 'Shopee Basyirah', metaBqy: 'Meta BQY',
  amalqu: 'Yayasan Amalqu', latihhobi: 'Latih Hobi', sjp: 'SJP (Emas)', ppm: 'PPM (Emas)'
};

function getApiUrl() {
  return (localStorage.getItem('pg_api_url') || API_URL_DEFAULT || '').trim();
}

let DATA = null;                 // payload terakhir dari server
let refreshTimer = null;
let fetching = false;

function todayJakartaIso() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

const STATE = {
  myrRate: 4452,
  currentMonth: todayJakartaIso().slice(0, 7),   // bulan berjalan (ditentukan dari tanggal data terbaru)
  allKey: todayJakartaIso().slice(0, 4) + '-ALL',
  latestDate: todayJakartaIso(),
  activeTab: 'holding',       // holding | safwan | ansan | amalqu | latihhobi | sjp | ppm
  holdingRegion: 'all',       // all | Bandung | Gorontalo
  subChannel: 'all',          // all | tiktokSafwan | shopeeSafwan | shopeeMalaysia | dst.
  selectedMonth: todayJakartaIso().slice(0, 7),
  lastMonth: todayJakartaIso().slice(0, 7),   // bulan terakhir yang dilihat sebelum pindah ke Setahun
  filtersOpen: false,         // panel filter di ponsel
  share: null,                // bahan teks 'Bagikan ringkasan'
  rangePreset: 'this_month',
  startDate: todayJakartaIso().slice(0, 7) + '-01',
  endDate: todayJakartaIso(),
  goldMode: 'div3',           // div3 = omset emas dibagi 3 | raw = penjualan riil 100%
  chartMode: 'custom_target',
  barChart: null,
  donutChart: null
};

/**
 * 1. DATA MASTER 6 ENTITAS (angka target di bawah hanya cadangan;
 *    nilai sebenarnya dibaca dari tab "Target Omset" lewat API)
 */
const ENTITY_META = {
  safwan: { key: 'safwan', name: 'PT Safwan Berkah Indonesia', short: 'PT Safwan', region: 'Bandung', targetBulanan: 2918467000, targetHarian: 97282233, isGold: false, hasQty: true },
  ansan: { key: 'ansan', name: 'PT BQY Ansan Pakkawaru', short: 'PT BQY Ansan', region: 'Bandung', targetBulanan: 2244832500, targetHarian: 74827750, isGold: false, hasQty: true },
  amalqu: { key: 'amalqu', name: 'Yayasan Amalqu Indonesia Peduli', short: 'Yayasan Amalqu', region: 'Bandung', targetBulanan: 650000000, targetHarian: 21666667, isGold: false, hasQty: false },
  latihhobi: { key: 'latihhobi', name: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', short: 'Latih Hobi', region: 'Bandung', targetBulanan: 541654000, targetHarian: 24620636, isGold: false, hasQty: false },
  sjp: { key: 'sjp', name: 'CV Selamat Jaya Pakkawaru', short: 'CV SJP (Emas)', region: 'Gorontalo', targetBulanan: 1000000000, targetHarian: 33333333, isGold: true, hasQty: false },
  ppm: { key: 'ppm', name: 'Pakkawaru Permata Mulia', short: 'PPM (Emas)', region: 'Gorontalo', targetBulanan: 750000000, targetHarian: 25000000, isGold: true, hasQty: false }
};

// Diisi dari API (tab "Pencapaian Bulanan 2026"): { '2026-01': { label, safwan:[target, omset], ... } }
const MONTHLY_HISTORY_2026 = {};

// Diisi dari API. Format tiap tanggal: [validQty, validOmset, cancelQty, cancelOmset]
const REALTIME_NOV_DAILY = {};

/**
 * 2. PENGAMBILAN DATA & LOGIN (SERVER-SIDE)
 */
async function apiCall(body) {
  const url = getApiUrl();
  if (!url) throw new Error('URL API belum diisi.');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error('Server membalas HTTP ' + res.status);
  return res.json();
}

function ingestData(data) {
  DATA = data;
  STATE.myrRate = Number(localStorage.getItem('pg_myr_override')) || data.kurs || 4452;
  STATE.latestDate = data.latestDate || todayJakartaIso();
  STATE.currentMonth = STATE.latestDate.slice(0, 7);
  STATE.allKey = STATE.currentMonth.slice(0, 4) + '-ALL';

  const t = data.targets || {};
  Object.keys(ENTITY_META).forEach(k => {
    if (t[k] && t[k].bulan > 0) {
      ENTITY_META[k].targetBulanan = t[k].bulan;
      ENTITY_META[k].targetHarian = t[k].harian > 0 ? t[k].harian : Math.round(t[k].bulan / 30);
    }
  });

  Object.keys(REALTIME_NOV_DAILY).forEach(k => delete REALTIME_NOV_DAILY[k]);
  Object.entries(data.channels || {}).forEach(([id, ch]) => { REALTIME_NOV_DAILY[id] = ch.d || {}; });
  Object.entries(data.daily || {}).forEach(([id, ch]) => { REALTIME_NOV_DAILY[id] = ch.d || {}; });

  Object.keys(MONTHLY_HISTORY_2026).forEach(k => delete MONTHLY_HISTORY_2026[k]);
  Object.keys(data.monthly || {}).sort().forEach(key => {
    if (key >= STATE.currentMonth || key.slice(0, 4) !== STATE.currentMonth.slice(0, 4)) return;
    const m = Number(key.slice(5, 7));
    MONTHLY_HISTORY_2026[key] = Object.assign({ label: `${MONTH_NAMES[m - 1]} ${key.slice(0, 4)}` }, data.monthly[key]);
  });

  const validMonths = [STATE.currentMonth, ...Object.keys(MONTHLY_HISTORY_2026), STATE.allKey];
  if (!validMonths.includes(STATE.selectedMonth)) STATE.selectedMonth = STATE.currentMonth;
  if (!validMonths.includes(STATE.lastMonth) || STATE.lastMonth === STATE.allKey) STATE.lastMonth = STATE.currentMonth;
  buildMonthSelector();
  applyPreset(STATE.rangePreset, true);
}

function monthStartIso() { return STATE.currentMonth + '-01'; }

function applyPreset(r, keepIfCustom) {
  const latest = STATE.latestDate;
  const endDay = Number(latest.slice(8, 10));
  if (r === 'this_month') { STATE.startDate = monthStartIso(); STATE.endDate = latest; }
  else if (r === 'first_7') { STATE.startDate = monthStartIso(); STATE.endDate = STATE.currentMonth + '-07'; }
  else if (r === '10_days') { STATE.startDate = monthStartIso(); STATE.endDate = STATE.currentMonth + '-10'; }
  else if (r === 'last_7') {
    STATE.startDate = STATE.currentMonth + '-' + String(Math.max(1, endDay - 6)).padStart(2, '0');
    STATE.endDate = latest;
  } else if (!keepIfCustom) { return; }
  // custom: biarkan, tapi pastikan masih berada dalam bulan berjalan
  if (STATE.startDate.slice(0, 7) !== STATE.currentMonth) STATE.startDate = monthStartIso();
  if (STATE.endDate.slice(0, 7) !== STATE.currentMonth) STATE.endDate = latest;
  const s = document.getElementById('filterStartDate'), e = document.getElementById('filterEndDate');
  if (s) { s.min = monthStartIso(); s.max = STATE.currentMonth + '-31'; s.value = STATE.startDate; }
  if (e) { e.min = monthStartIso(); e.max = STATE.currentMonth + '-31'; e.value = STATE.endDate; }
  renderPresetButtons();
}

function renderPresetButtons() {
  const c = document.getElementById('realtimeDatePresets');
  if (!c) return;
  const mon = MONTH_NAMES[Number(STATE.currentMonth.slice(5, 7)) - 1].slice(0, 3);
  const d = Number(STATE.latestDate.slice(8, 10));
  const items = [
    ['this_month', `Bulan Berjalan (1–${d} ${mon})`],
    ['first_7', `1–7 ${mon} (7 Hari)`],
    ['10_days', `1–10 ${mon} (10 Hari)`],
    ['last_7', '7 Hari Terakhir']
  ];
  c.innerHTML = items.map(([k, label]) => `<button class="chip-btn ${STATE.rangePreset === k ? 'active' : ''}" data-range="${k}">${label}</button>`).join('');
  c.querySelectorAll('.chip-btn').forEach(btn => btn.addEventListener('click', () => {
    STATE.rangePreset = btn.dataset.range;
    applyPreset(STATE.rangePreset);
    renderApp();
  }));
}

function buildMonthSelector() {
  const sel = document.getElementById('monthSelector');
  if (!sel) return;
  const cm = Number(STATE.currentMonth.slice(5, 7));
  const opts = [`<option value="${STATE.currentMonth}">${MONTH_NAMES[cm - 1]} ${STATE.currentMonth.slice(0, 4)} (Realtime)</option>`];
  Object.keys(MONTHLY_HISTORY_2026).sort().reverse().forEach(k => {
    opts.push(`<option value="${k}">${MONTHLY_HISTORY_2026[k].label}</option>`);
  });
  sel.innerHTML = opts.join('');
  sel.value = isYear() ? (STATE.lastMonth || STATE.currentMonth) : STATE.selectedMonth;
}

function goldVal(raw) {
  return STATE.goldMode === 'raw' ? Math.round(raw) : Math.round(raw / 3);
}
function goldTag() { return STATE.goldMode === 'raw' ? 'Riil 100%' : '÷ 3'; }

function dayOfYearIso(iso) {
  const d = new Date(iso + 'T00:00:00Z'), j = new Date(iso.slice(0, 4) + '-01-01T00:00:00Z');
  return Math.round((d - j) / 86400000) + 1;
}

/** Jalankan fn dengan rentang tanggal sementara (dipakai untuk "Akumulasi Tahun" & tren bulan berjalan) */
function withRange(s, e, fn) {
  const bs = STATE.startDate, be = STATE.endDate;
  STATE.startDate = s; STATE.endDate = e;
  try { return fn(); } finally { STATE.startDate = bs; STATE.endDate = be; }
}

function monthFullReport(entityKey) {
  const days = Math.max(1, Number(STATE.latestDate.slice(8, 10)));
  return withRange(monthStartIso(), STATE.latestDate, () => computeRealtimeNovemberEntity(entityKey, days));
}



/* ======================= MODE SETAHUN ======================= */
function isYear() { return STATE.selectedMonth === STATE.allKey; }

function setScope(scope) {
  if (scope === 'year') {
    if (!isYear()) STATE.lastMonth = STATE.selectedMonth;
    STATE.selectedMonth = STATE.allKey;
  } else if (isYear()) {
    STATE.selectedMonth = STATE.lastMonth && STATE.lastMonth !== STATE.allKey ? STATE.lastMonth : STATE.currentMonth;
  }
  buildMonthSelector();
}

function daysInMonthOf(ym) { return new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate(); }

/**
 * Data 12 bulan untuk daftar entitas.
 *  - bulan lewat   : total akhir dari spreadsheet "Pencapaian Bulanan" (emas lewat goldVal)
 *  - bulan berjalan: dihitung langsung dari data penjualan (target = Target Omset)
 *  - bulan depan   : hanya target bila sudah diisi di spreadsheet
 */
function buildYearData(entityKeys) {
  const year = STATE.currentMonth.slice(0, 4);
  const monthly = (DATA && DATA.monthly) || {};
  const live = {};
  entityKeys.forEach(ek => { live[ek] = monthFullReport(ek); });
  const months = [];
  for (let i = 1; i <= 12; i++) {
    const key = `${year}-${String(i).padStart(2, '0')}`;
    const status = key < STATE.currentMonth ? 'past' : key === STATE.currentMonth ? 'current' : 'future';
    const m = { key, idx: i, name: MONTH_NAMES[i - 1], short: MONTH_NAMES[i - 1].slice(0, 3), status, target: 0, omset: null, raw: 0, targetToDate: 0, has: false, by: {} };
    entityKeys.forEach(ek => {
      const meta = ENTITY_META[ek];
      let t = 0, o = null, raw = 0, ttd = 0;
      if (status === 'current') {
        const r = live[ek];
        t = r.targetBulanan; o = r.validOmset; raw = meta.isGold ? r.rawBeforeDiv3 : r.validOmset; ttd = r.targetCustomTanggal;
      } else if (monthly[key] && monthly[key][ek]) {
        t = monthly[key][ek][0] || 0;
        if (status === 'past') { raw = monthly[key][ek][1] || 0; o = meta.isGold ? goldVal(raw) : raw; ttd = t; }
      }
      m.by[ek] = { target: t, omset: o, raw, targetToDate: ttd };
      m.target += t; m.raw += raw; m.targetToDate += ttd;
      if (o !== null) m.omset = (m.omset || 0) + o;
    });
    m.has = status === 'current' || (status === 'past' && m.omset !== null && (m.omset > 0 || m.target > 0)) || (status === 'future' && m.target > 0);
    m.pct = m.omset !== null && m.target > 0 ? pctOf(m.omset, m.target) : null;
    months.push(m);
  }
  const done = months.filter(m => m.status === 'past' && m.has);
  const cur = months.find(m => m.status === 'current');
  const sum = (arr, f) => arr.reduce((a, b) => a + f(b), 0);
  const omsetYtd = sum(months.filter(m => m.status !== 'future'), m => m.omset || 0);
  const targetYear = sum(months, m => m.target);
  const targetToDate = sum(months.filter(m => m.status !== 'future'), m => m.targetToDate);
  const hit = done.filter(m => m.pct >= 100).length;
  const near = done.filter(m => m.pct >= 70 && m.pct < 100).length;
  const byOmset = done.slice().sort((a, b) => b.omset - a.omset);
  const byPct = done.filter(m => m.pct !== null).slice().sort((a, b) => b.pct - a.pct);
  return {
    months, done, cur, omsetYtd, targetYear, targetToDate, hit, near,
    avg: done.length ? sum(done, m => m.omset) / done.length : 0,
    best: byOmset[0] || null, low: byOmset[byOmset.length - 1] || null, topPct: byPct[0] || null,
    futureWithTarget: months.filter(m => m.status === 'future' && m.target > 0).length
  };
}
function formatIDR(val) {
  const n = Math.round(Number(val) || 0);
  return (n < 0 ? '-Rp' : 'Rp') + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatMYR(val) {
  const n = Number(val) || 0;
  return 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(val) {
  const n = Number(val) || 0;
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return s + 'Rp' + (a / 1e9).toFixed(2).replace('.', ',') + ' M';
  if (a >= 1e6) return s + 'Rp' + (a / 1e6).toFixed(1).replace('.', ',') + ' Jt';
  return formatIDR(n);
}

function getActiveDaysCount() {
  if (STATE.selectedMonth === STATE.allKey) return Math.max(1, dayOfYearIso(STATE.latestDate));
  if (STATE.selectedMonth !== STATE.currentMonth) return 30;
  const s = new Date(STATE.startDate + 'T00:00:00');
  const e = new Date(STATE.endDate + 'T00:00:00');
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function formatReadableRange() {
  if (STATE.selectedMonth === STATE.allKey) return 'Akumulasi Tahun ' + STATE.currentMonth.slice(0, 4);
  if (STATE.selectedMonth !== STATE.currentMonth) return (MONTHLY_HISTORY_2026[STATE.selectedMonth] || {}).label || STATE.selectedMonth;
  const mon = MONTH_NAMES[Number(STATE.currentMonth.slice(5, 7)) - 1].slice(0, 3);
  const sDay = Number(STATE.startDate.slice(8, 10));
  const eDay = Number(STATE.endDate.slice(8, 10));
  return `${sDay} ${mon} – ${eDay} ${mon} ${STATE.currentMonth.slice(0, 4)} (${getActiveDaysCount()} Hari)`;
}

function isDateInFilter(dt) {
  return dt >= STATE.startDate && dt <= STATE.endDate;
}

function sumSeries(seriesObj, isMyr = false) {
  let validQty = 0, validOmset = 0, cancelQty = 0, cancelOmset = 0, rawMyrValid = 0, rawMyrCancel = 0;
  Object.entries(seriesObj || {}).forEach(([dt, arr]) => {
    if (isDateInFilter(dt)) {
      validQty += arr[0];
      cancelQty += arr[2];
      if (isMyr) {
        rawMyrValid = Number((rawMyrValid + arr[1]).toFixed(2));
        rawMyrCancel = Number((rawMyrCancel + arr[3]).toFixed(2));
        validOmset += Math.round(arr[1] * STATE.myrRate);
        cancelOmset += Math.round(arr[3] * STATE.myrRate);
      } else {
        validOmset += arr[1];
        cancelOmset += arr[3];
      }
    }
  });
  return { validQty, validOmset, cancelQty, cancelOmset, rawMyrValid, rawMyrCancel };
}

/**
 * Menghitung Metrik Lengkap per Entitas (Target Custom = Jumlah Hari x Target Harian)
 */
function computeEntityReport(entityKey) {
  const meta = ENTITY_META[entityKey];
  const days = getActiveDaysCount();

  if (STATE.selectedMonth !== STATE.currentMonth) {
    let targetBulanan = 0, rawOmset = 0;
    if (STATE.selectedMonth === STATE.allKey) {
      Object.values(MONTHLY_HISTORY_2026).forEach(m => {
        targetBulanan += m[entityKey][0];
        rawOmset += m[entityKey][1];
      });
      const novRep = monthFullReport(entityKey);
      targetBulanan += meta.targetBulanan;
      rawOmset += meta.isGold ? novRep.rawBeforeDiv3 : novRep.validOmset;
    } else {
      const mData = MONTHLY_HISTORY_2026[STATE.selectedMonth];
      targetBulanan = mData[entityKey][0];
      rawOmset = mData[entityKey][1];
    }

    const omsetTercapai = meta.isGold ? goldVal(rawOmset) : rawOmset;
    const targetHarian = Math.round(targetBulanan / 30);
    const targetCustomTanggal = targetBulanan;
    const estimasiBulan = omsetTercapai;
    const persenBulanan = targetBulanan > 0 ? Number(((omsetTercapai / targetBulanan) * 100).toFixed(2)) : 0;

    return {
      ...meta,
      targetBulanan,
      targetHarian,
      targetCustomTanggal,
      validOmset: omsetTercapai,
      rawBeforeDiv3: rawOmset,
      validQty: 0,
      cancelQty: 0,
      cancelOmset: 0,
      rawMyrValid: 0,
      rawMyrCancel: 0,
      cancelRatePct: 0,
      estimasiBulan,
      estimasiPct: persenBulanan,
      persenBulanan,
      persenCustomTanggal: persenBulanan,
      channels: []
    };
  }

  return computeRealtimeNovemberEntity(entityKey, days);
}

function computeRealtimeNovemberEntity(entityKey, days = 17) {
  const meta = ENTITY_META[entityKey];
  const targetBulanan = meta.targetBulanan;
  const targetHarian = meta.targetHarian;
  // Rumus Pasti: Target Custom Tanggal = Jumlah Hari Custom x Target Harian
  const targetCustomTanggal = Math.round(targetHarian * days);

  let validQty = 0, validOmset = 0, cancelQty = 0, cancelOmset = 0, rawBeforeDiv3 = 0;
  let rawMyrValid = 0, rawMyrCancel = 0;
  let channels = [];

  if (entityKey === 'safwan') {
    const ttId = sumSeries(REALTIME_NOV_DAILY.tiktokSafwan, false);
    const shId = sumSeries(REALTIME_NOV_DAILY.shopeeSafwan, false);
    const shMy = sumSeries(REALTIME_NOV_DAILY.shopeeMalaysia, true);

    channels = [
      { id: 'tiktokSafwan', name: 'Tiktok Safwan', ...ttId, isMyr: false },
      { id: 'shopeeSafwan', name: 'Shopee Safwan', ...shId, isMyr: false },
      { id: 'shopeeMalaysia', name: 'Shopee Malaysia Safwan', ...shMy, isMyr: true }
    ];

    const filteredCh = STATE.activeTab === 'safwan' && STATE.subChannel !== 'all'
      ? channels.filter(c => c.id === STATE.subChannel)
      : channels;

    filteredCh.forEach(c => {
      validQty += c.validQty;
      validOmset += c.validOmset;
      cancelQty += c.cancelQty;
      cancelOmset += c.cancelOmset;
      if (c.isMyr) {
        rawMyrValid += c.rawMyrValid;
        rawMyrCancel += c.rawMyrCancel;
      }
    });
  } else if (entityKey === 'ansan') {
    const ttAn = sumSeries(REALTIME_NOV_DAILY.tiktokAnsan, false);
    const mtLp = sumSeries(REALTIME_NOV_DAILY.metaLp, false);
    const shAn = sumSeries(REALTIME_NOV_DAILY.shopeeAnsan, false);
    const shBs = sumSeries(REALTIME_NOV_DAILY.shopeeBasyirah, false);
    const mtBq = sumSeries(REALTIME_NOV_DAILY.metaBqy, false);

    channels = [
      { id: 'tiktokAnsan', name: 'Tiktok Ansan', ...ttAn, isMyr: false },
      { id: 'metaLp', name: 'Meta Pakkawaru Ansan (LP)', ...mtLp, isMyr: false },
      { id: 'shopeeAnsan', name: 'Shopee Ansan', ...shAn, isMyr: false },
      { id: 'shopeeBasyirah', name: 'Shopee Basyirah Ansan', ...shBs, isMyr: false },
      { id: 'metaBqy', name: 'Meta BQY Ansan', ...mtBq, isMyr: false }
    ];

    const filteredCh = STATE.activeTab === 'ansan' && STATE.subChannel !== 'all'
      ? channels.filter(c => c.id === STATE.subChannel)
      : channels;

    filteredCh.forEach(c => {
      validQty += c.validQty;
      validOmset += c.validOmset;
      cancelQty += c.cancelQty;
      cancelOmset += c.cancelOmset;
    });
  } else if (entityKey === 'amalqu') {
    const am = sumSeries(REALTIME_NOV_DAILY.amalqu, false);
    validQty = am.validQty;
    validOmset = am.validOmset;
  } else if (entityKey === 'latihhobi') {
    const lh = sumSeries(REALTIME_NOV_DAILY.latihhobi, false);
    validQty = lh.validQty;
    validOmset = lh.validOmset;
  } else if (entityKey === 'sjp' || entityKey === 'ppm') {
    const g = sumSeries(REALTIME_NOV_DAILY[entityKey], false);
    rawBeforeDiv3 = g.validOmset;
    validOmset = goldVal(rawBeforeDiv3);
    validQty = g.validQty;
  }

  const totalGrossSales = validOmset + cancelOmset;
  const cancelRatePct = totalGrossSales > 0 ? Number(((cancelOmset / totalGrossSales) * 100).toFixed(2)) : 0;

  const dailyAverage = days > 0 ? validOmset / days : 0;
  const estimasiBulan = Math.round(dailyAverage * 30);
  const estimasiPct = targetBulanan > 0 ? Number(((estimasiBulan / targetBulanan) * 100).toFixed(2)) : 0;
  const persenBulanan = targetBulanan > 0 ? Number(((validOmset / targetBulanan) * 100).toFixed(2)) : 0;
  const persenCustomTanggal = targetCustomTanggal > 0 ? Number(((validOmset / targetCustomTanggal) * 100).toFixed(2)) : 0;

  return {
    ...meta,
    targetBulanan,
    targetHarian,
    targetCustomTanggal,
    validOmset,
    rawBeforeDiv3,
    validQty,
    cancelQty,
    cancelOmset,
    rawMyrValid,
    rawMyrCancel,
    cancelRatePct,
    estimasiBulan,
    estimasiPct,
    persenBulanan,
    persenCustomTanggal,
    channels
  };
}

/**
 * ============================================================================
 * TAMPILAN (v8) — hanya menyajikan angka dari fungsi hitung di atas.
 * ============================================================================
 */
const ENTITY_COLOR = { safwan: '#2a78d6', ansan: '#eb6834', amalqu: '#1baf7a', latihhobi: '#eda100', sjp: '#e87ba4', ppm: '#6250d6' };
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'];
const BRAND = '#0B6B57';

const ICON = {
  target: '<path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6a6 6 0 1 0 6 6"/><circle cx="12" cy="12" r="2"/><path d="M22 2l-9 9"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="17" cy="14.5" r="1.2"/>',
  trend: '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  bag: '<path d="M6 2l-2 5v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-2-5z"/><line x1="4" y1="7" x2="20" y2="7"/><path d="M16 11a4 4 0 0 1-8 0"/>',
  undo: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
  check: '<circle cx="12" cy="12" r="10"/><polyline points="8 12.5 11 15.5 16 9"/>',
  minus: '<circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  chev: '<polyline points="6 9 12 15 18 9"/>'
};
function svgIcon(name, size = 18, extra = '') {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICON[name]}</svg>`;
}

const $id = id => document.getElementById(id);
const pctOf = (a, b) => (b > 0 ? (a / b) * 100 : 0);
function fmtPct(n, d = 1) { return (Number(n) || 0).toFixed(d).replace('.', ',') + '%'; }
function fmtInt(n) { return (Number(n) || 0).toLocaleString('id-ID'); }

function statusOf(p) {
  if (p >= 100) return { cls: 'chip-good', icon: 'check', label: 'Di atas target' };
  if (p >= 70) return { cls: 'chip-warn', icon: 'minus', label: 'Mendekati target' };
  return { cls: 'chip-bad', icon: 'alert', label: 'Di bawah target' };
}
function statusChip(p) {
  const s = statusOf(p);
  return `<span class="chip ${s.cls}">${svgIcon(s.icon, 15)}${s.label}</span>`;
}

/* ------------------------------ HERO ------------------------------------- */
/* Status untuk periode yang masih berjalan: dibandingkan dengan jalur target (hari berjalan x target harian) */
function paceChip(p) {
  if (p >= 100) return `<span class="chip chip-good">${svgIcon('check', 15)}Sesuai jalur target</span>`;
  if (p >= 70) return `<span class="chip chip-warn">${svgIcon('minus', 15)}Agak tertinggal</span>`;
  return `<span class="chip chip-bad">${svgIcon('alert', 15)}Tertinggal dari target</span>`;
}

/* Konteks bulan yang sedang dilihat (nama, hari berjalan, apakah rentang tanggal masih bawaan) */
function monthCtx(isCurrent) {
  const ym = isCurrent ? STATE.currentMonth : STATE.selectedMonth;
  const mi = Number(ym.slice(5, 7)) - 1;
  return {
    monthName: MONTH_NAMES[mi], monthLabel: `${MONTH_NAMES[mi]} ${ym.slice(0, 4)}`,
    daysElapsed: isCurrent ? Math.max(1, Number(STATE.latestDate.slice(8, 10))) : daysInMonthOf(ym),
    daysInMonth: daysInMonthOf(ym),
    isDefaultRange: STATE.startDate === monthStartIso() && STATE.endDate === STATE.latestDate
  };
}

/**
 * Sorotan utama = omset bulan itu dibanding target bulan itu.
 * Target rentang tanggal (pilihan pengguna) tetap tampil sebagai baris tambahan.
 */
function renderHero(o) {
  const el = $id('customDateProgressStrip');
  const target = o.targetBulanan, om = o.monthOmset;
  const pctM = pctOf(om, target);
  const sisa = target - om;
  const daysLeft = o.isCurrent ? Math.max(0, o.daysInMonth - o.daysElapsed) : 0;
  const paceTarget = o.isCurrent ? o.targetHarian * o.daysElapsed : target;
  const pacePct = pctOf(om, paceTarget);
  const est = o.isCurrent ? o.estimasi : om;
  const max = Math.max(target, om, est, paceTarget, 1);
  const w = v => Math.max(0, Math.min(100, (v / max) * 100));
  const chip = o.isCurrent ? paceChip(pacePct) : statusChip(pctM);

  const title = pctM >= 100 ? `Target ${o.monthName} sudah tercapai` : `${fmtPct(pctM)} dari target ${o.monthName} sudah tercapai`;
  let sub = `<strong>${o.scope}</strong> mencatat omset ${formatIDR(om)} dari target bulanan ${formatIDR(target)}. `;
  if (sisa <= 0) sub += `Sudah melewati target sebesar ${formatIDR(-sisa)}.`;
  else if (o.isCurrent && daysLeft > 0) sub += `Sisa ${formatIDR(sisa)}, atau sekitar ${formatCompact(sisa / daysLeft)} per hari untuk ${daysLeft} hari yang tersisa.`;
  else sub += `Kurang ${formatIDR(sisa)} dari target.`;
  if (o.note) sub += ` <span class="hero-note">${o.note}</span>`;

  const items = [];
  items.push(`<div class="lg"><span class="lg-name"><i class="sw sw-fill"></i>Omset ${o.monthName}</span><span class="lg-val">${formatIDR(om)}</span><span class="lg-note">Rata-rata ${formatIDR(om / Math.max(1, o.daysElapsed))} per hari</span></div>`);
  items.push(`<div class="lg"><span class="lg-name"><i class="sw sw-end"></i>Target bulanan</span><span class="lg-val">${formatIDR(target)}</span><span class="lg-note">${sisa > 0 ? 'Sisa ' + formatIDR(sisa) : 'Lebih ' + formatIDR(-sisa)}</span></div>`);
  if (o.isCurrent) {
    items.push(`<div class="lg"><span class="lg-name"><i class="sw sw-tick"></i>Jalur target ${o.daysElapsed} hari</span><span class="lg-val">${formatIDR(paceTarget)}</span><span class="lg-note">Omset ${fmtPct(pacePct)} dari jalur</span></div>`);
    items.push(`<div class="lg"><span class="lg-name"><i class="sw sw-est"></i>Perkiraan akhir bulan</span><span class="lg-val">${formatIDR(est)}</span><span class="lg-note">${fmtPct(pctOf(est, target))} dari target bulan</span></div>`);
  } else {
    items.push(`<div class="lg"><span class="lg-name"><i class="sw sw-tick"></i>Selisih dengan target</span><span class="lg-val ${sisa > 0 ? 't-bad' : 't-good'}">${sisa > 0 ? '-' : '+'}${formatIDR(Math.abs(sisa))}</span><span class="lg-note">${sisa > 0 ? 'Belum tercapai' : 'Melampaui target'}</span></div>`);
    items.push(`<div class="lg"><span class="lg-name"><i class="sw sw-est"></i>Rata-rata per hari</span><span class="lg-val">${formatIDR(om / Math.max(1, o.daysInMonth))}</span><span class="lg-note">${o.daysInMonth} hari</span></div>`);
  }

  let range = '';
  if (o.isCurrent && o.range && !o.range.isDefault) {
    const rp = pctOf(o.range.omset, o.range.target);
    range = `<div class="hero-range">
      <div><span class="hr-label">Rentang tanggal dipilih</span><strong>${o.range.label}</strong></div>
      <div><span class="hr-label">Omset rentang ini</span><strong>${formatIDR(o.range.omset)}</strong></div>
      <div><span class="hr-label">Target ${o.range.days} hari</span><strong>${formatIDR(o.range.target)}</strong></div>
      <div><span class="hr-label">Capaian rentang</span><strong class="${rp >= 100 ? 't-good' : rp >= 70 ? 't-warn' : 't-bad'}">${fmtPct(rp)}</strong></div>
    </div>`;
  }

  el.innerHTML = `
    <div class="hero-top">
      <div>
        ${chip}
        <h2>${title}</h2>
        <p class="hero-sub">${sub}</p>
      </div>
      <div class="hero-pct"><strong>${fmtPct(pctM)}</strong><span>dari target ${o.monthLabel}</span></div>
    </div>
    <div class="track-wrap" role="img" aria-label="Omset ${formatIDR(om)}, target bulanan ${formatIDR(target)}${o.isCurrent ? ', perkiraan akhir bulan ' + formatIDR(est) : ''}">
      <div class="track">
        <div class="track-fill" style="width:${w(om)}%"></div>
        ${o.isCurrent ? `<div class="track-tick" style="left:${w(paceTarget)}%"></div>` : ''}
        ${o.isCurrent ? `<div class="track-est" style="left:${w(est)}%"></div>` : ''}
        <div class="track-end" style="left:${w(target)}%"></div>
      </div>
    </div>
    <div class="legend4">${items.join('')}</div>
    ${range}`;
}

/* ------------------------------ KARTU ANGKA ------------------------------ */
function kpiCard(c) {
  const rose = c.rose ? ' rose' : '';
  return `
    <article class="kpi">
      <div class="kpi-top"><span class="kpi-ico${rose}">${svgIcon(c.icon, 18)}</span><h3 class="kpi-title">${c.title}</h3></div>
      <div class="kpi-value">${c.value}</div>
      ${c.pct !== undefined ? `<div class="kpi-bar${rose}" aria-hidden="true"><i style="width:${Math.max(2, Math.min(100, c.pct))}%"></i></div>` : ''}
      <div class="kpi-rows">${c.rows.map(([k, v]) => `<div class="kpi-row"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>
    </article>`;
}

function renderKpis(cards) {
  const grid = $id('primaryKpiGrid');
  grid.className = 'kpi-grid' + (cards.length === 4 ? ' cols-4' : '');
  grid.innerHTML = cards.map(kpiCard).join('');
  if (typeof bindKpiDots === 'function') bindKpiDots();
}

/* Kartu bersama untuk tampilan keseluruhan & per entitas */
function buildKpiCards(m) {
  const cards = [];
  const mo = m.monthOmset !== undefined ? m.monthOmset : m.omset;
  cards.push({
    icon: 'target', title: `Target ${m.monthName || 'bulanan'}`, value: formatIDR(m.targetBulanan), pct: pctOf(mo, m.targetBulanan),
    rows: [[`Omset ${m.monthName || 'bulan ini'}`, formatIDR(mo)], ['Capaian terhadap bulan', fmtPct(pctOf(mo, m.targetBulanan))]]
  });
  cards.push({
    icon: 'calendar', title: m.isCurrent ? `Target ${m.days} hari` : 'Target periode', value: formatIDR(m.targetCustom), pct: pctOf(m.omset, m.targetCustom),
    rows: m.isCurrent
      ? [['Target harian', formatIDR(m.targetHarian)], ['Cara hitung', `${m.days} hari × ${formatCompact(m.targetHarian)}`]]
      : [['Target harian', formatIDR(m.targetHarian)], ['Periode', m.periodLabel]]
  });
  cards.push({
    icon: 'wallet', title: m.isCurrent ? `Omset ${m.days} hari` : 'Omset tercapai', value: m.omsetValue, pct: pctOf(m.omset, m.targetCustom),
    rows: m.omsetRows
  });
  if (m.isCurrent) {
    cards.push({
      icon: 'trend', title: 'Perkiraan akhir bulan', value: formatIDR(m.estimasi), pct: pctOf(m.estimasi, m.targetBulanan),
      rows: [['Rata-rata omset per hari', formatIDR(mo / Math.max(1, m.daysElapsed || m.days))], ['Dari target bulan', fmtPct(pctOf(m.estimasi, m.targetBulanan))]]
    });
    cards.push({ icon: 'bag', title: m.ordersTitle, value: m.ordersValue, pct: m.validPct, rows: m.ordersRows });
    cards.push({ icon: 'undo', rose: true, title: 'Return dan cancel', value: m.cancelValue, pct: m.cancelPct, rows: m.cancelRows });
  }
  return cards;
}

/* ------------------------------ RENDER UTAMA ----------------------------- */
function renderSkeleton() {
  $id('customDateProgressStrip').innerHTML = '<div class="skel" style="height:34px;width:160px;margin-bottom:14px"></div><div class="skel" style="height:34px;width:70%;margin-bottom:12px"></div><div class="skel" style="height:16px;width:100%;margin-top:40px;border-radius:999px"></div><div class="skel" style="height:60px;width:100%;margin-top:28px"></div>';
  $id('primaryKpiGrid').className = 'kpi-grid';
  $id('primaryKpiGrid').innerHTML = Array.from({ length: 6 }, () => '<div class="kpi"><div class="skel" style="height:34px;width:60%"></div><div class="skel" style="height:30px;width:80%"></div><div class="skel" style="height:44px"></div></div>').join('');
  $id('regionalCompareSection').innerHTML = '';
  $id('summaryTableHead').innerHTML = '';
  $id('summaryTableBody').innerHTML = '';
}

function renderApp() {
  const year = isYear();
  const days = getActiveDaysCount();
  const isCurrent = !year && STATE.selectedMonth === STATE.currentMonth;
  updateGoldToggleUI();
  renderFreshness();

  const isMy = !year && STATE.activeTab === 'safwan' && STATE.subChannel === 'shopeeMalaysia';
  const fx = $id('fxRateBadge');
  if (fx) {
    fx.classList.toggle('hidden', !isMy);
    $id('fxRateText').textContent = `Kurs: 1 MYR = ${formatIDR(STATE.myrRate)}`;
  }
  const goldVisible = ['holding', 'sjp', 'ppm'].includes(STATE.activeTab) && !(STATE.activeTab === 'holding' && STATE.holdingRegion === 'Bandung');
  $id('customDateWrap').classList.toggle('hidden', !isCurrent);
  $id('monthFilterBlock').classList.toggle('hidden', year);
  $id('goldToggleWrap').classList.toggle('hidden', !goldVisible);
  $id('filtersBox').classList.toggle('hidden', year && !goldVisible);
  $id('chartViewMode').classList.toggle('hidden', year);
  $id('holdingRegionTabs').classList.toggle('hidden', STATE.activeTab !== 'holding');
  $id('yearSection').classList.add('hidden');
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === STATE.activeTab));
  const dt = document.querySelector('.data-table'); if (dt) dt.classList.toggle('yr-table', year);
  updateScopeUI();
  updateFiltersSummary(year, isCurrent, goldVisible);

  if (!DATA) { renderSkeleton(); return; }
  if (year) renderYearView();
  else if (STATE.activeTab === 'holding') renderHoldingView(days, isCurrent);
  else renderSingleEntityView(STATE.activeTab, days, isCurrent);
}

function updateScopeUI() {
  const yr = STATE.currentMonth.slice(0, 4);
  const b = document.querySelector('#viewScope [data-scope="year"]');
  if (b) b.textContent = `Setahun ${yr}`;
  document.querySelectorAll('#viewScope .seg-btn').forEach(x => x.classList.toggle('active', (x.dataset.scope === 'year') === isYear()));
}

function updateFiltersSummary(year, isCurrent, goldVisible) {
  const el = $id('filtersSummary');
  if (!el) return;
  const parts = [];
  if (year) parts.push(`Setahun ${STATE.currentMonth.slice(0, 4)}`);
  else {
    const mi = Number(STATE.selectedMonth.slice(5, 7)) - 1;
    parts.push(`${MONTH_NAMES[mi]} ${STATE.selectedMonth.slice(0, 4)}`);
    if (isCurrent) parts.push(formatReadableRange().replace(/ \d{4} /, ' ').replace('–', 's.d.'));
  }
  if (goldVisible) parts.push(`Emas ${goldTag()}`);
  el.textContent = parts.join(' · ');
}

/* ------------------------------ KESELURUHAN ------------------------------ */
function renderHoldingView(days, isCurrent) {
  const allKeys = ['safwan', 'ansan', 'amalqu', 'latihhobi', 'sjp', 'ppm'];
  const allReports = allKeys.map(k => computeEntityReport(k));
  const reports = STATE.holdingRegion === 'all' ? allReports : allReports.filter(r => r.region === STATE.holdingRegion);
  const sum = f => reports.reduce((a, b) => a + f(b), 0);

  const scopeLabel = STATE.holdingRegion === 'all' ? 'Seluruh Pakkawaru Group'
    : STATE.holdingRegion === 'Bandung' ? 'Daerah Bandung' : `Daerah Gorontalo (emas ${goldTag()})`;
  const t = {
    bulan: sum(r => r.targetBulanan), harian: sum(r => r.targetHarian), custom: sum(r => r.targetCustomTanggal),
    omset: sum(r => r.validOmset), est: sum(r => r.estimasiBulan), vq: sum(r => r.validQty), cq: sum(r => r.cancelQty), co: sum(r => r.cancelOmset)
  };
  const cancelPct = pctOf(t.co, t.omset + t.co);
  const mc = monthCtx(isCurrent);
  const mfull = isCurrent ? reports.map(r => monthFullReport(r.key)) : null;
  const monthOmset = isCurrent ? mfull.reduce((a, b) => a + b.validOmset, 0) : t.omset;
  const monthEst = isCurrent ? mfull.reduce((a, b) => a + b.estimasiBulan, 0) : t.est;
  const ecom = reports.filter(r => r.hasQty).reduce((a, b) => a + b.validOmset, 0);
  const periodLabel = formatReadableRange();

  $id('viewTitleHeading').textContent = STATE.holdingRegion === 'all' ? 'Ringkasan Pakkawaru Group' : `Ringkasan ${scopeLabel}`;
  $id('viewBadgeTag').textContent = STATE.holdingRegion === 'all' ? '6 entitas' : `${reports.length} entitas`;
  $id('viewSubtitleDesc').textContent = `Target bulanan ${formatIDR(t.bulan)} dan target harian ${formatIDR(t.harian)}. Periode: ${periodLabel}.`;
  $id('channelSubPills').classList.add('hidden');
  $id('malaysiaFxBanner').classList.add('hidden');
  $id('regionalCompareSection').classList.remove('hidden');
  document.querySelectorAll('#holdingRegionTabs .region-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.region === STATE.holdingRegion));

  renderHero({ scope: scopeLabel, isCurrent, monthName: mc.monthName, monthLabel: mc.monthLabel, monthOmset, targetBulanan: t.bulan, targetHarian: t.harian, estimasi: monthEst,
    daysElapsed: mc.daysElapsed, daysInMonth: mc.daysInMonth, range: { omset: t.omset, target: t.custom, days, label: periodLabel, isDefault: mc.isDefaultRange } });

  renderKpis(buildKpiCards({
    isCurrent, days, periodLabel, targetBulanan: t.bulan, targetHarian: t.harian, targetCustom: t.custom, omset: t.omset, estimasi: monthEst,
    monthOmset, monthName: mc.monthName, daysElapsed: mc.daysElapsed,
    countLabel: 'Jumlah entitas', countValue: reports.length,
    omsetValue: formatIDR(t.omset),
    omsetRows: [[isCurrent ? `Target ${days} hari` : 'Target periode', formatCompact(t.custom)], ['Tercapai', fmtPct(pctOf(t.omset, t.custom))]],
    ordersTitle: 'Pesanan berhasil', ordersValue: `${fmtInt(t.vq)}<small>pcs</small>`, validPct: 100 - cancelPct,
    ordersRows: [['Omset toko dan Meta', formatCompact(ecom)], ['Pesanan valid', fmtPct(100 - cancelPct)]],
    cancelValue: formatIDR(t.co), cancelPct,
    cancelRows: [['Jumlah cancel atau RTS', `${fmtInt(t.cq)} pcs`], ['Dari total penjualan', fmtPct(cancelPct)]]
  }));

  const shEst = isCurrent ? `Perkiraan akhir bulan: ${formatIDR(monthEst)} (${fmtPct(pctOf(monthEst, t.bulan))} dari target)` : null;
  STATE.share = {
    title: `${STATE.holdingRegion === 'all' ? 'Pakkawaru Group' : scopeLabel} - ${mc.monthLabel}`,
    head: [
      `Omset ${mc.monthName}: ${formatIDR(monthOmset)} (${fmtPct(pctOf(monthOmset, t.bulan))} dari target bulan ${formatIDR(t.bulan)})`,
      ...(isCurrent ? [`Sisa target: ${formatIDR(Math.max(0, t.bulan - monthOmset))}`, shEst] : [])
    ],
    rows: reports.map((r, i) => { const om = isCurrent ? mfull[i].validOmset : r.validOmset; return [r.short, formatIDR(om), `${fmtPct(pctOf(om, r.targetBulanan), 0)} dari target`]; }),
    gold: reports.some(r => r.isGold)
  };

  /* Kartu daerah */
  const regionCard = (name, list, focusKey, isGoldRegion) => {
    const tb = list.reduce((a, b) => a + b.targetBulanan, 0), th = list.reduce((a, b) => a + b.targetHarian, 0);
    const tc = list.reduce((a, b) => a + b.targetCustomTanggal, 0), om = list.reduce((a, b) => a + b.validOmset, 0);
    const est = list.reduce((a, b) => a + b.estimasiBulan, 0), raw = list.reduce((a, b) => a + b.rawBeforeDiv3, 0);
    const pc = pctOf(om, tc);
    const focused = STATE.holdingRegion === focusKey;
    return `
      <article class="region ${focused ? 'focus' : ''}">
        <div class="region-head">
          <div><h3>${name}</h3><p>Target bulanan ${formatIDR(tb)}, target harian ${formatIDR(th)}</p></div>
          ${statusChip(pc)}
        </div>
        <div class="region-nums">
          <div><small>${isCurrent ? `Target ${days} hari` : 'Target periode'}</small><strong>${formatIDR(tc)}</strong><span>${isCurrent ? `${days} hari × ${formatCompact(th)}` : periodLabel}</span></div>
          <div><small>${isGoldRegion ? `Omset emas ${goldTag()}` : 'Omset tercapai'}</small><strong>${formatIDR(om)}</strong><span>${isGoldRegion ? `Riil 100%: ${formatCompact(raw)}, dibagi 3: ${formatCompact(Math.round(raw / 3))}` : `Perkiraan bulan: ${formatCompact(est)}`}</span></div>
        </div>
        <div>
          <div class="kpi-row" style="margin-bottom:6px"><span>Capaian terhadap target</span><strong>${fmtPct(pc)}</strong></div>
          <div class="kpi-bar"><i style="width:${Math.max(2, Math.min(100, pc))}%"></i></div>
        </div>
        <div class="region-list">
          ${list.map(e => `<div class="region-row"><span class="nm"><i class="dot" style="--c:${ENTITY_COLOR[e.key]}"></i>${e.short}${e.isGold ? `<small>riil ${formatCompact(e.rawBeforeDiv3)}</small>` : ''}</span><span class="vl">${formatIDR(e.validOmset)}<small>${fmtPct(e.persenCustomTanggal)} dari target</small></span></div>`).join('')}
        </div>
        <button class="btn btn-soft" onclick="setHoldingRegion('${focused ? 'all' : focusKey}')">${focused ? 'Tampilkan semua daerah' : `Fokus ke ${name.replace('Daerah ', '')}`}</button>
      </article>`;
  };
  $id('regionalCompareSection').innerHTML =
    regionCard('Daerah Bandung', allReports.filter(r => r.region === 'Bandung'), 'Bandung', false) +
    regionCard('Daerah Gorontalo', allReports.filter(r => r.region === 'Gorontalo'), 'Gorontalo', true);

  renderChartsForHolding(reports, pctOf(t.omset, t.custom), days, scopeLabel);

  $id('summaryTableHeading').textContent = `Rincian per entitas: ${scopeLabel}`;
  $id('summaryTableSub').textContent = `Target, omset, jumlah pesanan, dan return atau cancel. Periode ${periodLabel}.`;
  $id('summaryTableHead').innerHTML = `<tr>
    <th>Entitas</th><th>Target</th><th>${isCurrent ? `Target ${days} hari` : 'Target periode'}</th><th>Omset dan capaian</th>
    <th class="num">Pesanan berhasil</th><th class="num">Return atau cancel</th><th class="num">Perkiraan akhir bulan</th><th></th></tr>`;
  $id('summaryTableBody').innerHTML = reports.map(r => `
    <tr>
      <td class="cell-first" data-label="Entitas"><div class="cell-name"><i class="dot" style="--c:${ENTITY_COLOR[r.key]};margin-top:6px"></i><div><strong>${r.name}</strong><small>Daerah ${r.region}${r.isGold ? `, riil ${formatIDR(r.rawBeforeDiv3)}, dibagi 3 ${formatIDR(Math.round(r.rawBeforeDiv3 / 3))}` : ''}</small></div></div></td>
      <td data-label="Target"><div><strong>${formatIDR(r.targetBulanan)}</strong><span class="cell-sub">${formatIDR(r.targetHarian)} per hari</span></div></td>
      <td data-label="${isCurrent ? `Target ${days} hari` : 'Target periode'}"><strong>${formatIDR(r.targetCustomTanggal)}</strong></td>
      <td class="cell-prog" data-label="Omset dan capaian"><div><strong>${formatIDR(r.validOmset)}</strong><span class="cell-sub"><span class="pc">${fmtPct(r.persenCustomTanggal)}</span> dari target, ${fmtPct(r.persenBulanan)} dari bulan</span><div class="kpi-bar"><i style="width:${Math.max(2, Math.min(100, r.persenCustomTanggal))}%"></i></div></div></td>
      <td class="num" data-label="Pesanan berhasil">${r.hasQty && isCurrent ? `<strong>${fmtInt(r.validQty)} pcs</strong>` : '-'}</td>
      <td class="num" data-label="Return atau cancel">${r.hasQty && isCurrent ? `<div><strong class="t-bad">${formatIDR(r.cancelOmset)}</strong><span class="cell-sub">${fmtInt(r.cancelQty)} pcs, ${fmtPct(r.cancelRatePct)} dari penjualan</span></div>` : '-'}</td>
      <td class="num" data-label="Perkiraan akhir bulan"><div><strong>${formatIDR(r.estimasiBulan)}</strong><span class="cell-sub">${fmtPct(r.estimasiPct)} dari target</span></div></td>
      <td data-label=""><button class="btn-link" onclick="switchTab('${r.key}')">Buka</button></td>
    </tr>`).join('');
}

/* ------------------------------ PER ENTITAS ------------------------------ */
function renderSingleEntityView(entityKey, days, isCurrent) {
  const rep = computeEntityReport(entityKey);
  const full = isCurrent ? computeRealtimeNovemberEntity(entityKey, days) : rep;
  const isMy = entityKey === 'safwan' && STATE.subChannel === 'shopeeMalaysia' && isCurrent;
  const periodLabel = formatReadableRange();
  const chName = (full.channels.find(c => c.id === STATE.subChannel) || {}).name;

  $id('viewTitleHeading').textContent = STATE.subChannel === 'all' || !chName ? rep.name : `${rep.name}: ${chName}`;
  $id('viewBadgeTag').textContent = `Daerah ${rep.region}${rep.isGold ? (STATE.goldMode === 'raw' ? ', riil 100%' : ', dibagi 3') : ''}`;
  $id('viewSubtitleDesc').textContent = `Target bulanan ${formatIDR(rep.targetBulanan)} dan target harian ${formatIDR(rep.targetHarian)}. Periode: ${periodLabel}.`;
  $id('regionalCompareSection').classList.add('hidden');
  $id('regionalCompareSection').innerHTML = '';

  const mc = monthCtx(isCurrent);
  const mf = isCurrent ? monthFullReport(entityKey) : rep;
  const subNote = isCurrent && STATE.subChannel !== 'all' && chName ? `Angka hanya dari ${chName}, sedangkan targetnya adalah target seluruh entitas.` : '';
  renderHero({ scope: STATE.subChannel === 'all' || !chName ? rep.name : `${rep.name} (${chName})`, isCurrent, monthName: mc.monthName, monthLabel: mc.monthLabel, monthOmset: mf.validOmset, targetBulanan: rep.targetBulanan, targetHarian: rep.targetHarian, estimasi: mf.estimasiBulan,
    daysElapsed: mc.daysElapsed, daysInMonth: mc.daysInMonth, note: subNote, range: { omset: full.validOmset, target: rep.targetCustomTanggal, days, label: periodLabel, isDefault: mc.isDefaultRange } });

  /* pilihan toko */
  const pills = $id('channelSubPills');
  if ((entityKey === 'safwan' || entityKey === 'ansan') && isCurrent) {
    pills.classList.remove('hidden');
    pills.innerHTML = [{ id: 'all', name: 'Semua toko' }, ...full.channels].map((p, i) => `
      <button class="sub-pill ${STATE.subChannel === p.id ? 'active' : ''}" onclick="selectSubChannel('${p.id}')">${p.id === 'all' ? '' : `<i class="dot" style="--c:${SERIES_COLORS[(i - 1) % 6]}"></i>`}${p.name}</button>`).join('');
  } else { pills.classList.add('hidden'); }

  /* panel Ringgit */
  const fxBanner = $id('malaysiaFxBanner');
  if (isMy) {
    const my = sumSeries(REALTIME_NOV_DAILY.shopeeMalaysia, true);
    const totalMyr = my.rawMyrValid + my.rawMyrCancel;
    fxBanner.classList.remove('hidden');
    fxBanner.innerHTML = `
      <h3>Konversi Shopee Malaysia: Ringgit ke Rupiah</h3>
      <p>Kurs yang dipakai: 1 MYR = ${formatIDR(STATE.myrRate)}. Angka Ringgit adalah angka asli dari Shopee Malaysia.</p>
      <div class="fx-grid">
        <div class="fx-item"><small>Omset (Ringgit)</small><strong>${formatMYR(my.rawMyrValid)}</strong><span>${fmtInt(my.validQty)} pcs berhasil atau diproses</span></div>
        <div class="fx-item"><small>Omset (Rupiah)</small><strong>${formatIDR(my.validOmset)}</strong><span>Hasil konversi</span></div>
        <div class="fx-item"><small>Return atau cancel (Ringgit)</small><strong>${formatMYR(my.rawMyrCancel)}</strong><span>${fmtInt(my.cancelQty)} pcs, ${fmtPct(pctOf(my.rawMyrCancel, totalMyr), 2)}</span></div>
        <div class="fx-item"><small>Return atau cancel (Rupiah)</small><strong>${formatIDR(my.cancelOmset)}</strong><span>Tidak masuk omset</span></div>
      </div>`;
  } else { fxBanner.classList.add('hidden'); }

  /* kartu angka */
  const omsetRows = [];
  if (rep.isGold) {
    omsetRows.push(['Penjualan riil (100%)', formatIDR(rep.rawBeforeDiv3)], ['Diakui (dibagi 3)', formatIDR(Math.round(rep.rawBeforeDiv3 / 3))]);
  } else {
    omsetRows.push([isCurrent ? `Target ${days} hari` : 'Target periode', formatCompact(rep.targetCustomTanggal)], ['Tercapai', fmtPct(rep.persenCustomTanggal)]);
    if (isMy) omsetRows.push(['Dalam Ringgit', formatMYR(rep.rawMyrValid)]);
  }
  const cancelRate = rep.cancelRatePct;
  renderKpis(buildKpiCards({
    isCurrent, days, periodLabel, targetBulanan: rep.targetBulanan, targetHarian: rep.targetHarian, targetCustom: rep.targetCustomTanggal, omset: rep.validOmset, estimasi: mf.estimasiBulan,
    monthOmset: mf.validOmset, monthName: mc.monthName, daysElapsed: mc.daysElapsed,
    countLabel: 'Entitas', countValue: rep.short,
    omsetValue: formatIDR(rep.validOmset), omsetRows,
    ordersTitle: rep.isGold ? 'Penjualan emas' : (rep.hasQty ? 'Pesanan berhasil' : 'Transaksi tercatat'),
    ordersValue: rep.isGold ? formatIDR(rep.rawBeforeDiv3) : (rep.hasQty ? `${fmtInt(rep.validQty)}<small>pcs</small>` : `${fmtInt(rep.validQty)}<small>hari atau batch</small>`),
    validPct: rep.isGold ? 100 : 100 - cancelRate,
    ordersRows: rep.isGold
      ? [['Riil 100%', formatCompact(rep.rawBeforeDiv3)], ['Diakui (dibagi 3)', formatIDR(Math.round(rep.rawBeforeDiv3 / 3))]]
      : [['Nominal omset valid', formatIDR(rep.validOmset)], ['Pesanan valid', fmtPct(100 - cancelRate)]],
    cancelValue: isMy ? `${formatIDR(rep.cancelOmset)}<small>${formatMYR(rep.rawMyrCancel)}</small>` : formatIDR(rep.cancelOmset),
    cancelPct: cancelRate,
    cancelRows: [['Jumlah cancel atau RTS', `${fmtInt(rep.cancelQty)} pcs`], ['Dari total penjualan', fmtPct(cancelRate)]]
  }));

  STATE.share = {
    title: `${rep.short} - ${mc.monthLabel}`,
    head: [
      `Omset ${mc.monthName}: ${formatIDR(mf.validOmset)} (${fmtPct(pctOf(mf.validOmset, rep.targetBulanan))} dari target bulan ${formatIDR(rep.targetBulanan)})`,
      ...(isCurrent ? [`Sisa target: ${formatIDR(Math.max(0, rep.targetBulanan - mf.validOmset))}`, `Perkiraan akhir bulan: ${formatIDR(mf.estimasiBulan)} (${fmtPct(pctOf(mf.estimasiBulan, rep.targetBulanan))} dari target)`] : [])
    ],
    rows: isCurrent && mf.channels && mf.channels.length ? mf.channels.map(c => [c.name, formatIDR(c.validOmset), '']) : [],
    gold: rep.isGold
  };

  renderChartsForSingleEntity(entityKey, rep, days);
  renderTableForSingleEntity(entityKey, rep, days);
}

/* ------------------------------ GRAFIK ----------------------------------- */
function renderChartsForHolding(reports, pctCustom, days, scopeLabel) {
  const isCur = STATE.selectedMonth === STATE.currentMonth;
  $id('barChartHeading').textContent = 'Target dan omset';
  $id('barChartSub').textContent = `${scopeLabel}. Sentuh batang grafik untuk melihat nominalnya.`;
  $id('donutChartHeading').textContent = 'Kontribusi omset per entitas';
  $id('donutChartSub').textContent = 'Porsi tiap entitas terhadap total omset yang tercapai.';

  if (STATE.chartMode === 'monthly_trend') {
    const mKeys = Object.keys(MONTHLY_HISTORY_2026);
    const labels = mKeys.map(k => MONTHLY_HISTORY_2026[k].label.slice(0, 3));
    const keys = reports.map(r => r.key);
    const targets = mKeys.map(k => keys.reduce((a, ek) => a + MONTHLY_HISTORY_2026[k][ek][0], 0));
    const actuals = mKeys.map(k => keys.reduce((a, ek) => a + (ENTITY_META[ek].isGold ? goldVal(MONTHLY_HISTORY_2026[k][ek][1]) : MONTHLY_HISTORY_2026[k][ek][1]), 0));
    const curFull = keys.map(ek => monthFullReport(ek));
    labels.push([MONTH_NAMES[Number(STATE.currentMonth.slice(5, 7)) - 1].slice(0, 3), '(berjalan)']);
    targets.push(curFull.reduce((a, r) => a + r.targetBulanan, 0));
    actuals.push(curFull.reduce((a, r) => a + r.validOmset, 0));
    drawBarChart(labels, targets, actuals, 'Target bulanan', 'Omset tercapai');
  } else if (STATE.chartMode === 'real_vs_estimasi') {
    drawBarChart(reports.map(r => r.short), reports.map(r => r.validOmset), reports.map(r => r.estimasiBulan), 'Omset tercapai', 'Perkiraan akhir bulan');
  } else if (STATE.chartMode === 'monthly_target') {
    drawBarChart(reports.map(r => r.short), reports.map(r => r.targetBulanan), reports.map(r => r.validOmset), 'Target bulanan', 'Omset tercapai');
  } else {
    drawBarChart(reports.map(r => r.short), reports.map(r => r.targetCustomTanggal), reports.map(r => r.validOmset), isCur ? `Target ${days} hari` : 'Target periode', isCur ? `Omset ${days} hari` : 'Omset tercapai');
  }
  drawDonutChart(reports.map(r => r.short), reports.map(r => r.validOmset), fmtPct(pctCustom), isCur ? `dari target ${days} hari` : 'dari target', reports.map(r => ENTITY_COLOR[r.key]));
}

function renderChartsForSingleEntity(entityKey, rep, days) {
  const mKeys = Object.keys(MONTHLY_HISTORY_2026);
  const curShort = MONTH_NAMES[Number(STATE.currentMonth.slice(5, 7)) - 1].slice(0, 3);
  const curFull = monthFullReport(entityKey);
  const labels = [...mKeys.map(k => MONTHLY_HISTORY_2026[k].label.slice(0, 3)), [curShort, '(berjalan)']];
  const targets = [...mKeys.map(k => MONTHLY_HISTORY_2026[k][entityKey][0]), curFull.targetBulanan];
  const actuals = [...mKeys.map(k => (rep.isGold ? goldVal(MONTHLY_HISTORY_2026[k][entityKey][1]) : MONTHLY_HISTORY_2026[k][entityKey][1])), curFull.validOmset];

  $id('barChartHeading').textContent = `Tren bulanan 2026: ${rep.short}`;
  $id('barChartSub').textContent = 'Target dan omset tiap bulan. Sentuh batang grafik untuk melihat nominalnya.';
  drawBarChart(labels, targets, actuals, 'Target bulanan', 'Omset tercapai');

  if (rep.channels && rep.channels.length > 0 && STATE.subChannel === 'all' && STATE.selectedMonth === STATE.currentMonth) {
    $id('donutChartHeading').textContent = 'Porsi omset per toko';
    $id('donutChartSub').textContent = 'Kontribusi tiap toko atau akun terhadap omset entitas.';
    drawDonutChart(rep.channels.map(c => c.name), rep.channels.map(c => c.validOmset), fmtPct(rep.persenCustomTanggal), `dari target ${days} hari`, rep.channels.map((c, i) => SERIES_COLORS[i % 6]));
  } else {
    $id('donutChartHeading').textContent = `Capaian terhadap target`;
    $id('donutChartSub').textContent = 'Bagian yang sudah tercapai dan sisa target.';
    drawDonutChart(['Omset tercapai', 'Sisa target'], [rep.validOmset, Math.max(0, rep.targetCustomTanggal - rep.validOmset)], fmtPct(rep.persenCustomTanggal), 'dari target', [BRAND, '#DCE4E0']);
  }
}

/* ------------------------------ TABEL ------------------------------------ */
function renderTableForSingleEntity(entityKey, rep, days) {
  if (rep.channels && rep.channels.length > 0 && STATE.selectedMonth === STATE.currentMonth) {
    $id('summaryTableHeading').textContent = `Rincian per toko: ${rep.name}`;
    $id('summaryTableSub').textContent = `Omset valid, jumlah pesanan, serta return atau cancel. Periode ${formatReadableRange()}.`;
    const all = computeRealtimeNovemberEntity(entityKey, days).channels;
    const rows = STATE.subChannel === 'all' ? all : all.filter(c => c.id === STATE.subChannel);
    $id('summaryTableHead').innerHTML = `<tr><th>Toko atau akun</th><th class="num">Omset valid</th><th class="num">Pesanan berhasil</th><th class="num">Return atau cancel</th><th class="num">Nominal return atau cancel</th><th class="num">Porsi cancel</th></tr>`;
    $id('summaryTableBody').innerHTML = rows.map(c => {
      const cPct = pctOf(c.cancelOmset, c.validOmset + c.cancelOmset);
      const my = c.isMyr && STATE.subChannel === 'shopeeMalaysia';
      const idx = all.findIndex(x => x.id === c.id);
      return `<tr>
        <td class="cell-first" data-label="Toko atau akun"><div class="cell-name"><i class="dot" style="--c:${SERIES_COLORS[idx % 6]};margin-top:6px"></i><strong>${c.name}</strong></div></td>
        <td class="num" data-label="Omset valid"><div><strong>${formatIDR(c.validOmset)}</strong>${my ? `<span class="cell-sub">${formatMYR(c.rawMyrValid)}</span>` : ''}</div></td>
        <td class="num" data-label="Pesanan berhasil"><strong>${fmtInt(c.validQty)} pcs</strong></td>
        <td class="num" data-label="Return atau cancel"><span class="chip chip-bad">${fmtInt(c.cancelQty)} pcs</span></td>
        <td class="num" data-label="Nominal return atau cancel"><div><strong class="t-bad">${formatIDR(c.cancelOmset)}</strong>${my ? `<span class="cell-sub">${formatMYR(c.rawMyrCancel)}</span>` : ''}</div></td>
        <td class="num" data-label="Porsi cancel"><strong>${fmtPct(cPct, 2)}</strong></td></tr>`;
    }).join('');
  } else {
    $id('summaryTableHeading').textContent = `Rekap bulanan 2026: ${rep.name}`;
    $id('summaryTableSub').textContent = rep.isGold ? `Penjualan riil dan omset yang diakui (${goldTag()}) tiap bulan.` : 'Target dan omset tiap bulan dari spreadsheet.';
    $id('summaryTableHead').innerHTML = `<tr><th>Bulan</th><th class="num">Target bulanan</th><th class="num">Target harian</th>${rep.isGold ? '<th class="num">Penjualan riil (100%)</th>' : ''}<th class="num">Omset tercapai${rep.isGold ? ` (${goldTag()})` : ''}</th><th class="num">Capaian</th></tr>`;
    $id('summaryTableBody').innerHTML = Object.keys(MONTHLY_HISTORY_2026).map(k => {
      const t = MONTHLY_HISTORY_2026[k][entityKey][0], raw = MONTHLY_HISTORY_2026[k][entityKey][1];
      const val = rep.isGold ? goldVal(raw) : raw, p = pctOf(val, t);
      return `<tr>
        <td class="cell-first" data-label="Bulan"><strong>${MONTHLY_HISTORY_2026[k].label}</strong></td>
        <td class="num" data-label="Target bulanan">${formatIDR(t)}</td>
        <td class="num" data-label="Target harian">${formatIDR(t / 30)}</td>
        ${rep.isGold ? `<td class="num" data-label="Penjualan riil (100%)">${formatIDR(raw)}</td>` : ''}
        <td class="num" data-label="Omset tercapai"><strong>${formatIDR(val)}</strong></td>
        <td class="num" data-label="Capaian"><div>${statusChip(p)}<span class="cell-sub">${fmtPct(p, 2)}</span></div></td></tr>`;
    }).join('');
  }
}

/* ------------------------------ CHART.JS --------------------------------- */
if (window.Chart && Chart.defaults) {
  Chart.defaults.font.family = "'Figtree', system-ui, sans-serif";
  Chart.defaults.color = '#62716C';
}

function drawBarChart(labels, s1, s2, l1, l2) {
  if (!window.Chart) return;
  const ctx = $id('mainBarCanvas').getContext('2d');
  if (STATE.barChart) STATE.barChart.destroy();
  STATE.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: l1, data: s1, backgroundColor: '#B9C6C0', borderRadius: { topLeft: 5, topRight: 5 }, borderSkipped: 'bottom', barPercentage: 0.8, categoryPercentage: 0.7 },
        { label: l2, data: s2, backgroundColor: BRAND, borderRadius: { topLeft: 5, topRight: 5 }, borderSkipped: 'bottom', barPercentage: 0.8, categoryPercentage: 0.7 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'start', labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, boxHeight: 10, padding: 16, font: { size: 12.5, weight: '600' } } },
        tooltip: { backgroundColor: '#17211E', padding: 12, cornerRadius: 10, titleFont: { weight: '700' }, callbacks: { label: c => ` ${c.dataset.label}: ${formatIDR(c.parsed.y)}` } }
      },
      scales: {
        x: { grid: { display: false }, border: { color: '#DFE6E3' }, ticks: { font: { size: window.innerWidth < 560 ? 10 : 12, weight: '600' }, maxRotation: 0, autoSkip: false } },
        y: { beginAtZero: true, border: { display: false }, grid: { color: '#ECF0EE' }, ticks: { callback: v => formatCompact(v), font: { size: 11.5 } } }
      }
    }
  });
}

function drawDonutChart(labels, values, centerBig, centerSmall, colors) {
  $id('donutCenterBig').textContent = centerBig;
  $id('donutCenterSmall').textContent = centerSmall;
  const total = values.reduce((a, b) => a + b, 0) || 1;
  if (window.Chart) {
  const ctx = $id('mainDonutCanvas').getContext('2d');
  if (STATE.donutChart) STATE.donutChart.destroy();
  STATE.donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#FFFFFF', borderWidth: 3, hoverOffset: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#17211E', padding: 10, cornerRadius: 10, callbacks: { label: c => ` ${c.label}: ${formatIDR(c.parsed)} (${fmtPct(pctOf(c.parsed, total))})` } }
      }
    }
  });
  }
  $id('donutCustomLegend').innerHTML = labels.map((l, i) => `
    <li><i class="dot" style="--c:${colors[i]}"></i><span class="nm" title="${l}">${l}</span><span class="vl">${formatCompact(values[i])}</span><span class="pc">${fmtPct(pctOf(values[i], total))}</span></li>`).join('');
}



/* ======================= SETAHUN ======================= */
const ALL_ENTITY_KEYS = ['safwan', 'ansan', 'amalqu', 'latihhobi', 'sjp', 'ppm'];

function yearHeroHtml(Y, scope, dateLabel) {
  const pctYear = pctOf(Y.omsetYtd, Y.targetYear);
  const pacePct = pctOf(Y.omsetYtd, Y.targetToDate);
  const sisa = Y.targetYear - Y.omsetYtd;
  const withTarget = Y.months.filter(m => m.target > 0).length;
  const max = Math.max(Y.targetYear, Y.omsetYtd, Y.targetToDate, 1);
  const w = v => Math.max(0, Math.min(100, (v / max) * 100));
  const year = STATE.currentMonth.slice(0, 4);
  let sub = `<strong>${scope}</strong> mencatat omset ${formatIDR(Y.omsetYtd)} dari target setahun ${formatIDR(Y.targetYear)}, per ${dateLabel}. `;
  sub += sisa > 0 ? `Sisa target ${formatIDR(sisa)}.` : `Sudah melewati target setahun sebesar ${formatIDR(-sisa)}.`;
  if (withTarget < 12) sub += ` <span class="hero-note">Target setahun baru mencakup ${withTarget} bulan yang sudah terisi di spreadsheet.</span>`;
  const items = [
    `<div class="lg"><span class="lg-name"><i class="sw sw-fill"></i>Omset sampai hari ini</span><span class="lg-val">${formatIDR(Y.omsetYtd)}</span><span class="lg-note">${Y.done.length} bulan selesai dan ${Y.cur ? Y.cur.name : 'bulan berjalan'} berjalan</span></div>`,
    `<div class="lg"><span class="lg-name"><i class="sw sw-end"></i>Target setahun</span><span class="lg-val">${formatIDR(Y.targetYear)}</span><span class="lg-note">${sisa > 0 ? 'Sisa ' + formatIDR(sisa) : 'Lebih ' + formatIDR(-sisa)}</span></div>`,
    `<div class="lg"><span class="lg-name"><i class="sw sw-tick"></i>Jalur target sampai hari ini</span><span class="lg-val">${formatIDR(Y.targetToDate)}</span><span class="lg-note">Omset ${fmtPct(pacePct)} dari jalur</span></div>`,
    `<div class="lg"><span class="lg-name"><i class="sw sw-est"></i>Rata-rata per bulan</span><span class="lg-val">${formatIDR(Y.avg)}</span><span class="lg-note">Dari ${Y.done.length} bulan yang sudah selesai</span></div>`
  ];
  $id('customDateProgressStrip').innerHTML = `
    <div class="hero-top">
      <div>
        ${paceChip(pacePct)}
        <h2>${fmtPct(pctYear)} dari target setahun ${year} sudah tercapai</h2>
        <p class="hero-sub">${sub}</p>
      </div>
      <div class="hero-pct"><strong>${fmtPct(pctYear)}</strong><span>dari target tahun ${year}</span></div>
    </div>
    <div class="track-wrap" role="img" aria-label="Omset setahun ${formatIDR(Y.omsetYtd)} dari target ${formatIDR(Y.targetYear)}">
      <div class="track">
        <div class="track-fill" style="width:${w(Y.omsetYtd)}%"></div>
        <div class="track-tick" style="left:${w(Y.targetToDate)}%"></div>
        <div class="track-end" style="left:${w(Y.targetYear)}%"></div>
      </div>
    </div>
    <div class="legend4">${items.join('')}</div>`;
}

function yearMatrixHtml(Y, keys) {
  const head = Y.months.map(m => `<th class="mx-h ${m.status}">${m.short}${m.status === 'current' ? '<small>berjalan</small>' : ''}</th>`).join('');
  const cell = (t, o, status) => {
    if (status === 'future' || o === null || !(t > 0)) {
      return `<td class="mx-c none"><span class="mx-p">–</span>${status !== 'future' && o ? `<span class="mx-v">${formatCompact(o)}</span>` : ''}</td>`;
    }
    const p = pctOf(o, t);
    const cls = status === 'current' ? 'live' : p >= 100 ? 'good' : p >= 70 ? 'warn' : 'bad';
    const glyph = status === 'current' ? '…' : p >= 100 ? '✓' : p >= 70 ? '–' : '!';
    return `<td class="mx-c ${cls}"><span class="mx-p"><i class="mx-g" aria-hidden="true">${glyph}</i>${fmtPct(p, 0)}</span><span class="mx-v">${formatCompact(o)}</span></td>`;
  };
  const rows = keys.map(ek => `<tr><th class="mx-r" scope="row"><i class="dot" style="--c:${ENTITY_COLOR[ek]}"></i>${ENTITY_META[ek].short}</th>${Y.months.map(m => cell(m.by[ek].target, m.by[ek].omset, m.status)).join('')}</tr>`).join('');
  const total = keys.length > 1 ? `<tr class="mx-total"><th class="mx-r" scope="row">Total</th>${Y.months.map(m => cell(m.target, m.omset, m.status)).join('')}</tr>` : '';
  return `<div class="matrix-wrap"><table class="matrix"><thead><tr><th class="mx-r">Entitas</th>${head}</tr></thead><tbody>${rows}${total}</tbody></table></div>
    <p class="mx-legend"><span><i class="mx-g good">✓</i> Target tercapai (100% atau lebih)</span><span><i class="mx-g warn">–</i> Mendekati (70% sampai 99%)</span><span><i class="mx-g bad">!</i> Di bawah 70%</span><span><i class="mx-g live">…</i> Bulan berjalan</span></p>`;
}

function renderYearView() {
  const isHolding = STATE.activeTab === 'holding';
  const keys = isHolding
    ? ALL_ENTITY_KEYS.filter(k => STATE.holdingRegion === 'all' || ENTITY_META[k].region === STATE.holdingRegion)
    : [STATE.activeTab];
  const meta1 = ENTITY_META[keys[0]];
  const year = STATE.currentMonth.slice(0, 4);
  const curShort = MONTH_NAMES[Number(STATE.currentMonth.slice(5, 7)) - 1];
  const Y = buildYearData(keys);
  const hasGold = keys.some(k => ENTITY_META[k].isGold);
  const scope = isHolding
    ? (STATE.holdingRegion === 'all' ? 'Seluruh Pakkawaru Group' : STATE.holdingRegion === 'Bandung' ? 'Daerah Bandung' : `Daerah Gorontalo (emas ${goldTag()})`)
    : meta1.name;
  const dateLabel = `${Number(STATE.latestDate.slice(8, 10))} ${curShort} ${year}`;

  $id('viewTitleHeading').textContent = isHolding ? `Setahun ${year}: ${STATE.holdingRegion === 'all' ? 'Pakkawaru Group' : scope}` : `${meta1.name}: setahun ${year}`;
  $id('viewBadgeTag').textContent = isHolding ? `${keys.length} entitas` : `Daerah ${meta1.region}${meta1.isGold ? (STATE.goldMode === 'raw' ? ', riil 100%' : ', dibagi 3') : ''}`;
  $id('viewSubtitleDesc').textContent = `Total akhir tiap bulan diambil dari spreadsheet "Pencapaian Bulanan ${year}". ${curShort} dihitung langsung dari data penjualan sampai ${dateLabel}.${hasGold ? ` Omset emas ${goldTag()}.` : ''}`;
  $id('channelSubPills').classList.add('hidden');
  $id('malaysiaFxBanner').classList.add('hidden');
  $id('regionalCompareSection').classList.add('hidden');
  $id('regionalCompareSection').innerHTML = '';
  document.querySelectorAll('#holdingRegionTabs .region-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.region === STATE.holdingRegion));

  yearHeroHtml(Y, scope, dateLabel);

  /* kartu angka */
  const pacePct = pctOf(Y.omsetYtd, Y.targetToDate);
  const cards = [
    { icon: 'wallet', title: `Omset ${year} sampai hari ini`, value: formatIDR(Y.omsetYtd), pct: pctOf(Y.omsetYtd, Y.targetYear),
      rows: [['Dari target setahun', fmtPct(pctOf(Y.omsetYtd, Y.targetYear))], ['Sisa target', formatCompact(Math.max(0, Y.targetYear - Y.omsetYtd))]] },
    { icon: 'target', title: `Target setahun ${year}`, value: formatIDR(Y.targetYear), pct: pctOf(Y.targetToDate, Y.targetYear),
      rows: [['Jalur target sampai hari ini', formatCompact(Y.targetToDate)], ['Omset terhadap jalur', fmtPct(pacePct)]] },
    { icon: 'trend', title: 'Rata-rata omset per bulan', value: formatIDR(Y.avg),
      rows: [['Bulan terbaik', Y.best ? `${Y.best.short}, ${formatCompact(Y.best.omset)}` : '-'], ['Bulan terendah', Y.low ? `${Y.low.short}, ${formatCompact(Y.low.omset)}` : '-'], ['Bulan selesai', `${Y.done.length} bulan`]] },
    { icon: 'check', title: 'Bulan yang mencapai target', value: `${Y.hit}<small>dari ${Y.done.length} bulan</small>`, pct: Y.done.length ? (Y.hit / Y.done.length) * 100 : 0,
      rows: [['Mendekati target (70% sampai 99%)', `${Y.near} bulan`], ['Capaian tertinggi', Y.topPct ? `${Y.topPct.short}, ${fmtPct(Y.topPct.pct, 0)}` : '-']] }
  ];
  renderKpis(cards);

  /* grafik */
  $id('barChartHeading').textContent = `Target dan omset tiap bulan ${year}`;
  $id('barChartSub').textContent = `${scope}. Sentuh batang grafik untuk melihat nominalnya. ${curShort} masih berjalan.`;
  const labels = Y.months.map(m => m.status === 'current' ? [m.short, '(berjalan)'] : m.short);
  drawBarChart(labels, Y.months.map(m => (m.target > 0 ? m.target : null)), Y.months.map(m => m.omset), 'Target bulanan', 'Omset tercapai');

  if (isHolding && keys.length > 1) {
    const vals = keys.map(k => Y.months.reduce((a, m) => a + (m.by[k].omset || 0), 0));
    $id('donutChartHeading').textContent = `Kontribusi omset per entitas ${year}`;
    $id('donutChartSub').textContent = 'Porsi tiap entitas terhadap total omset setahun sampai hari ini.';
    drawDonutChart(keys.map(k => ENTITY_META[k].short), vals, fmtPct(pctOf(Y.omsetYtd, Y.targetYear)), 'dari target setahun', keys.map(k => ENTITY_COLOR[k]));
  } else {
    $id('donutChartHeading').textContent = 'Capaian terhadap target setahun';
    $id('donutChartSub').textContent = 'Bagian yang sudah tercapai dan sisa target.';
    drawDonutChart(['Omset tercapai', 'Sisa target'], [Y.omsetYtd, Math.max(0, Y.targetYear - Y.omsetYtd)], fmtPct(pctOf(Y.omsetYtd, Y.targetYear)), 'dari target setahun', [BRAND, '#DCE4E0']);
  }

  /* matriks capaian (hanya ringkasan keseluruhan) */
  const mx = $id('yearSection');
  if (isHolding) {
    mx.classList.remove('hidden');
    $id('yearSectionSub').textContent = `Capaian omset tiap entitas terhadap target bulannya. Geser ke samping untuk melihat semua bulan.`;
    $id('yearMatrixBody').innerHTML = yearMatrixHtml(Y, keys);
  } else { mx.classList.add('hidden'); $id('yearMatrixBody').innerHTML = ''; }

  /* tabel */
  const gold = !isHolding && meta1.isGold;
  $id('summaryTableHeading').textContent = `Rekap bulanan ${year}: ${scope}`;
  $id('summaryTableSub').textContent = `Target, omset, dan capaian tiap bulan${gold ? `. Omset emas ${goldTag()}` : ''}.`;
  $id('summaryTableHead').innerHTML = `<tr><th>Bulan</th><th class="num">Target bulan</th>${gold ? '<th class="num col-raw">Penjualan riil (100%)</th>' : ''}<th class="num">Omset${gold ? ` (${goldTag()})` : ''}</th><th class="num">Capaian</th><th class="num col-diff">Selisih dengan target</th></tr>`;
  const rowsHtml = Y.months.map(m => {
    const dual = v => `<span class="vf">${formatIDR(v)}</span><span class="vc">${formatCompact(v)}</span>`;
    const diff = m.omset !== null && m.target > 0 ? m.omset - m.target : null;
    let chip;
    if (m.status === 'future') chip = `<span class="chip chip-neutral">Belum berjalan</span>`;
    else if (m.status === 'current') chip = `<span class="chip chip-neutral">Berjalan</span>`;
    else if (!m.has) chip = `<span class="chip chip-neutral">Belum ada data</span>`;
    else chip = statusChip(m.pct || 0);
    const pctTxt = m.pct !== null ? fmtPct(m.pct, 1) : '-';
    const pcCls = m.status === 'past' && m.pct !== null ? (m.pct >= 100 ? 't-good' : m.pct >= 70 ? 't-warn' : 't-bad') : '';
    return `<tr class="${m.status === 'current' ? 'row-live' : ''}">
      <td class="cell-first" data-label="Bulan"><strong>${m.name}</strong></td>
      <td class="num" data-label="Target bulan">${m.target > 0 ? dual(m.target) : '-'}</td>
      ${gold ? `<td class="num col-raw" data-label="Penjualan riil (100%)">${m.status === 'future' ? '-' : formatIDR(m.raw)}</td>` : ''}
      <td class="num" data-label="Omset"><strong>${m.omset !== null ? dual(m.omset) : '-'}</strong></td>
      <td class="num" data-label="Capaian"><div>${chip}<span class="cell-sub pcv ${pcCls}">${pctTxt}</span></div></td>
      <td class="num col-diff" data-label="Selisih"><strong class="${diff === null ? '' : diff >= 0 ? 't-good' : 't-bad'}">${diff === null ? '-' : (diff >= 0 ? '+' : '') + formatIDR(diff)}</strong></td></tr>`;
  }).join('');
  const sumTarget = Y.targetToDate;
  const curDays = Math.max(1, Number(STATE.latestDate.slice(8, 10)));
  const totalRow = `<tr class="row-total">
      <td class="cell-first" data-label="Bulan"><strong>Total sampai ${dateLabel}</strong></td>
      <td class="num" data-label="Target bulan"><div><strong><span class="vf">${formatIDR(sumTarget)}</span><span class="vc">${formatCompact(sumTarget)}</span></strong><span class="cell-sub">${curShort} dihitung ${curDays} hari</span></div></td>
      ${gold ? `<td class="num col-raw" data-label="Penjualan riil (100%)"><strong>${formatIDR(Y.months.filter(m => m.status !== 'future').reduce((a, m) => a + m.raw, 0))}</strong></td>` : ''}
      <td class="num" data-label="Omset"><strong><span class="vf">${formatIDR(Y.omsetYtd)}</span><span class="vc">${formatCompact(Y.omsetYtd)}</span></strong></td>
      <td class="num" data-label="Capaian"><div>${statusChip(pctOf(Y.omsetYtd, sumTarget))}<span class="cell-sub pcv">${fmtPct(pctOf(Y.omsetYtd, sumTarget))}</span></div></td>
      <td class="num col-diff" data-label="Selisih"><strong class="${Y.omsetYtd - sumTarget >= 0 ? 't-good' : 't-bad'}">${Y.omsetYtd - sumTarget >= 0 ? '+' : ''}${formatIDR(Y.omsetYtd - sumTarget)}</strong></td></tr>`;
  $id('summaryTableBody').innerHTML = rowsHtml + totalRow;

  /* bahan teks bagikan */
  STATE.share = {
    title: `${isHolding ? 'Pakkawaru Group' : meta1.short} - Setahun ${year}`,
    head: [
      `Omset sampai ${dateLabel}: ${formatIDR(Y.omsetYtd)} (${fmtPct(pctOf(Y.omsetYtd, Y.targetYear))} dari target setahun ${formatIDR(Y.targetYear)})`,
      `Rata-rata per bulan: ${formatIDR(Y.avg)}. Bulan mencapai target: ${Y.hit} dari ${Y.done.length}.`
    ],
    rows: Y.months.filter(m => m.has && m.status !== 'future').map(m => [m.name + (m.status === 'current' ? ' (berjalan)' : ''), formatIDR(m.omset), m.pct !== null ? `${fmtPct(m.pct, 0)} dari target ${formatCompact(m.target)}` : '']),
    gold: hasGold
  };
}

/* ======================= BAGIKAN ======================= */
function buildShareText() {
  const sh = STATE.share;
  if (!sh) return '';
  const lines = [`*${sh.title}*`, ...(sh.head || [])];
  if (sh.rows && sh.rows.length) {
    lines.push('');
    sh.rows.forEach(r => lines.push(`• ${r[0]}: ${r[1]}${r[2] ? ' (' + r[2] + ')' : ''}`));
  }
  if (sh.gold) lines.push('', `Omset emas (SJP dan PPM) ${goldTag()}.`);
  const upd = DATA && DATA.generatedAtWib ? `, diperbarui ${String(DATA.generatedAtWib).slice(11, 16)} WIB` : '';
  lines.push('', `_Data sampai ${fmtShortDate(STATE.latestDate)}${upd}_`);
  return lines.join('\n');
}

function showToast(msg) {
  const t = $id('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

async function shareSummary() {
  const text = buildShareText();
  if (!text) { showToast('Data belum siap dibagikan.'); return; }
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast('Ringkasan disalin. Tempel di WhatsApp.');
  } catch (e) {
    window.prompt('Salin ringkasan ini:', text);
  }
}
/**
 * ============================================================================
 * STATUS SINKRONISASI, KESEGARAN DATA & EVENT LISTENERS
 * ============================================================================
 */
function fmtShortDate(iso) {
  if (!iso) return '-';
  return `${Number(iso.slice(8, 10))} ${MONTH_NAMES[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}

function setLoading(on, silent) {
  const bar = document.getElementById('loadingBar');
  if (bar && !silent) bar.classList.toggle('active', on);
  const btn = document.getElementById('btnSyncNow');
  if (btn) btn.classList.toggle('spinning', on);
}

function setSyncOk(r) {
  const el = document.getElementById('lastSyncText');
  const dot = document.querySelector('.sync-badge');
  if (dot) dot.classList.remove('sync-error');
  if (el) el.textContent = `Data sampai ${fmtShortDate(STATE.latestDate)}, diperbarui ${(r.generatedAtWib || '').slice(11, 16)} WIB`;
}

function setSyncError(err) {
  const el = document.getElementById('lastSyncText');
  const dot = document.querySelector('.sync-badge');
  if (dot) dot.classList.add('sync-error');
  if (el) el.textContent = DATA ? 'Gagal memperbarui, menampilkan data terakhir' : 'Gagal memuat data';
  console.warn('Sync gagal:', err);
  if (!DATA) {
    const strip = document.getElementById('customDateProgressStrip');
    if (strip) strip.innerHTML = `<div class="state-box"><h2>Data belum bisa dimuat</h2><p>${String(err && err.message || err)}. Periksa alamat data di Pengaturan, lalu tekan Perbarui.</p></div>`;
  }
}

function renderFreshness() {
  const el = document.getElementById('dataFreshness');
  if (!el || !DATA) return;
  const ids = Object.keys(SOURCE_NAMES).filter(id => (DATA.channels && DATA.channels[id]) || (DATA.daily && DATA.daily[id]));
  let lagging = 0;
  const chips = ids.map(id => {
    const src = (DATA.channels && DATA.channels[id]) || DATA.daily[id];
    const through = src.through || '';
    const lag = through ? daysBetween(through, STATE.latestDate) : 99;
    if (lag > 0) lagging++;
    const cls = lag <= 0 ? 'fresh-ok' : (lag <= 2 ? 'fresh-warn' : 'fresh-old');
    const rows = src.rows ? `, ${src.rows.toLocaleString('id-ID')} baris` : '';
    return `<span class="fresh-chip ${cls}" title="${SOURCE_NAMES[id]}: data terakhir ${through || 'tidak ada'}${rows}">${SOURCE_NAMES[id]} <b>${through ? fmtShortDate(through) : 'kosong'}</b></span>`;
  }).join('');
  const diag = (DATA.diag || []).length ? `<div class="fresh-diag">${DATA.diag.map(d => `<div>${d}</div>`).join('')}</div>` : '';
  const wasOpen = el.classList.contains('open');
  const msg = lagging === 0
    ? `Semua sumber data sudah sampai ${fmtShortDate(STATE.latestDate)}.`
    : `Data terbaru sampai ${fmtShortDate(STATE.latestDate)}. ${lagging} dari ${ids.length} sumber belum diperbarui.`;
  const dotColor = lagging === 0 ? '#0B7A4B' : '#B45309';
  el.innerHTML = `
    <button class="fresh-summary" type="button" aria-expanded="${wasOpen}">
      <i class="dot" style="--c:${dotColor}"></i><span>${msg}</span>
      <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="fresh-body">
      <div class="fresh-chips">${chips}</div>
      <p class="fresh-note">Hijau berarti sumber sudah sampai tanggal terbaru. Kuning atau merah berarti sheet sumbernya belum diisi sampai tanggal itu, sehingga omsetnya masih kurang.</p>
      ${diag}
    </div>`;
  el.querySelector('.fresh-summary').addEventListener('click', () => {
    el.classList.toggle('open');
    el.querySelector('.fresh-summary').setAttribute('aria-expanded', el.classList.contains('open'));
  });
}

function updateGoldToggleUI() {
  const a = document.getElementById('goldModeDiv3'), b = document.getElementById('goldModeRaw');
  if (a) a.classList.toggle('active', STATE.goldMode === 'div3');
  if (b) b.classList.toggle('active', STATE.goldMode === 'raw');
}

async function loadData(opts) {
  opts = opts || {};
  if (fetching) return;
  const token = sessionStorage.getItem(SESSION_KEY);
  if (!token) return;
  fetching = true;
  setLoading(true, opts.silent);
  try {
    const r = await apiCall({ action: 'data', token, force: !!opts.force });
    if (!r.ok) {
      if (r.error === 'auth') { lockDashboard(r.message); return; }
      throw new Error(r.message || 'Gagal memuat data');
    }
    try { sessionStorage.setItem(DATA_CACHE_KEY, JSON.stringify(r)); } catch (_) {}
    ingestData(r);
    renderApp();
    setSyncOk(r);
  } catch (err) {
    setSyncError(err);
  } finally {
    fetching = false;
    setLoading(false);
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => { if (!document.hidden) loadData({ silent: true }); }, REFRESH_MS);
}
function stopAutoRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null; }

function unlockDashboard() {
  document.getElementById('securityGateOverlay').classList.add('hidden');
  document.getElementById('appMainWrapper').classList.remove('hidden');
  try {
    const cached = JSON.parse(sessionStorage.getItem(DATA_CACHE_KEY) || 'null');
    if (cached && cached.ok) { ingestData(cached); renderApp(); setSyncOk(cached); }
  } catch (_) {}
  if (!DATA) renderApp();
  loadData();
  startAutoRefresh();
}

function lockDashboard(msg) {
  stopAutoRefresh();
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(DATA_CACHE_KEY);
  DATA = null;
  document.getElementById('authPassword').value = '';
  document.getElementById('authPinInput').value = '';
  document.getElementById('appMainWrapper').classList.add('hidden');
  document.getElementById('securityGateOverlay').classList.remove('hidden');
  const err = document.getElementById('authErrorMsg');
  if (msg) { err.textContent = msg; err.classList.remove('hidden'); } else { err.classList.add('hidden'); }
  refreshApiFieldVisibility();
}

function refreshApiFieldVisibility() {
  const wrap = document.getElementById('authApiWrap');
  if (wrap) wrap.classList.toggle('hidden', !!getApiUrl());
}

window.switchTab = function (tabKey) {
  STATE.activeTab = tabKey;
  STATE.subChannel = 'all';
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderApp();
  centerActiveTab();
};

function centerActiveTab() {
  const a = document.querySelector('.nav-tab.active');
  if (a && a.scrollIntoView) { try { a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) { a.scrollIntoView(); } }
}

/* titik penunjuk untuk kartu angka yang bisa digeser di ponsel */
function bindKpiDots() {
  const grid = document.getElementById('primaryKpiGrid'), dots = document.getElementById('kpiDots');
  if (!grid || !dots) return;
  const n = grid.children.length;
  dots.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  grid.scrollLeft = 0;
  if (grid._dotsBound) return;
  grid._dotsBound = true;
  grid.addEventListener('scroll', () => {
    const first = grid.children[0];
    if (!first) return;
    const step = first.getBoundingClientRect().width + 12;
    const idx = Math.min(grid.children.length - 1, Math.round(grid.scrollLeft / step));
    dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === idx));
  }, { passive: true });
}

window.setHoldingRegion = function (regionName) {
  STATE.holdingRegion = regionName;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderApp();
};

window.selectSubChannel = function (chId) {
  STATE.subChannel = chId;
  renderApp();
};

document.addEventListener('DOMContentLoaded', () => {
  renderPresetButtons();
  buildMonthSelector();
  refreshApiFieldVisibility();
  const pwBtn = document.getElementById('btnTogglePw');
  pwBtn.addEventListener('click', () => {
    const f = document.getElementById('authPassword');
    const show = f.type === 'password';
    f.type = show ? 'text' : 'password';
    pwBtn.textContent = show ? 'Sembunyikan' : 'Lihat';
  });

  if (sessionStorage.getItem(SESSION_KEY) && getApiUrl()) unlockDashboard();

  document.getElementById('authLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('authErrorMsg');
    const btn = e.target.querySelector('button[type=submit]');
    const label = btn.querySelector('span');
    const apiField = document.getElementById('authApiUrl');
    if (!getApiUrl() && apiField && apiField.value.trim()) localStorage.setItem('pg_api_url', apiField.value.trim());
    if (!getApiUrl()) { errEl.textContent = 'URL API belum diisi.'; errEl.classList.remove('hidden'); return; }

    btn.disabled = true; label.textContent = 'Memeriksa...';
    try {
      const r = await apiCall({
        action: 'login',
        username: document.getElementById('authUsername').value.trim(),
        password: document.getElementById('authPassword').value,
        pin: document.getElementById('authPinInput').value.trim()
      });
      if (r.ok) {
        sessionStorage.setItem(SESSION_KEY, r.token);
        document.getElementById('authPassword').value = '';
        document.getElementById('authPinInput').value = '';
        errEl.classList.add('hidden');
        unlockDashboard();
      } else {
        errEl.textContent = r.message || 'Username, Password, atau PIN tidak sesuai.';
        errEl.classList.remove('hidden');
      }
    } catch (err) {
      errEl.textContent = 'Tidak dapat terhubung ke server: ' + (err && err.message || err);
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false; label.textContent = 'Masuk ke Dashboard';
    }
  });

  document.getElementById('btnLockSession').addEventListener('click', () => lockDashboard());

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => window.switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('#holdingRegionTabs .region-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => window.setHoldingRegion(btn.dataset.region));
  });

  document.getElementById('btnHomeLogo').addEventListener('click', () => {
    STATE.holdingRegion = 'all';
    window.switchTab('holding');
  });

  document.getElementById('monthSelector').addEventListener('change', e => {
    STATE.selectedMonth = e.target.value;
    STATE.lastMonth = e.target.value;
    renderApp();
  });

  document.querySelectorAll('#viewScope .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setScope(btn.dataset.scope);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      renderApp();
    });
  });

  document.getElementById('btnToggleFilters').addEventListener('click', () => {
    STATE.filtersOpen = !STATE.filtersOpen;
    document.getElementById('filtersBox').classList.toggle('open', STATE.filtersOpen);
    document.getElementById('btnToggleFilters').setAttribute('aria-expanded', String(STATE.filtersOpen));
  });

  document.getElementById('btnShare').addEventListener('click', shareSummary);

  ['filterStartDate', 'filterEndDate'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      const s = document.getElementById('filterStartDate').value;
      const e = document.getElementById('filterEndDate').value;
      if (s && e) {
        STATE.startDate = s;
        STATE.endDate = e < s ? s : e;
        document.getElementById('filterEndDate').value = STATE.endDate;
        STATE.rangePreset = 'custom';
        renderPresetButtons();
        renderApp();
      }
    });
  });

  document.getElementById('chartViewMode').addEventListener('change', e => {
    STATE.chartMode = e.target.value;
    renderApp();
  });

  document.getElementById('goldModeDiv3').addEventListener('click', () => { STATE.goldMode = 'div3'; renderApp(); });
  document.getElementById('goldModeRaw').addEventListener('click', () => { STATE.goldMode = 'raw'; renderApp(); });

  document.getElementById('btnOpenConfig').addEventListener('click', () => {
    document.getElementById('cfgApiUrl').value = getApiUrl();
    document.getElementById('cfgMyrRate').value = STATE.myrRate;
    document.getElementById('settingsModal').classList.remove('hidden');
  });

  document.getElementById('btnCloseSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
  });

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    const newUrl = document.getElementById('cfgApiUrl').value.trim();
    const urlChanged = newUrl !== getApiUrl();
    if (newUrl) localStorage.setItem('pg_api_url', newUrl); else localStorage.removeItem('pg_api_url');
    const rate = Number(document.getElementById('cfgMyrRate').value);
    const serverRate = DATA && DATA.kurs;
    if (rate > 0 && rate !== serverRate) localStorage.setItem('pg_myr_override', String(rate));
    else localStorage.removeItem('pg_myr_override');
    STATE.myrRate = (rate > 0 ? rate : serverRate) || 4452;
    document.getElementById('settingsModal').classList.add('hidden');
    if (urlChanged) { sessionStorage.removeItem(DATA_CACHE_KEY); loadData({ force: true }); }
    renderApp();
  });

  document.getElementById('btnSyncNow').addEventListener('click', () => loadData({ force: true }));

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && sessionStorage.getItem(SESSION_KEY)) loadData({ silent: true });
  });
});
