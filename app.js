/**
 * ============================================================================
 * PAKKAWARU GROUP — EXECUTIVE FINANCIAL DASHBOARD ENGINE (app.js v7)
 * v7: data diambil LANGSUNG dari Google Sheet lewat Apps Script API
 *     (tidak ada lagi angka/kredensial yang tertanam di file ini).
 * - Login (username/password/PIN) diperiksa di SERVER, bukan di browser
 * - Auto-refresh tiap 2 menit + tombol Refresh + penanda "Data s.d."
 * - Emas SJP/PPM: bisa dilihat Riil 100% maupun ÷3
 * ============================================================================
 */

// Tempel URL Web App Apps Script di sini (berakhiran /exec).
// Boleh dikosongkan: layar login akan meminta URL-nya sekali saja.
const API_URL_DEFAULT = '';

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
  opts.push(`<option value="${STATE.allKey}">Akumulasi Tahun ${STATE.currentMonth.slice(0, 4)}</option>`);
  sel.innerHTML = opts.join('');
  sel.value = STATE.selectedMonth;
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
 * HERO CARD PROGRES TARGET CUSTOM TANGGAL (KONTRAS TINGGI & SANGAT JELAS)
 * ============================================================================
 */
function renderHeroTargetProgress(scopeName, targetHarian, targetCustom, targetBulanan, omsetActual, days) {
  const pctCustom = targetCustom > 0 ? Number(((omsetActual / targetCustom) * 100).toFixed(2)) : 0;
  const pctMonth = targetBulanan > 0 ? Number(((omsetActual / targetBulanan) * 100).toFixed(2)) : 0;
  const fillWidth = Math.max(4, Math.min(100, pctCustom));

  document.getElementById('customDateProgressStrip').innerHTML = `
    <div class="ht-top">
      <div>
        <span class="ht-pill">Evaluasi Target Custom Tanggal • ${days} Hari Aktif</span>
        <h2 class="ht-title">Progres Target: ${formatReadableRange()}</h2>
        <p class="ht-subtitle">Mengukur pencapaian <strong>${scopeName}</strong> terhadap target ${days} hari (${days} hari × Target Harian ${formatIDR(targetHarian)})</p>
      </div>
      <div class="ht-pct-giant">
        <strong>${pctCustom}%</strong>
        <span>Tercapai dari Target ${days} Hari</span>
      </div>
    </div>

    <div class="ht-metrics-row">
      <div class="ht-box">
        <small>1. Target Custom (${days} Hari)</small>
        <strong>${formatIDR(targetCustom)}</strong>
        <span>Rumus: ${days} Hari × ${formatIDR(targetHarian)}/hari</span>
      </div>
      <div class="ht-box">
        <small>2. Omset Tercapai (${days} Hari)</small>
        <strong style="color:#34D399;">${formatIDR(omsetActual)}</strong>
        <span>Rata-rata Aktual: ${formatIDR(omsetActual / days)}/hari</span>
      </div>
      <div class="ht-box">
        <small>3. Target Bulanan Penuh (30 Hari)</small>
        <strong>${formatIDR(targetBulanan)}</strong>
        <span>Progres terhadap Bulan Penuh: ${pctMonth}%</span>
      </div>
    </div>

    <div class="ht-bar-container">
      <div class="ht-bar-labels">
        <span>Bar Progres Pencapaian Target ${days} Hari (${scopeName})</span>
        <span>${formatIDR(omsetActual)} / ${formatIDR(targetCustom)} (${pctCustom}%)</span>
      </div>
      <div class="ht-bar-track">
        <div class="ht-bar-fill" style="width:${fillWidth}%"></div>
      </div>
      <div class="ht-bar-ticks">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100% Target (${formatCompact(targetCustom)})</span>
      </div>
    </div>
  `;
}

/**
 * ============================================================================
 * RENDERER UTAMA DASHBOARD
 * ============================================================================
 */
function renderApp() {
  const days = getActiveDaysCount();
  const isRealtimeNov = STATE.selectedMonth === STATE.currentMonth;
  updateGoldToggleUI();
  renderFreshness();

  // Tampilan Kurs MYR di Header HANYA muncul saat buka sub-tab Shopee Malaysia Safwan
  const isShopeeMalaysiaOnly = (STATE.activeTab === 'safwan' && STATE.subChannel === 'shopeeMalaysia');
  const fxBadgeEl = document.getElementById('fxRateBadge');
  if (fxBadgeEl) {
    fxBadgeEl.classList.toggle('hidden', !isShopeeMalaysiaOnly);
    document.getElementById('fxRateText').textContent = `Kurs Shopee Malaysia: 1 MYR = ${formatIDR(STATE.myrRate)}`;
  }

  document.getElementById('realtimeDatePresets').classList.toggle('hidden', !isRealtimeNov);
  document.getElementById('customDateWrap').classList.toggle('hidden', !isRealtimeNov);

  const regionTabsEl = document.getElementById('holdingRegionTabs');
  if (regionTabsEl) {
    regionTabsEl.classList.toggle('hidden', STATE.activeTab !== 'holding');
  }

  if (STATE.activeTab === 'holding') {
    renderHoldingView(days);
  } else {
    renderSingleEntityView(STATE.activeTab, days);
  }
}

/**
 * A. TAMPILAN KESELURUHAN PAKKAWARU GROUP & MODE DETAIL DAERAH (BANDUNG / GORONTALO)
 */
function renderHoldingView(days) {
  const allKeys = ['safwan', 'ansan', 'amalqu', 'latihhobi', 'sjp', 'ppm'];
  const allReports = allKeys.map(k => computeEntityReport(k));

  // Filter berdasarkan Mode Daerah (Semua Daerah | Detail Daerah Bandung | Detail Daerah Gorontalo)
  const activeReports = STATE.holdingRegion === 'all'
    ? allReports
    : allReports.filter(r => r.region === STATE.holdingRegion);

  const scopeLabel = STATE.holdingRegion === 'all'
    ? 'Keseluruhan Pakkawaru Group (6 Entitas)'
    : STATE.holdingRegion === 'Bandung'
      ? 'Daerah Bandung (4 Entitas)'
      : `Daerah Gorontalo (2 Entitas Emas ${goldTag()})`;

  const totTargetBulan = activeReports.reduce((a, b) => a + b.targetBulanan, 0);
  const totTargetHari = activeReports.reduce((a, b) => a + b.targetHarian, 0);
  const totTargetCustom = activeReports.reduce((a, b) => a + b.targetCustomTanggal, 0);
  const totOmset = activeReports.reduce((a, b) => a + b.validOmset, 0);
  const totEstimasi = activeReports.reduce((a, b) => a + b.estimasiBulan, 0);
  const totValidQty = activeReports.reduce((a, b) => a + b.validQty, 0);
  const totCancelQty = activeReports.reduce((a, b) => a + b.cancelQty, 0);
  const totCancelOmset = activeReports.reduce((a, b) => a + b.cancelOmset, 0);

  const pctBulan = totTargetBulan > 0 ? ((totOmset / totTargetBulan) * 100).toFixed(2) : '0.00';
  const pctCustom = totTargetCustom > 0 ? ((totOmset / totTargetCustom) * 100).toFixed(2) : '0.00';
  const pctEstimasi = totTargetBulan > 0 ? ((totEstimasi / totTargetBulan) * 100).toFixed(2) : '0.00';
  const pctCancel = (totOmset + totCancelOmset) > 0 ? ((totCancelOmset / (totOmset + totCancelOmset)) * 100).toFixed(2) : '0.00';

  document.getElementById('viewBadgeTag').textContent = STATE.holdingRegion === 'all'
    ? 'KESELURUHAN PAKKAWARU GROUP • 6 ENTITAS'
    : `DASHBOARD DETAIL DAERAH ${STATE.holdingRegion.toUpperCase()}`;

  document.getElementById('viewTitleHeading').textContent = STATE.holdingRegion === 'all'
    ? 'Ringkasan Eksekutif Pakkawaru Group'
    : `Dashboard Detail Daerah ${STATE.holdingRegion}`;

  document.getElementById('viewSubtitleDesc').textContent = `Target Bulanan: ${formatIDR(totTargetBulan)} • Target Harian: ${formatIDR(totTargetHari)}`;

  document.getElementById('channelSubPills').classList.add('hidden');
  document.getElementById('malaysiaFxBanner').classList.add('hidden');
  document.getElementById('regionalCompareSection').classList.remove('hidden');

  // Update tombol aktif pada tab mode daerah
  document.querySelectorAll('#holdingRegionTabs .region-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.region === STATE.holdingRegion);
  });

  // 1. Hero Card Progres Target Custom Tanggal
  renderHeroTargetProgress(scopeLabel, totTargetHari, totTargetCustom, totTargetBulan, totOmset, days);

  // 2. Render 6 Kartu Indikator Utama
  const ecomValidOmset = activeReports.filter(r => r.hasQty).reduce((a, b) => a + b.validOmset, 0);
  renderSixCards([
    {
      title: 'Target Bulanan (30 Hari)',
      badge: `${activeReports.length} Entitas`,
      value: formatIDR(totTargetBulan),
      subLeft: 'Capaian terhadap Bulan:',
      subRight: `${pctBulan}%`,
      pct: Math.min(100, Number(pctBulan)),
      tone: 'tone-indigo'
    },
    {
      title: `Target Harian & Custom (${days} Hr)`,
      badge: `${days} Hr × Target Harian`,
      dualLeftLabel: 'Target Harian (1 Hr)',
      dualLeftVal: formatCompact(totTargetHari),
      dualRightLabel: `Target Custom (${days} Hr)`,
      dualRightVal: formatIDR(totTargetCustom),
      subLeft: 'Rumus Target Custom:',
      subRight: `${days} Hr × ${formatCompact(totTargetHari)}`,
      pct: Math.min(100, Number(pctCustom)),
      tone: 'tone-blue'
    },
    {
      title: `Omset Tercapai (${days} Hari)`,
      badge: `${pctCustom}% dari Target ${days} Hr`,
      value: formatIDR(totOmset),
      subLeft: `Target ${days} Hari (${formatCompact(totTargetCustom)}):`,
      subRight: `${pctCustom}% Tercapai`,
      pct: Math.min(100, Number(pctCustom)),
      tone: 'tone-emerald'
    },
    {
      title: 'Estimasi Akhir Bulan',
      badge: `${pctEstimasi}% Target Bulan`,
      value: formatIDR(totEstimasi),
      subLeft: 'Rata-rata Omset/Hari:',
      subRight: formatIDR(totOmset / days),
      pct: Math.min(100, Number(pctEstimasi)),
      tone: 'tone-purple'
    },
    {
      title: 'Pesanan Berhasil / Proses',
      badge: `${(100 - Number(pctCancel)).toFixed(1)}% Valid`,
      dualLeftLabel: 'Qty Berhasil',
      dualLeftVal: `${totValidQty.toLocaleString('id-ID')} Pcs`,
      dualRightLabel: 'Omset Toko & Meta',
      dualRightVal: formatCompact(ecomValidOmset),
      subLeft: 'Status Transaksi:',
      subRight: 'Masuk Omset',
      pct: 100 - Number(pctCancel),
      tone: 'tone-amber'
    },
    {
      title: 'Data Return / Cancel',
      badge: `${pctCancel}% Penjualan`,
      dualLeftLabel: 'Qty Cancel / RTS',
      dualLeftVal: `${totCancelQty.toLocaleString('id-ID')} Pcs`,
      dualRightLabel: 'Nominal Cancel / RTS',
      dualRightVal: formatIDR(totCancelOmset),
      subLeft: 'Perlakuan Data:',
      subRight: 'Tidak Masuk Omset',
      pct: Math.min(100, Number(pctCancel)),
      tone: 'tone-rose'
    }
  ]);

  // 3. Render Dashboard Per Daerah Ukuran Besar (Bandung & Gorontalo) lengkap dengan Rincian Entitas & Tombol Detail
  const bandungList = allReports.filter(r => r.region === 'Bandung');
  const gorontaloList = allReports.filter(r => r.region === 'Gorontalo');

  const bdgTargetBulan = bandungList.reduce((a, b) => a + b.targetBulanan, 0);
  const bdgTargetHari = bandungList.reduce((a, b) => a + b.targetHarian, 0);
  const bdgTargetCustom = bandungList.reduce((a, b) => a + b.targetCustomTanggal, 0);
  const bdgOmset = bandungList.reduce((a, b) => a + b.validOmset, 0);
  const bdgEst = bandungList.reduce((a, b) => a + b.estimasiBulan, 0);
  const bdgPctCustom = bdgTargetCustom > 0 ? Number(((bdgOmset / bdgTargetCustom) * 100).toFixed(2)) : 0;
  const bdgPctBulan = bdgTargetBulan > 0 ? Number(((bdgOmset / bdgTargetBulan) * 100).toFixed(2)) : 0;

  const gtoTargetBulan = gorontaloList.reduce((a, b) => a + b.targetBulanan, 0);
  const gtoTargetHari = gorontaloList.reduce((a, b) => a + b.targetHarian, 0);
  const gtoTargetCustom = gorontaloList.reduce((a, b) => a + b.targetCustomTanggal, 0);
  const gtoOmset = gorontaloList.reduce((a, b) => a + b.validOmset, 0);
  const gtoRaw = gorontaloList.reduce((a, b) => a + b.rawBeforeDiv3, 0);
  const gtoEst = gorontaloList.reduce((a, b) => a + b.estimasiBulan, 0);
  const gtoPctCustom = gtoTargetCustom > 0 ? Number(((gtoOmset / gtoTargetCustom) * 100).toFixed(2)) : 0;
  const gtoPctBulan = gtoTargetBulan > 0 ? Number(((gtoOmset / gtoTargetBulan) * 100).toFixed(2)) : 0;

  document.getElementById('regionalCompareSection').innerHTML = `
    <!-- KARTU BESAR DAERAH BANDUNG -->
    <div class="reg-card-lg ${STATE.holdingRegion === 'Bandung' ? 'active-region-focus' : ''}">
      <div class="reg-lg-header">
        <div>
          <h3>Dashboard Daerah Bandung (4 Entitas)</h3>
          <p>Target Bulanan: ${formatIDR(bdgTargetBulan)} • Target Harian: ${formatIDR(bdgTargetHari)}</p>
        </div>
        <span class="reg-lg-badge ${bdgPctCustom >= 100 ? 'badge-success' : 'badge-neutral'}">${bdgPctCustom}% Target ${days} Hr</span>
      </div>

      <div class="reg-lg-hero-numbers">
        <div class="reg-lg-num-box">
          <small>Target Custom (${days} Hari)</small>
          <strong style="color:#4F46E5;">${formatIDR(bdgTargetCustom)}</strong>
          <span>${days} Hr × ${formatCompact(bdgTargetHari)}</span>
        </div>
        <div class="reg-lg-num-box">
          <small>Omset Tercapai (${days} Hari)</small>
          <strong style="color:#047857;">${formatIDR(bdgOmset)}</strong>
          <span>Estimasi Bulan: ${formatCompact(bdgEst)} (${bdgPctBulan}% Bln)</span>
        </div>
      </div>

      <div class="reg-lg-progress">
        <div class="reg-lg-progress-top">
          <span>Progres Target ${days} Hari Daerah Bandung</span>
          <strong>${bdgPctCustom}% Tercapai</strong>
        </div>
        <div class="kpi-bar-track" style="height:10px;">
          <div class="kpi-bar-fill" style="width:${Math.max(4, Math.min(100, bdgPctCustom))}%;background:#2563EB;"></div>
        </div>
      </div>

      <div class="reg-lg-entities">
        ${bandungList.map(e => `
          <div class="reg-ent-row">
            <span>${e.short}</span>
            <strong>${formatIDR(e.validOmset)} <small style="color:#2563EB;">(${e.persenCustomTanggal}% dari ${days} Hr)</small></strong>
          </div>
        `).join('')}
      </div>

      <div class="reg-lg-footer">
        <button class="btn-reg-detail ${STATE.holdingRegion === 'Bandung' ? 'active' : ''}" onclick="setHoldingRegion('${STATE.holdingRegion === 'Bandung' ? 'all' : 'Bandung'}')">
          ${STATE.holdingRegion === 'Bandung' ? 'Tampilkan Semua Daerah (Nasional)' : 'Lihat Fokus Detail Daerah Bandung'}
        </button>
      </div>
    </div>

    <!-- KARTU BESAR DAERAH GORONTALO -->
    <div class="reg-card-lg ${STATE.holdingRegion === 'Gorontalo' ? 'active-region-focus' : ''}">
      <div class="reg-lg-header">
        <div>
          <h3>Dashboard Daerah Gorontalo (2 Entitas Emas ${goldTag()})</h3>
          <p>Target Bulanan: ${formatIDR(gtoTargetBulan)} • Target Harian: ${formatIDR(gtoTargetHari)}</p>
        </div>
        <span class="reg-lg-badge ${gtoPctCustom >= 100 ? 'badge-success' : 'badge-warning'}">${gtoPctCustom}% Target ${days} Hr</span>
      </div>

      <div class="reg-lg-hero-numbers">
        <div class="reg-lg-num-box">
          <small>Target Custom (${days} Hari)</small>
          <strong style="color:#4F46E5;">${formatIDR(gtoTargetCustom)}</strong>
          <span>${days} Hr × ${formatCompact(gtoTargetHari)}</span>
        </div>
        <div class="reg-lg-num-box">
          <small>Omset Emas ${goldTag()} (${days} Hari)</small>
          <strong style="color:#047857;">${formatIDR(gtoOmset)}</strong>
          <span>Riil 100%: ${formatCompact(gtoRaw)} • ÷ 3: ${formatCompact(Math.round(gtoRaw / 3))}</span>
        </div>
      </div>

      <div class="reg-lg-progress">
        <div class="reg-lg-progress-top">
          <span>Progres Target ${days} Hari Daerah Gorontalo</span>
          <strong>${gtoPctCustom}% Tercapai</strong>
        </div>
        <div class="kpi-bar-track" style="height:10px;">
          <div class="kpi-bar-fill" style="width:${Math.max(4, Math.min(100, gtoPctCustom))}%;background:#10B981;"></div>
        </div>
      </div>

      <div class="reg-lg-entities">
        ${gorontaloList.map(e => `
          <div class="reg-ent-row">
            <span>${e.short} <small style="color:#64748B;">(Riil: ${formatCompact(e.rawBeforeDiv3)})</small></span>
            <strong>${formatIDR(e.validOmset)} <small style="color:#047857;">(${e.persenCustomTanggal}% dari ${days} Hr)</small></strong>
          </div>
        `).join('')}
      </div>

      <div class="reg-lg-footer">
        <button class="btn-reg-detail ${STATE.holdingRegion === 'Gorontalo' ? 'active' : ''}" onclick="setHoldingRegion('${STATE.holdingRegion === 'Gorontalo' ? 'all' : 'Gorontalo'}')">
          ${STATE.holdingRegion === 'Gorontalo' ? 'Tampilkan Semua Daerah (Nasional)' : 'Lihat Fokus Detail Daerah Gorontalo'}
        </button>
      </div>
    </div>
  `;

  // 4. Render Grafik & Tabel
  renderChartsForHolding(activeReports, pctCustom, days, scopeLabel);

  document.getElementById('summaryTableHeading').textContent = `Tabel Capaian Entitas — ${scopeLabel} (${formatReadableRange()})`;
  document.getElementById('summaryTableHead').innerHTML = `
    <tr>
      <th>Entitas Bisnis</th>
      <th>Target Bulanan</th>
      <th>Target Harian</th>
      <th>Target Custom (${days} Hr)</th>
      <th>Omset Tercapai (${days} Hr)</th>
      <th>% Capaian (${days} Hr)</th>
      <th>Qty Berhasil</th>
      <th>Return / Cancel (Pcs & Nominal)</th>
      <th>Estimasi Akhir Bulan</th>
      <th>Rincian</th>
    </tr>
  `;

  document.getElementById('summaryTableBody').innerHTML = activeReports.map(r => `
    <tr>
      <td>
        <strong style="color:#0F172A;display:block;">${r.name}</strong>
        <small style="color:#64748B;">Daerah ${r.region} ${r.isGold ? '• Riil 100%: ' + formatIDR(r.rawBeforeDiv3) + ' • ÷ 3: ' + formatIDR(Math.round(r.rawBeforeDiv3 / 3)) : ''}</small>
      </td>
      <td>${formatIDR(r.targetBulanan)}</td>
      <td>${formatIDR(r.targetHarian)}</td>
      <td><strong style="color:#4F46E5;">${formatIDR(r.targetCustomTanggal)}</strong><br><small style="color:#64748B;">(${days} Hr × Target Harian)</small></td>
      <td><strong style="color:#047857;">${formatIDR(r.validOmset)}</strong></td>
      <td>
        <span class="status-badge ${r.persenCustomTanggal >= 100 ? 'badge-success' : 'badge-neutral'}">${r.persenCustomTanggal}% dari ${days} Hr</span>
        <small style="display:block;color:#64748B;margin-top:2px;">${r.persenBulanan}% dari Bulan</small>
      </td>
      <td>${r.hasQty ? `<strong>${r.validQty.toLocaleString('id-ID')} Pcs</strong>` : '-'}</td>
      <td>${r.hasQty ? `<strong style="color:#BE123C;">${r.cancelQty.toLocaleString('id-ID')} Pcs</strong> • <strong style="color:#BE123C;">${formatIDR(r.cancelOmset)}</strong><br><small style="color:#64748B;">(${r.cancelRatePct}% dari penjualan)</small>` : '-'}</td>
      <td>
        <strong>${formatIDR(r.estimasiBulan)}</strong>
        <small style="display:block;color:#64748B;">(${r.estimasiPct}% Target)</small>
      </td>
      <td><button class="btn-table-jump" onclick="switchTab('${r.key}')">Buka Entitas</button></td>
    </tr>
  `).join('');
}

/**
 * B. TAMPILAN MASING-MASING ENTITAS
 */
function renderSingleEntityView(entityKey, days) {
  const rep = computeEntityReport(entityKey);
  const fullEntityRep = STATE.subChannel !== 'all' ? computeRealtimeNovemberEntity(entityKey, days) : rep;
  const isShopeeMalaysiaOnly = (entityKey === 'safwan' && STATE.subChannel === 'shopeeMalaysia' && STATE.selectedMonth === STATE.currentMonth);

  document.getElementById('viewBadgeTag').textContent = `DAERAH ${rep.region.toUpperCase()} • ${rep.isGold ? (STATE.goldMode === 'raw' ? 'PENJUALAN RIIL 100% (SEBELUM ÷ 3)' : 'OMSET PENJUALAN DIBAGI 3') : 'LAPORAN ENTITAS'}`;
  document.getElementById('viewTitleHeading').textContent = STATE.subChannel === 'all'
    ? rep.name
    : `${rep.name} — ${(fullEntityRep.channels.find(c => c.id === STATE.subChannel) || {}).name || ''}`;
  document.getElementById('viewSubtitleDesc').textContent = `Target Bulanan Entitas: ${formatIDR(rep.targetBulanan)} • Target Harian Entitas: ${formatIDR(rep.targetHarian)}`;

  document.getElementById('regionalCompareSection').classList.add('hidden');

  // Hero Card Progres Target Custom Tanggal
  renderHeroTargetProgress(rep.name, rep.targetHarian, rep.targetCustomTanggal, rep.targetBulanan, fullEntityRep.validOmset, days);

  // Pilihan Sub-Toko untuk PT Safwan & PT BQY Ansan
  const subPillsEl = document.getElementById('channelSubPills');
  if ((entityKey === 'safwan' || entityKey === 'ansan') && STATE.selectedMonth === STATE.currentMonth) {
    subPillsEl.classList.remove('hidden');
    const allChannels = fullEntityRep.channels;
    const pillItems = [{ id: 'all', name: 'Semua Akun / Toko' }, ...allChannels];
    subPillsEl.innerHTML = pillItems.map(p => `
      <button class="sub-pill ${STATE.subChannel === p.id ? 'active' : ''}" onclick="selectSubChannel('${p.id}')">${p.name}</button>
    `).join('');
  } else {
    subPillsEl.classList.add('hidden');
  }

  // Panel Konversi Ringgit ke Rupiah HANYA muncul saat klik sub-tab "Shopee Malaysia Safwan"
  const fxBanner = document.getElementById('malaysiaFxBanner');
  if (isShopeeMalaysiaOnly) {
    const myStats = sumSeries(REALTIME_NOV_DAILY.shopeeMalaysia, true);
    const totalMyr = myStats.rawMyrValid + myStats.rawMyrCancel;
    const myCancelPct = totalMyr > 0 ? ((myStats.rawMyrCancel / totalMyr) * 100).toFixed(2) : '0.00';
    fxBanner.classList.remove('hidden');
    fxBanner.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="font-size:15px;">Konversi Realtime Shopee Malaysia Safwan (Ringgit MYR ⇄ Rupiah IDR)</strong>
          <p style="font-size:12px;color:#94A3B8;">Menampilkan data asli dalam Ringgit Malaysia beserta hasil konversi Rupiah (Kurs: 1 MYR = ${formatIDR(STATE.myrRate)})</p>
        </div>
        <span class="status-badge badge-neutral">Khusus Shopee Malaysia</span>
      </div>
      <div class="fx-grid">
        <div class="fx-item">
          <small>Omset Tercapai (Ringgit)</small>
          <strong>${formatMYR(myStats.rawMyrValid)}</strong>
          <span>Qty Berhasil/Proses: ${myStats.validQty} Pcs</span>
        </div>
        <div class="fx-item">
          <small>Omset Tercapai (Rupiah)</small>
          <strong>${formatIDR(myStats.validOmset)}</strong>
          <span>Hasil Konversi ke Rupiah</span>
        </div>
        <div class="fx-item">
          <small>Return / Cancel (Ringgit)</small>
          <strong>${formatMYR(myStats.rawMyrCancel)}</strong>
          <span style="color:#FDA4AF;">Qty Cancel: ${myStats.cancelQty} Pcs (${myCancelPct}%)</span>
        </div>
        <div class="fx-item">
          <small>Return / Cancel (Rupiah)</small>
          <strong>${formatIDR(myStats.cancelOmset)}</strong>
          <span style="color:#FDA4AF;">Tidak Dimasukkan ke Omset</span>
        </div>
      </div>
    `;
  } else {
    fxBanner.classList.add('hidden');
  }

  const omsetCardDisplay = isShopeeMalaysiaOnly
    ? `${formatIDR(rep.validOmset)} (${formatMYR(rep.rawMyrValid)})`
    : formatIDR(rep.validOmset);

  const cancelRightValDisplay = isShopeeMalaysiaOnly
    ? `${formatIDR(rep.cancelOmset)} (${formatMYR(rep.rawMyrCancel)})`
    : formatIDR(rep.cancelOmset);

  renderSixCards([
    {
      title: 'Target Bulanan (30 Hari)',
      badge: rep.short,
      value: formatIDR(rep.targetBulanan),
      subLeft: 'Capaian terhadap Bulan:',
      subRight: `${rep.persenBulanan}%`,
      pct: Math.min(100, rep.persenBulanan),
      tone: 'tone-indigo'
    },
    {
      title: `Target Harian & Custom (${days} Hr)`,
      badge: `${days} Hr × Target Harian`,
      dualLeftLabel: 'Target Harian (1 Hr)',
      dualLeftVal: formatCompact(rep.targetHarian),
      dualRightLabel: `Target Custom (${days} Hr)`,
      dualRightVal: formatIDR(rep.targetCustomTanggal),
      subLeft: 'Rumus Target Custom:',
      subRight: `${days} Hr × ${formatCompact(rep.targetHarian)}`,
      pct: Math.min(100, rep.persenCustomTanggal),
      tone: 'tone-blue'
    },
    {
      title: `Omset Tercapai (${days} Hari)`,
      badge: `${rep.persenCustomTanggal}% dari Target ${days} Hr`,
      value: omsetCardDisplay,
      subLeft: rep.isGold ? (STATE.goldMode === 'raw' ? 'Diakui ÷ 3:' : 'Penjualan Riil (100%):') : `Target ${days} Hari (${formatCompact(rep.targetCustomTanggal)}):`,
      subRight: rep.isGold ? formatCompact(STATE.goldMode === 'raw' ? Math.round(rep.rawBeforeDiv3 / 3) : rep.rawBeforeDiv3) : `${rep.persenCustomTanggal}% Tercapai`,
      pct: Math.min(100, rep.persenCustomTanggal),
      tone: 'tone-emerald'
    },
    {
      title: 'Estimasi Akhir Bulan',
      badge: `${rep.estimasiPct}% Target Bulan`,
      value: formatIDR(rep.estimasiBulan),
      subLeft: 'Rata-rata Omset/Hari:',
      subRight: formatIDR(rep.validOmset / days),
      pct: Math.min(100, rep.estimasiPct),
      tone: 'tone-purple'
    },
    {
      title: 'Pesanan Berhasil / Proses',
      badge: `${(100 - rep.cancelRatePct).toFixed(1)}% Valid`,
      dualLeftLabel: rep.isGold ? 'Penjualan Riil (100%)' : (rep.hasQty ? 'Qty Berhasil' : 'Transaksi Aktif'),
      dualLeftVal: rep.isGold ? formatIDR(rep.rawBeforeDiv3) : (rep.hasQty ? `${rep.validQty.toLocaleString('id-ID')} Pcs` : `${rep.validQty} Hari/Batch`),
      dualRightLabel: rep.isGold ? 'Omset Diakui (÷ 3)' : 'Nominal Omset Valid',
      dualRightVal: rep.isGold ? formatIDR(Math.round(rep.rawBeforeDiv3 / 3)) : omsetCardDisplay,
      subLeft: 'Status Data:',
      subRight: 'Masuk Omset Tercapai',
      pct: 100 - rep.cancelRatePct,
      tone: 'tone-amber'
    },
    {
      title: 'Data Return / Cancel',
      badge: `${rep.cancelRatePct}% Penjualan`,
      dualLeftLabel: 'Qty Cancel / RTS',
      dualLeftVal: `${rep.cancelQty.toLocaleString('id-ID')} Pcs`,
      dualRightLabel: 'Nominal Cancel / RTS',
      dualRightVal: cancelRightValDisplay,
      subLeft: 'Perlakuan Data:',
      subRight: 'Dikeluarkan dari Omset',
      pct: Math.min(100, rep.cancelRatePct),
      tone: 'tone-rose'
    }
  ]);

  renderChartsForSingleEntity(entityKey, rep, days);
  renderTableForSingleEntity(entityKey, rep, days);
}

function renderSixCards(cards) {
  document.getElementById('primaryKpiGrid').innerHTML = cards.map(c => {
    const mainBody = c.dualLeftLabel
      ? `<div class="kpi-dual-box">
           <div><small>${c.dualLeftLabel}</small><strong>${c.dualLeftVal}</strong></div>
           <div><small>${c.dualRightLabel}</small><strong style="color:${c.tone === 'tone-rose' ? '#BE123C' : c.tone === 'tone-blue' ? '#4F46E5' : '#047857'};">${c.dualRightVal}</strong></div>
         </div>`
      : `<div class="kpi-value">${c.value}</div>`;

    return `
      <div class="kpi-card ${c.tone}">
        <div class="kpi-top">
          <span class="kpi-title">${c.title}</span>
          <span class="kpi-badge">${c.badge}</span>
        </div>
        ${mainBody}
        <div class="kpi-bar-track">
          <div class="kpi-bar-fill" style="width:${Math.max(4, Math.min(100, c.pct || 0))}%"></div>
        </div>
        <div class="kpi-sub">
          <span>${c.subLeft}</span>
          <strong>${c.subRight}</strong>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * ============================================================================
 * VISUALISASI GRAFIK & TABEL RINCIAN AKUN
 * ============================================================================
 */
function renderChartsForHolding(reports, pctCustom, days, scopeLabel) {
  document.getElementById('barChartHeading').textContent = `Grafik Perbandingan Target vs Omset — ${scopeLabel}`;
  document.getElementById('donutChartHeading').textContent = `Proporsi Kontribusi Omset (${days} Hari)`;

  if (STATE.chartMode === 'monthly_trend') {
    const mKeys = Object.keys(MONTHLY_HISTORY_2026);
    const labels = mKeys.map(k => MONTHLY_HISTORY_2026[k].label.slice(0, 3));
    const activeKeys = reports.map(r => r.key);
    const targets = mKeys.map(k => activeKeys.reduce((acc, ek) => acc + MONTHLY_HISTORY_2026[k][ek][0], 0));
    const actuals = mKeys.map(k => activeKeys.reduce((acc, ek) => {
      const raw = MONTHLY_HISTORY_2026[k][ek][1];
      return acc + (ENTITY_META[ek].isGold ? goldVal(raw) : raw);
    }, 0));
    const curShort = MONTH_NAMES[Number(STATE.currentMonth.slice(5, 7)) - 1].slice(0, 3);
    const curFull = activeKeys.map(ek => monthFullReport(ek));
    labels.push(curShort + ' (Live)');
    targets.push(curFull.reduce((a, r) => a + r.targetBulanan, 0));
    actuals.push(curFull.reduce((a, r) => a + r.validOmset, 0));
    drawBarChart(labels, targets, actuals, 'Target Bulanan', 'Omset Tercapai');
  } else if (STATE.chartMode === 'real_vs_estimasi') {
    drawBarChart(
      reports.map(r => r.short),
      reports.map(r => r.validOmset),
      reports.map(r => r.estimasiBulan),
      'Omset Tercapai',
      'Estimasi Akhir Bulan'
    );
  } else if (STATE.chartMode === 'monthly_target') {
    drawBarChart(
      reports.map(r => r.short),
      reports.map(r => r.targetBulanan),
      reports.map(r => r.validOmset),
      'Target Bulanan (30 Hr)',
      'Omset Tercapai'
    );
  } else {
    drawBarChart(
      reports.map(r => r.short),
      reports.map(r => r.targetCustomTanggal),
      reports.map(r => r.validOmset),
      `Target Custom (${days} Hr)`,
      `Omset Tercapai (${days} Hr)`
    );
  }

  drawDonutChart(
    reports.map(r => r.short),
    reports.map(r => r.validOmset),
    pctCustom + '%',
    `Target ${days} Hr`
  );
}

function renderChartsForSingleEntity(entityKey, rep, days) {
  const mKeys = Object.keys(MONTHLY_HISTORY_2026);
  const curShort = MONTH_NAMES[Number(STATE.currentMonth.slice(5, 7)) - 1].slice(0, 3);
  const curFull = monthFullReport(entityKey);
  const labels = [...mKeys.map(k => MONTHLY_HISTORY_2026[k].label.slice(0, 3)), curShort + ' (Live)'];
  const targets = [...mKeys.map(k => MONTHLY_HISTORY_2026[k][entityKey][0]), curFull.targetBulanan];
  const actuals = [
    ...mKeys.map(k => {
      const raw = MONTHLY_HISTORY_2026[k][entityKey][1];
      return rep.isGold ? goldVal(raw) : raw;
    }),
    curFull.validOmset
  ];

  document.getElementById('barChartHeading').textContent = `Tren Bulanan 2026 — ${rep.short}`;
  drawBarChart(labels, targets, actuals, 'Target Bulanan', 'Omset Tercapai');

  if (rep.channels && rep.channels.length > 0 && STATE.subChannel === 'all') {
    document.getElementById('donutChartHeading').textContent = 'Porsi Omset per Akun / Toko';
    drawDonutChart(
      rep.channels.map(c => c.name),
      rep.channels.map(c => c.validOmset),
      rep.persenCustomTanggal + '%',
      `Target ${days} Hr`
    );
  } else {
    document.getElementById('donutChartHeading').textContent = `Capaian terhadap Target Custom (${days} Hari)`;
    drawDonutChart(
      [`Omset Tercapai (${days} Hr)`, `Sisa Target ${days} Hari`],
      [rep.validOmset, Math.max(0, rep.targetCustomTanggal - rep.validOmset)],
      rep.persenCustomTanggal + '%',
      `Target ${days} Hr`
    );
  }
}

function renderTableForSingleEntity(entityKey, rep, days) {
  if (rep.channels && rep.channels.length > 0 && STATE.selectedMonth === STATE.currentMonth) {
    document.getElementById('summaryTableHeading').textContent = `Rincian Performa Akun / Toko — ${rep.name} (${formatReadableRange()})`;

    const allChannels = computeRealtimeNovemberEntity(entityKey, days).channels;
    const rowsToShow = STATE.subChannel === 'all'
      ? allChannels
      : allChannels.filter(c => c.id === STATE.subChannel);

    document.getElementById('summaryTableHead').innerHTML = `
      <tr>
        <th>Nama Akun / Toko</th>
        <th>Omset Tercapai (Valid)</th>
        <th>Qty Berhasil / Proses</th>
        <th>Return / Cancel (Pcs)</th>
        <th>Nominal Return / Cancel</th>
        <th>% Cancel dari Penjualan</th>
      </tr>
    `;

    document.getElementById('summaryTableBody').innerHTML = rowsToShow.map(c => {
      const tot = c.validOmset + c.cancelOmset;
      const cPct = tot > 0 ? ((c.cancelOmset / tot) * 100).toFixed(2) : '0.00';
      // Tampilkan Ringgit HANYA jika user sedang memilih sub-tab Shopee Malaysia
      const showMyrHere = (c.isMyr && STATE.subChannel === 'shopeeMalaysia');
      const omsetCell = showMyrHere
        ? `<strong style="color:#047857;">${formatIDR(c.validOmset)}</strong><br><small style="color:#2563EB;font-weight:700;">Ringgit: ${formatMYR(c.rawMyrValid)}</small>`
        : `<strong style="color:#047857;">${formatIDR(c.validOmset)}</strong>`;

      const cancelNominalCell = showMyrHere
        ? `<strong style="color:#BE123C;">${formatIDR(c.cancelOmset)}</strong><br><small style="color:#BE123C;font-weight:700;">Ringgit: ${formatMYR(c.rawMyrCancel)}</small>`
        : `<strong style="color:#BE123C;">${formatIDR(c.cancelOmset)}</strong>`;

      return `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${omsetCell}</td>
          <td><strong>${c.validQty.toLocaleString('id-ID')} Pcs</strong></td>
          <td><span class="status-badge badge-danger">${c.cancelQty.toLocaleString('id-ID')} Pcs</span></td>
          <td>${cancelNominalCell}</td>
          <td><strong>${cPct}%</strong></td>
        </tr>
      `;
    }).join('');
  } else {
    document.getElementById('summaryTableHeading').textContent = `Rekapitulasi Pencapaian Bulanan 2026 — ${rep.name}`;
    document.getElementById('summaryTableHead').innerHTML = `
      <tr>
        <th>Bulan</th>
        <th>Target Bulanan</th>
        <th>Target Harian</th>
        <th>${rep.isGold ? 'Penjualan Riil (100%)' : 'Jenis Data'}</th>
        <th>Omset Tercapai ${rep.isGold ? '(' + goldTag() + ')' : ''}</th>
        <th>% Capaian</th>
      </tr>
    `;
    const mKeys = Object.keys(MONTHLY_HISTORY_2026);
    document.getElementById('summaryTableBody').innerHTML = mKeys.map(k => {
      const t = MONTHLY_HISTORY_2026[k][entityKey][0];
      const raw = MONTHLY_HISTORY_2026[k][entityKey][1];
      const val = rep.isGold ? goldVal(raw) : raw;
      const pct = t > 0 ? ((val / t) * 100).toFixed(2) : '0.00';
      return `
        <tr>
          <td><strong>${MONTHLY_HISTORY_2026[k].label}</strong></td>
          <td>${formatIDR(t)}</td>
          <td>${formatIDR(t / 30)}</td>
          <td>${rep.isGold ? formatIDR(raw) : 'Data Historis'}</td>
          <td><strong>${formatIDR(val)}</strong></td>
          <td><span class="status-badge ${Number(pct) >= 100 ? 'badge-success' : 'badge-neutral'}">${pct}%</span></td>
        </tr>
      `;
    }).join('');
  }
}

function drawBarChart(labels, s1, s2, l1, l2) {
  const ctx = document.getElementById('mainBarCanvas').getContext('2d');
  if (STATE.barChart) STATE.barChart.destroy();

  STATE.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: l1, data: s1, backgroundColor: '#4F46E5', borderRadius: 6, barPercentage: 0.65, categoryPercentage: 0.6 },
        { label: l2, data: s2, backgroundColor: '#10B981', borderRadius: 6, barPercentage: 0.65, categoryPercentage: 0.6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' } } },
        tooltip: {
          backgroundColor: '#0F172A',
          padding: 12,
          cornerRadius: 8,
          callbacks: { label: c => ` ${c.dataset.label}: ${formatIDR(c.parsed.y)}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' } } },
        y: { border: { display: false }, grid: { color: '#F1F5F9' }, ticks: { callback: v => formatCompact(v) } }
      }
    }
  });
}

function drawDonutChart(labels, values, centerBig, centerSmall) {
  const palette = ['#2563EB', '#10B981', '#4F46E5', '#F59E0B', '#F43F5E', '#7C3AED'];
  const ctx = document.getElementById('mainDonutCanvas').getContext('2d');
  if (STATE.donutChart) STATE.donutChart.destroy();

  document.getElementById('donutCenterBig').textContent = centerBig;
  document.getElementById('donutCenterSmall').textContent = centerSmall;

  const total = values.reduce((a, b) => a + b, 0) || 1;

  STATE.donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0F172A',
          callbacks: {
            label: c => ` ${c.label}: ${formatIDR(c.parsed)} (${((c.parsed / total) * 100).toFixed(1)}%)`
          }
        }
      }
    }
  });

  document.getElementById('donutCustomLegend').innerHTML = labels.map((l, i) => `
    <div class="donut-legend-row">
      <span class="legend-swatch" style="background:${palette[i % palette.length]}"></span>
      <span title="${l}">${l}</span>
    </div>
  `).join('');
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
  if (el) el.textContent = `Data s.d. ${fmtShortDate(STATE.latestDate)} • Sync ${(r.generatedAtWib || '').slice(11, 16)} WIB`;
}

function setSyncError(err) {
  const el = document.getElementById('lastSyncText');
  const dot = document.querySelector('.sync-badge');
  if (dot) dot.classList.add('sync-error');
  if (el) el.textContent = DATA ? 'Gagal sync — menampilkan data terakhir' : 'Gagal memuat data';
  console.warn('Sync gagal:', err);
  if (!DATA) {
    const strip = document.getElementById('customDateProgressStrip');
    if (strip) strip.innerHTML = `<div class="ht-top"><div><span class="ht-pill">Tidak dapat memuat data</span><h2 class="ht-title">Gagal terhubung ke server data</h2><p class="ht-subtitle">${String(err && err.message || err)}. Periksa URL API di Pengaturan, lalu tekan Refresh.</p></div></div>`;
  }
}

function renderFreshness() {
  const el = document.getElementById('dataFreshness');
  if (!el || !DATA) return;
  const ids = Object.keys(SOURCE_NAMES).filter(id => (DATA.channels && DATA.channels[id]) || (DATA.daily && DATA.daily[id]));
  const chips = ids.map(id => {
    const src = (DATA.channels && DATA.channels[id]) || DATA.daily[id];
    const through = src.through || '';
    const lag = through ? daysBetween(through, STATE.latestDate) : 99;
    const cls = lag <= 0 ? 'fresh-ok' : (lag <= 2 ? 'fresh-warn' : 'fresh-old');
    const rows = src.rows ? ` • ${src.rows.toLocaleString('id-ID')} baris` : '';
    return `<span class="fresh-chip ${cls}" title="${SOURCE_NAMES[id]}: data terakhir ${through || 'tidak ada'}${rows}"><i></i>${SOURCE_NAMES[id]} <b>${through ? fmtShortDate(through) : '—'}</b></span>`;
  }).join('');
  const diag = (DATA.diag || []).length
    ? `<div class="fresh-diag">${DATA.diag.map(d => `<div>⚠ ${d}</div>`).join('')}</div>` : '';
  el.innerHTML = `
    <div class="fresh-head"><strong>Kesegaran data per sumber</strong><span>Hijau = sudah sampai ${fmtShortDate(STATE.latestDate)} • Kuning/merah = sumber belum diperbarui di spreadsheet</span></div>
    <div class="fresh-chips">${chips}</div>${diag}`;
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
  if (!DATA) {
    const strip = document.getElementById('customDateProgressStrip');
    if (strip) strip.innerHTML = '<div class="ht-top"><div><span class="ht-pill">Sinkronisasi</span><h2 class="ht-title">Memuat data dari spreadsheet…</h2><p class="ht-subtitle">Pertama kali bisa memakan waktu beberapa detik.</p></div></div>';
  }
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
};

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
    renderApp();
  });

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
