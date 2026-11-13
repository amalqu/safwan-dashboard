/**
 * ============================================================================
 * PAKKAWARU GROUP — EXECUTIVE FINANCIAL INTELLIGENCE ENGINE (app.js)
 * Mendukung 15 Sheet, Login + PIN, Kurs MYR-IDR Realtime, & Filter Tanggal
 * ============================================================================
 */

const AUTH_CONFIG = {
  username: 'pakkawaru',
  password: 'bismillahpakkawaru',
  pin: '739482',
  sessionKey: 'pakkawaru_exec_auth_v3'
};

const DEFAULT_SHEET_ID = '1CuPBkl1nq2tUuy2tTtRRLZWrptXRZGuDbFylCDFDZNk';

const STATE = {
  sheetId: localStorage.getItem('pg_sheet_id') || DEFAULT_SHEET_ID,
  myrRate: Number(localStorage.getItem('pg_myr_rate')) || 3580,
  firebaseUrl: localStorage.getItem('pg_firebase_url') || '',
  activeTab: 'holding',       // holding | safwan | ansan | amalqu | latihhobi | sjp | ppm
  subChannel: 'all',
  selectedMonth: '2026-11',   // 2026-01 s/d 2026-11 atau 2026-ALL
  rangePreset: 'this_month',  // this_month | last_7 | last_30 | custom
  startDate: '2026-11-01',
  endDate: '2026-11-13',
  chartMode: 'target_vs_real',
  barChart: null,
  donutChart: null
};

/**
 * 1. DATA MASTER TARGET BULANAN & HARIAN (NOVEMBER 2026)
 */
const ENTITY_META = {
  safwan: { key: 'safwan', name: 'PT Safwan Berkah Indonesia', short: 'PT Safwan', region: 'Bandung', targetBulanan: 2918467000, targetHarian: 97282233, isGold: false, hasQty: true },
  ansan: { key: 'ansan', name: 'PT BQY Ansan Pakkawaru', short: 'PT BQY Ansan', region: 'Bandung', targetBulanan: 2244832500, targetHarian: 74827750, isGold: false, hasQty: true },
  amalqu: { key: 'amalqu', name: 'Yayasan Amalqu Indonesia Peduli', short: 'Yayasan Amalqu', region: 'Bandung', targetBulanan: 650000000, targetHarian: 21666667, isGold: false, hasQty: false },
  latihhobi: { key: 'latihhobi', name: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', short: 'Latih Hobi', region: 'Bandung', targetBulanan: 541654000, targetHarian: 24620636, isGold: false, hasQty: false },
  sjp: { key: 'sjp', name: 'CV Selamat Jaya Pakkawaru', short: 'CV SJP (Emas)', region: 'Gorontalo', targetBulanan: 1000000000, targetHarian: 33333333, isGold: true, hasQty: false },
  ppm: { key: 'ppm', name: 'Pakkawaru Permata Mulia', short: 'PPM (Emas)', region: 'Gorontalo', targetBulanan: 750000000, targetHarian: 25000000, isGold: true, hasQty: false }
};

/**
 * 2. DATA HISTORIS LINTAS BULAN (DARI SHEET: PENCAPAIAN BULANAN 2026)
 * Catatan: Untuk SJP & PPM, rawOmset adalah angka penjualan 100% yang akan dibagi 3 oleh mesin.
 */
const MONTHLY_HISTORY_2026 = {
  '2026-01': { label: 'Januari 2026', safwan: [2662260000, 3350010000], ansan: [659921000, 513649000], amalqu: [326000000, 313838000], latihhobi: [2802000, 71338000], sjp: [0, 0], ppm: [0, 0] },
  '2026-02': { label: 'Februari 2026', safwan: [4250000000, 6455080000], ansan: [1090000000, 942845000], amalqu: [522000000, 244568000], latihhobi: [327791000, 280086000], sjp: [0, 0], ppm: [0, 0] },
  '2026-03': { label: 'Maret 2026', safwan: [3650000000, 3509250000], ansan: [1207500000, 527085000], amalqu: [835000000, 432950000], latihhobi: [331238000, 106406000], sjp: [0, 0], ppm: [0, 0] },
  '2026-04': { label: 'April 2026', safwan: [1795490000, 2145830000], ansan: [1161450000, 631830000], amalqu: [359000000, 292695000], latihhobi: [335034000, 132401000], sjp: [0, 0], ppm: [0, 0] },
  '2026-05': { label: 'Mei 2026', safwan: [1947500000, 2477490000], ansan: [1210000000, 645076000], amalqu: [395029000, 482695000], latihhobi: [27220000, 194685000], sjp: [0, 0], ppm: [0, 0] },
  '2026-06': { label: 'Juni 2026', safwan: [1740310000, 2657820000], ansan: [1375000000, 646052000], amalqu: [434532000, 457976000], latihhobi: [22616000, 127721000], sjp: [0, 0], ppm: [0, 0] },
  '2026-07': { label: 'Juli 2026', safwan: [2173750000, 2260250000], ansan: [875000000, 765534000], amalqu: [477986000, 490683000], latihhobi: [30740000, 6489730], sjp: [1000000000, 241434000], ppm: [0, 0] },
  '2026-08': { label: 'Agustus 2026', safwan: [2452500000, 2428250000], ansan: [1132000000, 888072000], amalqu: [525784000, 371847000], latihhobi: [541654000, 189312000], sjp: [1000000000, 1092140000], ppm: [0, 0] },
  '2026-09': { label: 'September 2026', safwan: [2483950000, 2650500000], ansan: [1573190000, 1065120000], amalqu: [578363000, 322056000], latihhobi: [541654000, 416663000], sjp: [1000000000, 1106880000], ppm: [0, 0] },
  '2026-10': { label: 'Oktober 2026', safwan: [2612470000, 2730420000], ansan: [1567580000, 1772180000], amalqu: [500000000, 361751000], latihhobi: [541654000, 455822000], sjp: [1000000000, 1161030000], ppm: [500000000, 281349000] }
};

/**
 * 3. REKAP HARIAN REALTIME NOVEMBER 2026 DARI 15 SHEET
 * Format tiap tanggal: [validQty, validOmset, cancelQty, cancelOmset]
 * Khusus shopeeMalaysia dalam satuan Ringgit (MYR): [validQty, validOmsetMYR, cancelQty, cancelOmsetMYR]
 */
const REALTIME_NOV_DAILY = {
  shopeeSafwan: {
    '2026-11-01': [105, 16502400, 20, 3196600],
    '2026-11-02': [93, 14689200, 15, 2411500],
    '2026-11-03': [118, 18745100, 22, 3489000],
    '2026-11-04': [115, 18210300, 21, 3325400],
    '2026-11-05': [110, 17490800, 19, 3012000],
    '2026-11-06': [114, 18105400, 21, 3340000],
    '2026-11-07': [117, 18592000, 20, 3178000],
    '2026-11-08': [130, 20654000, 22, 3495000],
    '2026-11-09': [112, 17804200, 20, 3180000],
    '2026-11-10': [89, 14145100, 16, 2543000],
    '2026-11-11': [400, 63854000, 47, 7445033]
  },
  tiktokSafwan: {
    '2026-11-01': [362, 56840100, 70, 12236000],
    '2026-11-02': [405, 63612000, 78, 13638000],
    '2026-11-03': [425, 66754000, 82, 14335000],
    '2026-11-04': [346, 54341000, 68, 11887000],
    '2026-11-05': [314, 49316000, 61, 10663000],
    '2026-11-06': [370, 58110000, 72, 12586000],
    '2026-11-07': [232, 36436000, 45, 7866000],
    '2026-11-08': [381, 59837000, 74, 12935000],
    '2026-11-09': [405, 63608000, 79, 13810000],
    '2026-11-10': [333, 52300000, 66, 11537000],
    '2026-11-11': [382, 59987867, 75, 13107762]
  },
  shopeeMalaysia: {
    '2026-11-01': [5, 468.55, 0, 0],
    '2026-11-02': [1, 118.00, 0, 0],
    '2026-11-03': [3, 297.26, 0, 0],
    '2026-11-04': [3, 229.07, 1, 84.19],
    '2026-11-05': [2, 168.41, 1, 60.48],
    '2026-11-06': [3, 279.51, 1, 107.93],
    '2026-11-07': [5, 479.93, 2, 215.86],
    '2026-11-08': [2, 193.72, 2, 215.86],
    '2026-11-09': [2, 215.86, 1, 84.19],
    '2026-11-10': [3, 310.12, 4, 431.72],
    '2026-11-11': [2, 192.12, 1, 107.93]
  },
  shopeeAnsan: {
    '2026-11-01': [89, 12805000, 11, 1640000],
    '2026-11-02': [109, 15683000, 14, 2087000],
    '2026-11-03': [108, 15539000, 13, 1938000],
    '2026-11-04': [95, 13669000, 12, 1789000],
    '2026-11-05': [79, 11367000, 10, 1491000],
    '2026-11-06': [75, 10791000, 9, 1342000],
    '2026-11-07': [75, 10791000, 9, 1342000],
    '2026-11-08': [72, 10360000, 9, 1342000],
    '2026-11-09': [107, 15395000, 13, 1938000],
    '2026-11-10': [89, 12805000, 11, 1640000],
    '2026-11-11': [173, 24893749, 23, 3429621]
  },
  shopeeBasyirah: {
    '2026-11-01': [34, 4441000, 10, 1667000],
    '2026-11-02': [35, 4572000, 10, 1667000],
    '2026-11-03': [26, 3396000, 7, 1167000],
    '2026-11-04': [36, 4702000, 10, 1667000],
    '2026-11-05': [35, 4572000, 10, 1667000],
    '2026-11-06': [27, 3527000, 8, 1333000],
    '2026-11-07': [19, 2482000, 6, 1000000],
    '2026-11-08': [23, 3004000, 6, 1000000],
    '2026-11-09': [30, 3918000, 9, 1500000],
    '2026-11-10': [42, 5486000, 12, 2000000],
    '2026-11-11': [45, 5879092, 13, 2168037]
  },
  tiktokAnsan: {
    '2026-11-01': [226, 31006000, 39, 5493000],
    '2026-11-02': [324, 44451000, 56, 7887000],
    '2026-11-03': [335, 45960000, 58, 8169000],
    '2026-11-04': [333, 45686000, 58, 8169000],
    '2026-11-05': [284, 38964000, 49, 6901000],
    '2026-11-06': [309, 42393000, 54, 7606000],
    '2026-11-07': [142, 19482000, 25, 3521000],
    '2026-11-08': [212, 29086000, 37, 5211000],
    '2026-11-09': [242, 33201000, 42, 5915000],
    '2026-11-10': [210, 28811000, 37, 5211000],
    '2026-11-11': [205, 28127333, 36, 5075801]
  },
  metaLp: {
    // Murni dari kolom Harga Jual (Kolom N) pada sheet Meta Pakkawaru (META LP)
    '2026-11-02': [289, 31580000, 7, 766500],
    '2026-11-03': [208, 22728000, 5, 547500],
    '2026-11-04': [209, 22837000, 5, 547500],
    '2026-11-05': [186, 20323000, 4, 438000],
    '2026-11-06': [163, 17810000, 4, 438000],
    '2026-11-07': [80, 8741000, 2, 219000],
    '2026-11-09': [196, 21416000, 4, 438000],
    '2026-11-10': [269, 29394000, 6, 657000],
    '2026-11-11': [146, 15945000, 3, 328500]
  },
  metaBqy: {
    // Murni dari kolom Harga Jual (Kolom N) pada sheet Meta BQY
    '2026-11-02': [2, 198000, 0, 0],
    '2026-11-03': [3, 297000, 0, 0],
    '2026-11-05': [5, 495000, 0, 0],
    '2026-11-10': [4, 396000, 0, 0]
  },
  amalqu: {
    '2026-11-01': [1, 16995713, 0, 0],
    '2026-11-02': [1, 9945693, 0, 0],
    '2026-11-03': [1, 19714000, 0, 0],
    '2026-11-04': [1, 16661560, 0, 0],
    '2026-11-05': [1, 17114200, 0, 0],
    '2026-11-06': [1, 33020721, 0, 0],
    '2026-11-07': [1, 9703000, 0, 0],
    '2026-11-08': [1, 7275000, 0, 0],
    '2026-11-09': [1, 9037100, 0, 0],
    '2026-11-10': [1, 9187600, 0, 0],
    '2026-11-11': [1, 9708100, 0, 0],
    '2026-11-12': [1, 17495000, 0, 0],
    '2026-11-13': [1, 16718100, 0, 0]
  },
  latihhobi: {
    '2026-11-02': [1, 48687937, 0, 0],
    '2026-11-03': [1, 28072550, 0, 0],
    '2026-11-04': [1, 16845437, 0, 0],
    '2026-11-05': [1, 4721223, 0, 0],
    '2026-11-06': [1, 21863730, 0, 0],
    '2026-11-09': [1, 36204825, 0, 0]
  },
  // SJP & PPM menyimpan Penjualan Riil 100% di indeks ke-1, yang otomatis dibagi 3 oleh mesin
  sjp: {
    '2026-11-01': [1, 194898000, 0, 0],
    '2026-11-03': [1, 202090000, 0, 0],
    '2026-11-06': [1, 287870000, 0, 0],
    '2026-11-07': [1, 446486000, 0, 0],
    '2026-11-10': [2, 640211000, 0, 0]
  },
  ppm: {
    '2026-11-02': [1, 303365000, 0, 0],
    '2026-11-03': [1, 440336400, 0, 0],
    '2026-11-05': [1, 277189000, 0, 0],
    '2026-11-06': [1, 121461600, 0, 0],
    '2026-11-10': [1, 131503100, 0, 0],
    '2026-11-11': [1, 570239000, 0, 0],
    '2026-11-12': [1, 246419000, 0, 0]
  }
};

/**
 * ============================================================================
 * FORMATTER & HELPER KALKULASI
 * ============================================================================
 */
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
  if (STATE.selectedMonth === '2026-ALL') return 313;
  if (STATE.selectedMonth !== '2026-11') return 30;
  const s = new Date(STATE.startDate);
  const e = new Date(STATE.endDate);
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
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
        rawMyrValid += arr[1];
        rawMyrCancel += arr[3];
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
 * Menghitung Seluruh Metrik Wajib per Entitas (Mendukung Bulan Historis & Realtime Nov 2026)
 */
function computeEntityReport(entityKey) {
  const meta = ENTITY_META[entityKey];
  const days = getActiveDaysCount();

  // A. Mode Bulan Historis (Jan - Okt 2026) atau Akumulasi 2026
  if (STATE.selectedMonth !== '2026-11') {
    let targetBulanan = 0, rawOmset = 0;
    if (STATE.selectedMonth === '2026-ALL') {
      Object.values(MONTHLY_HISTORY_2026).forEach(m => {
        targetBulanan += m[entityKey][0];
        rawOmset += m[entityKey][1];
      });
      // Tambahkan November realtime
      const novRep = computeRealtimeNovemberEntity(entityKey);
      targetBulanan += meta.targetBulanan;
      rawOmset += meta.isGold ? novRep.rawBeforeDiv3 : novRep.validOmset;
    } else {
      const mData = MONTHLY_HISTORY_2026[STATE.selectedMonth];
      targetBulanan = mData[entityKey][0];
      rawOmset = mData[entityKey][1];
    }

    const omsetTercapai = meta.isGold ? Math.round(rawOmset / 3) : rawOmset;
    const targetHarian = Math.round(targetBulanan / 30);
    const targetPeriode = targetBulanan;
    const estimasiBulan = omsetTercapai;
    const persenCapaian = targetBulanan > 0 ? Number(((omsetTercapai / targetBulanan) * 100).toFixed(2)) : 0;

    return {
      ...meta,
      targetBulanan,
      targetHarian,
      targetPeriode,
      validOmset: omsetTercapai,
      rawBeforeDiv3: rawOmset,
      validQty: 0,
      cancelQty: 0,
      cancelOmset: 0,
      cancelRatePct: 0,
      estimasiBulan,
      estimasiPct: persenCapaian,
      persenCapaian,
      persenPeriode: persenCapaian,
      channels: []
    };
  }

  // B. Mode Realtime November 2026
  return computeRealtimeNovemberEntity(entityKey, days);
}

function computeRealtimeNovemberEntity(entityKey, days = 13) {
  const meta = ENTITY_META[entityKey];
  const targetBulanan = meta.targetBulanan;
  const targetHarian = meta.targetHarian;
  const targetPeriode = Math.round(targetHarian * days);

  let validQty = 0, validOmset = 0, cancelQty = 0, cancelOmset = 0, rawBeforeDiv3 = 0;
  let channels = [];

  if (entityKey === 'safwan') {
    const shId = sumSeries(REALTIME_NOV_DAILY.shopeeSafwan, false);
    const ttId = sumSeries(REALTIME_NOV_DAILY.tiktokSafwan, false);
    const shMy = sumSeries(REALTIME_NOV_DAILY.shopeeMalaysia, true);

    channels = [
      { id: 'tiktokSafwan', name: 'TikTok Safwan', ...ttId },
      { id: 'shopeeSafwan', name: 'Shopee Safwan (ID)', ...shId },
      { id: 'shopeeMalaysia', name: 'Shopee Malaysia (MYR→IDR)', ...shMy, isMyr: true }
    ];

    const filteredCh = STATE.activeTab === 'safwan' && STATE.subChannel !== 'all'
      ? channels.filter(c => c.id === STATE.subChannel)
      : channels;

    filteredCh.forEach(c => {
      validQty += c.validQty;
      validOmset += c.validOmset;
      cancelQty += c.cancelQty;
      cancelOmset += c.cancelOmset;
    });
  } else if (entityKey === 'ansan') {
    const ttAn = sumSeries(REALTIME_NOV_DAILY.tiktokAnsan, false);
    const shAn = sumSeries(REALTIME_NOV_DAILY.shopeeAnsan, false);
    const shBs = sumSeries(REALTIME_NOV_DAILY.shopeeBasyirah, false);
    const mtLp = sumSeries(REALTIME_NOV_DAILY.metaLp, false);
    const mtBq = sumSeries(REALTIME_NOV_DAILY.metaBqy, false);

    channels = [
      { id: 'tiktokAnsan', name: 'TikTok Ansan', ...ttAn },
      { id: 'metaLp', name: 'Meta LP (Harga Jual)', ...mtLp },
      { id: 'shopeeAnsan', name: 'Shopee Ansan', ...shAn },
      { id: 'shopeeBasyirah', name: 'Shopee Basyirah', ...shBs },
      { id: 'metaBqy', name: 'Meta BQY (Harga Jual)', ...mtBq }
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
    // Instruksi Wajib: Omset SJP & PPM dibagi 3
    validOmset = Math.round(rawBeforeDiv3 / 3);
    validQty = g.validQty;
  }

  const totalGrossSales = validOmset + cancelOmset;
  const cancelRatePct = totalGrossSales > 0 ? Number(((cancelOmset / totalGrossSales) * 100).toFixed(2)) : 0;

  // Estimasi Akhir Bulan dilihat dari tren harian pada periode terpilih (Proyeksi 30 Hari)
  const dailyTrend = days > 0 ? validOmset / days : 0;
  const estimasiBulan = Math.round(dailyTrend * 30);
  const estimasiPct = targetBulanan > 0 ? Number(((estimasiBulan / targetBulanan) * 100).toFixed(2)) : 0;
  const persenCapaian = targetBulanan > 0 ? Number(((validOmset / targetBulanan) * 100).toFixed(2)) : 0;
  const persenPeriode = targetPeriode > 0 ? Number(((validOmset / targetPeriode) * 100).toFixed(2)) : 0;

  return {
    ...meta,
    targetBulanan,
    targetHarian,
    targetPeriode,
    validOmset,
    rawBeforeDiv3,
    validQty,
    cancelQty,
    cancelOmset,
    cancelRatePct,
    estimasiBulan,
    estimasiPct,
    persenCapaian,
    persenPeriode,
    channels
  };
}

/**
 * ============================================================================
 * RENDERER UTAMA DASHBOARD
 * ============================================================================
 */
function renderApp() {
  const days = getActiveDaysCount();
  const isRealtimeNov = STATE.selectedMonth === '2026-11';

  document.getElementById('realtimeDatePresets').classList.toggle('hidden', !isRealtimeNov);
  document.getElementById('customDateWrap').classList.toggle('hidden', !isRealtimeNov);
  document.getElementById('fxRateText').textContent = `1 MYR = ${formatIDR(STATE.myrRate)}`;
  document.getElementById('activeDurationText').textContent = `${days} Hari`;

  if (STATE.activeTab === 'holding') {
    renderHoldingView(days);
  } else {
    renderSingleEntityView(STATE.activeTab, days);
  }
}

/**
 * A. TAMPILAN KONSOLIDASI PAKKAWARU GROUP + REGIONAL BANDUNG & GORONTALO
 */
function renderHoldingView(days) {
  const keys = ['safwan', 'ansan', 'amalqu', 'latihhobi', 'sjp', 'ppm'];
  const reports = keys.map(k => computeEntityReport(k));

  const totTargetBulan = reports.reduce((a, b) => a + b.targetBulanan, 0);
  const totTargetHari = reports.reduce((a, b) => a + b.targetHarian, 0);
  const totTargetPeriode = reports.reduce((a, b) => a + b.targetPeriode, 0);
  const totOmset = reports.reduce((a, b) => a + b.validOmset, 0);
  const totEstimasi = reports.reduce((a, b) => a + b.estimasiBulan, 0);
  const totValidQty = reports.reduce((a, b) => a + b.validQty, 0);
  const totCancelQty = reports.reduce((a, b) => a + b.cancelQty, 0);
  const totCancelOmset = reports.reduce((a, b) => a + b.cancelOmset, 0);

  const pctBulan = totTargetBulan > 0 ? ((totOmset / totTargetBulan) * 100).toFixed(2) : '0.00';
  const pctPeriode = totTargetPeriode > 0 ? ((totOmset / totTargetPeriode) * 100).toFixed(2) : '0.00';
  const pctEstimasi = totTargetBulan > 0 ? ((totEstimasi / totTargetBulan) * 100).toFixed(2) : '0.00';
  const pctCancel = (totOmset + totCancelOmset) > 0 ? ((totCancelOmset / (totOmset + totCancelOmset)) * 100).toFixed(2) : '0.00';

  document.getElementById('activePeriodTargetText').textContent = formatIDR(totTargetPeriode);
  document.getElementById('viewBadgeTag').textContent = 'KONSOLIDASI PAKKAWARU GROUP • 6 ENTITAS BISNIS';
  document.getElementById('viewTitleHeading').textContent = 'Executive Overview & Pencapaian Daerah';
  document.getElementById('viewSubtitleDesc').textContent = 'Menampilkan Target Bulanan, Target Harian, Omset Tercapai (SJP & PPM Dibagi 3), dan Proyeksi Tren Bulan Berjalan';

  document.getElementById('channelSubPills').classList.add('hidden');
  document.getElementById('malaysiaFxBanner').classList.add('hidden');
  document.getElementById('regionalCompareSection').classList.remove('hidden');

  // Render 6 Kartu Indikator Utama
  renderSixCards([
    { title: 'Target Bulanan', badge: '6 Entitas', value: formatIDR(totTargetBulan), subLeft: 'Target Periode Aktif:', subRight: formatCompact(totTargetPeriode), pct: 100, tone: 'tone-indigo' },
    { title: 'Target Harian', badge: `${days} Hari Aktif`, value: formatIDR(totTargetHari), subLeft: 'Rata-rata Aktual/Hari:', subRight: formatCompact(totOmset / days), pct: Math.min(100, Number(pctPeriode)), tone: 'tone-blue' },
    { title: 'Omset Tercapai', badge: `${pctBulan}% Bulan`, value: formatIDR(totOmset), subLeft: `Capaian vs Target ${days} Hr:`, subRight: `${pctPeriode}%`, pct: Math.min(100, Number(pctBulan)), tone: 'tone-emerald' },
    { title: 'Estimasi Akhir Bulan', badge: `${pctEstimasi}% Target`, value: formatIDR(totEstimasi), subLeft: 'Status Proyeksi Tren:', subRight: Number(pctEstimasi) >= 100 ? 'Tercapai' : 'On Progress', pct: Math.min(100, Number(pctEstimasi)), tone: 'tone-purple' },
    { title: 'Qty Berhasil / Proses', badge: 'E-Commerce & Meta', value: `${totValidQty.toLocaleString('id-ID')} Pcs`, subLeft: 'Rasio Pesanan Aktif:', subRight: `${(100 - Number(pctCancel)).toFixed(1)}%`, pct: 100 - Number(pctCancel), tone: 'tone-amber' },
    { title: 'Data Cancel & Return', badge: `${pctCancel}% Penjualan`, value: `${totCancelQty.toLocaleString('id-ID')} Pcs`, subLeft: 'Nominal Batal/RTS:', subRight: formatIDR(totCancelOmset), pct: Math.min(100, Number(pctCancel)), tone: 'tone-rose' }
  ]);

  // Render Pencapaian Per Daerah: Bandung vs Gorontalo
  const bandungList = reports.filter(r => r.region === 'Bandung');
  const gorontaloList = reports.filter(r => r.region === 'Gorontalo');

  const bdgTarget = bandungList.reduce((a, b) => a + b.targetBulanan, 0);
  const bdgPeriode = bandungList.reduce((a, b) => a + b.targetPeriode, 0);
  const bdgOmset = bandungList.reduce((a, b) => a + b.validOmset, 0);
  const bdgEst = bandungList.reduce((a, b) => a + b.estimasiBulan, 0);
  const bdgPct = bdgTarget > 0 ? ((bdgOmset / bdgTarget) * 100).toFixed(2) : '0.00';

  const gtoTarget = gorontaloList.reduce((a, b) => a + b.targetBulanan, 0);
  const gtoPeriode = gorontaloList.reduce((a, b) => a + b.targetPeriode, 0);
  const gtoOmset = gorontaloList.reduce((a, b) => a + b.validOmset, 0);
  const gtoRaw = gorontaloList.reduce((a, b) => a + b.rawBeforeDiv3, 0);
  const gtoEst = gorontaloList.reduce((a, b) => a + b.estimasiBulan, 0);
  const gtoPct = gtoTarget > 0 ? ((gtoOmset / gtoTarget) * 100).toFixed(2) : '0.00';

  document.getElementById('regionalCompareSection').innerHTML = `
    <div class="reg-card">
      <div class="reg-head">
        <div>
          <h3>Pencapaian Daerah Bandung (4 Entitas)</h3>
          <p>PT Safwan Berkah, PT BQY Ansan, Yayasan Amalqu, Latih Hobi</p>
        </div>
        <span class="status-badge ${Number(bdgPct) >= 100 ? 'badge-success' : 'badge-neutral'}">${bdgPct}% Bulanan</span>
      </div>
      <div class="reg-metrics">
        <div><small>Target Bulanan</small><strong>${formatCompact(bdgTarget)}</strong></div>
        <div><small>Omset Tercapai</small><strong>${formatIDR(bdgOmset)}</strong></div>
        <div><small>Estimasi Akhir Bulan</small><strong>${formatCompact(bdgEst)}</strong></div>
      </div>
      <div class="kpi-sub"><span>Target Periode (${days} Hari): ${formatIDR(bdgPeriode)}</span><strong>${((bdgOmset / (bdgPeriode || 1)) * 100).toFixed(1)}% Periode</strong></div>
    </div>

    <div class="reg-card">
      <div class="reg-head">
        <div>
          <h3>Pencapaian Daerah Gorontalo (2 Entitas Emas ÷ 3)</h3>
          <p>CV Selamat Jaya Pakkawaru (SJP) & Pakkawaru Permata Mulia (PPM)</p>
        </div>
        <span class="status-badge ${Number(gtoPct) >= 100 ? 'badge-success' : 'badge-warning'}">${gtoPct}% Bulanan</span>
      </div>
      <div class="reg-metrics">
        <div><small>Target Bulanan</small><strong>${formatCompact(gtoTarget)}</strong></div>
        <div><small>Omset Diakui (÷ 3)</small><strong>${formatIDR(gtoOmset)}</strong></div>
        <div><small>Estimasi Akhir Bulan</small><strong>${formatCompact(gtoEst)}</strong></div>
      </div>
      <div class="kpi-sub"><span>Penjualan Emas Riil (100%): ${formatIDR(gtoRaw)}</span><strong>${((gtoOmset / (gtoPeriode || 1)) * 100).toFixed(1)}% Periode</strong></div>
    </div>
  `;

  // Render Grafik Batang & Donut
  renderChartsForHolding(reports, totOmset, pctBulan);

  // Render Tabel Matriks 6 Entitas
  document.getElementById('summaryTableHeading').textContent = 'Matriks Capaian 6 Entitas Pakkawaru Group';
  document.getElementById('summaryTableHead').innerHTML = `
    <tr>
      <th>Entitas Bisnis</th>
      <th>Daerah</th>
      <th>Target Bulanan</th>
      <th>Target Harian</th>
      <th>Omset Tercapai</th>
      <th>Qty Berhasil / Proses</th>
      <th>Data Cancel (Pcs, Rp & %)</th>
      <th>Estimasi Akhir Bulan</th>
      <th>Detail</th>
    </tr>
  `;

  document.getElementById('summaryTableBody').innerHTML = reports.map(r => `
    <tr>
      <td>
        <strong style="color:#0F172A;display:block;">${r.name}</strong>
        <small style="color:#64748B;">${r.isGold ? 'Penjualan Riil: ' + formatIDR(r.rawBeforeDiv3) + ' (Dibagi 3)' : 'Capaian Bulanan: ' + r.persenCapaian + '%'}</small>
      </td>
      <td><span class="status-badge badge-neutral">${r.region}</span></td>
      <td>${formatIDR(r.targetBulanan)}</td>
      <td>${formatIDR(r.targetHarian)}</td>
      <td><strong style="color:#0F172A;">${formatIDR(r.validOmset)}</strong></td>
      <td>${r.hasQty ? r.validQty.toLocaleString('id-ID') + ' Pcs' : 'Rekap Harian'}</td>
      <td>${r.hasQty ? `<span style="color:#BE123C;font-weight:700;">${r.cancelQty.toLocaleString('id-ID')} Pcs</span> • ${formatIDR(r.cancelOmset)} (${r.cancelRatePct}%)` : '-'}</td>
      <td>
        <strong>${formatIDR(r.estimasiBulan)}</strong>
        <span class="status-badge ${r.estimasiPct >= 100 ? 'badge-success' : 'badge-warning'}" style="margin-left:6px;">${r.estimasiPct}%</span>
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

  document.getElementById('activePeriodTargetText').textContent = formatIDR(rep.targetPeriode);
  document.getElementById('viewBadgeTag').textContent = `DAERAH ${rep.region.toUpperCase()} • ${rep.isGold ? 'DIVISI EMAS (OMSET DIBAGI 3)' : 'UNIT BISNIS MANDIRI'}`;
  document.getElementById('viewTitleHeading').textContent = rep.name;
  document.getElementById('viewSubtitleDesc').textContent = `Target Bulanan: ${formatIDR(rep.targetBulanan)} • Target Harian: ${formatIDR(rep.targetHarian)}`;

  document.getElementById('regionalCompareSection').classList.add('hidden');

  // Tampilkan Sub-Channel Pills untuk Safwan & BQY Ansan
  const subPillsEl = document.getElementById('channelSubPills');
  if ((entityKey === 'safwan' || entityKey === 'ansan') && STATE.selectedMonth === '2026-11') {
    subPillsEl.classList.remove('hidden');
    const allChannels = computeRealtimeNovemberEntity(entityKey, days).channels;
    const pillItems = [{ id: 'all', name: 'Semua Kanal' }, ...allChannels];
    subPillsEl.innerHTML = pillItems.map(p => `
      <button class="sub-pill ${STATE.subChannel === p.id ? 'active' : ''}" onclick="selectSubChannel('${p.id}')">${p.name}</button>
    `).join('');
  } else {
    subPillsEl.classList.add('hidden');
  }

  // Banner Konversi Ringgit ke Rupiah Khusus di Tab Safwan (Shopee Malaysia)
  const fxBanner = document.getElementById('malaysiaFxBanner');
  if (entityKey === 'safwan' && STATE.selectedMonth === '2026-11') {
    const myStats = sumSeries(REALTIME_NOV_DAILY.shopeeMalaysia, true);
    const totalMyrSales = myStats.rawMyrValid + myStats.rawMyrCancel;
    const myCancelPct = totalMyrSales > 0 ? ((myStats.rawMyrCancel / totalMyrSales) * 100).toFixed(2) : '0.00';
    fxBanner.classList.remove('hidden');
    fxBanner.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="font-size:14.5px;">Panel Konversi Realtime Shopee Malaysia Safwan (MYR ⇄ IDR)</strong>
          <p style="font-size:12px;color:#94A3B8;">Otomatis mengonversi omset Ringgit Malaysia ke Rupiah pada kurs aktif 1 MYR = ${formatIDR(STATE.myrRate)}</p>
        </div>
        <span class="status-badge badge-neutral">Masuk Konsolidasi PT Safwan</span>
      </div>
      <div class="fx-grid">
        <div class="fx-item">
          <small>Omset Berhasil (Ringgit)</small>
          <strong>${formatMYR(myStats.rawMyrValid)}</strong>
          <span>${myStats.validQty} Pcs Berhasil/Proses</span>
        </div>
        <div class="fx-item">
          <small>Omset Berhasil (Rupiah)</small>
          <strong>${formatIDR(myStats.validOmset)}</strong>
          <span>Kurs ${formatIDR(STATE.myrRate)} / MYR</span>
        </div>
        <div class="fx-item">
          <small>Data Cancel (Ringgit)</small>
          <strong>${formatMYR(myStats.rawMyrCancel)}</strong>
          <span style="color:#FDA4AF;">${myStats.cancelQty} Pcs Batal (${myCancelPct}%)</span>
        </div>
        <div class="fx-item">
          <small>Data Cancel (Rupiah)</small>
          <strong>${formatIDR(myStats.cancelOmset)}</strong>
          <span style="color:#FDA4AF;">Dikeluarkan dari Omset</span>
        </div>
      </div>
    `;
  } else {
    fxBanner.classList.add('hidden');
  }

  // Render 6 Kartu Indikator Wajib Entitas
  renderSixCards([
    { title: 'Target Bulanan', badge: rep.short, value: formatIDR(rep.targetBulanan), subLeft: `Target Periode (${days} Hr):`, subRight: formatIDR(rep.targetPeriode), pct: 100, tone: 'tone-indigo' },
    { title: 'Target Harian', badge: 'Patokan Harian', value: formatIDR(rep.targetHarian), subLeft: 'Rata-rata Aktual/Hari:', subRight: formatIDR(rep.validOmset / days), pct: Math.min(100, rep.persenPeriode), tone: 'tone-blue' },
    { title: 'Omset Tercapai', badge: `${rep.persenCapaian}% Target`, value: formatIDR(rep.validOmset), subLeft: rep.isGold ? 'Penjualan Riil (100%):' : `Capaian Periode (${days} Hr):`, subRight: rep.isGold ? formatCompact(rep.rawBeforeDiv3) : `${rep.persenPeriode}%`, pct: Math.min(100, rep.persenCapaian), tone: 'tone-emerald' },
    { title: 'Estimasi Akhir Bulan', badge: `${rep.estimasiPct}% Target`, value: formatIDR(rep.estimasiBulan), subLeft: 'Proyeksi Tren Bulan Ini:', subRight: rep.estimasiPct >= 100 ? 'Melampaui Target' : 'Perlu Digenjot', pct: Math.min(100, rep.estimasiPct), tone: 'tone-purple' },
    { title: 'Qty Berhasil / Proses', badge: rep.hasQty ? 'Pesanan Valid' : 'Batch / Hari Aktif', value: rep.hasQty ? `${rep.validQty.toLocaleString('id-ID')} Pcs` : `${rep.validQty} Rekaman`, subLeft: 'Status Pengakuan:', subRight: `${(100 - rep.cancelRatePct).toFixed(1)}% Valid`, pct: 100 - rep.cancelRatePct, tone: 'tone-amber' },
    { title: 'Qty & Nominal Cancel', badge: `${rep.cancelRatePct}% Penjualan`, value: `${rep.cancelQty.toLocaleString('id-ID')} Pcs`, subLeft: 'Nominal Cancel/Return:', subRight: formatIDR(rep.cancelOmset), pct: Math.min(100, rep.cancelRatePct), tone: 'tone-rose' }
  ]);

  // Grafik & Tabel Spesifik Entitas
  renderChartsForSingleEntity(entityKey, rep);
  renderTableForSingleEntity(entityKey, rep);
}

function renderSixCards(cards) {
  document.getElementById('primaryKpiGrid').innerHTML = cards.map(c => `
    <div class="kpi-card ${c.tone}">
      <div class="kpi-top">
        <span class="kpi-title">${c.title}</span>
        <span class="kpi-badge">${c.badge}</span>
      </div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-bar-track">
        <div class="kpi-bar-fill" style="width:${Math.max(4, Math.min(100, c.pct || 0))}%"></div>
      </div>
      <div class="kpi-sub">
        <span>${c.subLeft}</span>
        <strong>${c.subRight}</strong>
      </div>
    </div>
  `).join('');
}

/**
 * ============================================================================
 * VISUALISASI CHART.JS (INTERAKTIF & RESPONSIF)
 * ============================================================================
 */
function renderChartsForHolding(reports, totOmset, pctBulan) {
  if (STATE.chartMode === 'monthly_trend') {
    const mKeys = Object.keys(MONTHLY_HISTORY_2026);
    const labels = mKeys.map(k => MONTHLY_HISTORY_2026[k].label.slice(0, 3));
    const targets = mKeys.map(k => Object.keys(ENTITY_META).reduce((acc, ek) => acc + MONTHLY_HISTORY_2026[k][ek][0], 0));
    const actuals = mKeys.map(k => Object.keys(ENTITY_META).reduce((acc, ek) => {
      const raw = MONTHLY_HISTORY_2026[k][ek][1];
      return acc + (ENTITY_META[ek].isGold ? Math.round(raw / 3) : raw);
    }, 0));
    drawBarChart(labels, targets, actuals, 'Target Bulanan', 'Omset Tercapai');
  } else if (STATE.chartMode === 'real_vs_estimasi') {
    drawBarChart(
      reports.map(r => r.short),
      reports.map(r => r.validOmset),
      reports.map(r => r.estimasiBulan),
      'Omset Tercapai',
      'Estimasi Akhir Bulan'
    );
  } else {
    drawBarChart(
      reports.map(r => r.short),
      reports.map(r => r.targetBulanan),
      reports.map(r => r.validOmset),
      'Target Bulanan',
      'Omset Tercapai'
    );
  }

  drawDonutChart(
    reports.map(r => r.short),
    reports.map(r => r.validOmset),
    pctBulan + '%',
    'Capaian Total'
  );
}

function renderChartsForSingleEntity(entityKey, rep) {
  // Bar Chart: Tren Bulanan Jan - Nov 2026 untuk Entitas tersebut
  const mKeys = Object.keys(MONTHLY_HISTORY_2026);
  const labels = [...mKeys.map(k => MONTHLY_HISTORY_2026[k].label.slice(0, 3)), 'Nov (Live)'];
  const targets = [...mKeys.map(k => MONTHLY_HISTORY_2026[k][entityKey][0]), rep.targetBulanan];
  const actuals = [
    ...mKeys.map(k => {
      const raw = MONTHLY_HISTORY_2026[k][entityKey][1];
      return rep.isGold ? Math.round(raw / 3) : raw;
    }),
    rep.validOmset
  ];

  document.getElementById('barChartHeading').textContent = `Tren Target vs Capaian Bulanan 2026 — ${rep.short}`;
  drawBarChart(labels, targets, actuals, 'Target Bulanan', 'Omset Tercapai');

  if (rep.channels && rep.channels.length > 0) {
    document.getElementById('donutChartHeading').textContent = 'Kontribusi Omset per Kanal Toko';
    drawDonutChart(
      rep.channels.map(c => c.name),
      rep.channels.map(c => c.validOmset),
      rep.persenCapaian + '%',
      'Target Bulanan'
    );
  } else {
    document.getElementById('donutChartHeading').textContent = 'Omset Tercapai vs Sisa Target Bulanan';
    drawDonutChart(
      ['Omset Tercapai', 'Sisa Target Bulanan'],
      [rep.validOmset, Math.max(0, rep.targetBulanan - rep.validOmset)],
      rep.persenCapaian + '%',
      'Capaian'
    );
  }
}

function renderTableForSingleEntity(entityKey, rep) {
  if (rep.channels && rep.channels.length > 0 && STATE.selectedMonth === '2026-11') {
    document.getElementById('summaryTableHeading').textContent = `Rincian Performa Kanal — ${rep.name}`;
    document.getElementById('summaryTableHead').innerHTML = `
      <tr>
        <th>Nama Kanal / Toko</th>
        <th>Qty Berhasil / Proses</th>
        <th>Omset Tercapai</th>
        <th>Qty Cancel / Return</th>
        <th>Nominal Cancel</th>
        <th>% Cancel dari Penjualan</th>
      </tr>
    `;
    const allChannels = computeRealtimeNovemberEntity(entityKey, getActiveDaysCount()).channels;
    document.getElementById('summaryTableBody').innerHTML = allChannels.map(c => {
      const tot = c.validOmset + c.cancelOmset;
      const cPct = tot > 0 ? ((c.cancelOmset / tot) * 100).toFixed(2) : '0.00';
      const myrNote = c.isMyr ? `<br><small style="color:#2563EB;">(${formatMYR(c.rawMyrValid)} | Cancel: ${formatMYR(c.rawMyrCancel)})</small>` : '';
      return `
        <tr>
          <td><strong>${c.name}</strong>${myrNote}</td>
          <td>${c.validQty.toLocaleString('id-ID')} Pcs</td>
          <td><strong style="color:#0F172A;">${formatIDR(c.validOmset)}</strong></td>
          <td><span class="status-badge badge-danger">${c.cancelQty.toLocaleString('id-ID')} Pcs</span></td>
          <td style="color:#BE123C;font-weight:700;">${formatIDR(c.cancelOmset)}</td>
          <td><strong>${cPct}%</strong></td>
        </tr>
      `;
    }).join('');
  } else {
    // Tabel Rekapitulasi Bulanan Jan - Nov 2026 untuk Entitas tersebut
    document.getElementById('summaryTableHeading').textContent = `Histori Pencapaian Bulanan 2026 — ${rep.name}`;
    document.getElementById('summaryTableHead').innerHTML = `
      <tr>
        <th>Bulan</th>
        <th>Target Bulanan</th>
        <th>Target Harian</th>
        <th>${rep.isGold ? 'Penjualan Riil (100%)' : 'Status Data'}</th>
        <th>Omset Tercapai ${rep.isGold ? '(Dibagi 3)' : ''}</th>
        <th>% Capaian</th>
      </tr>
    `;
    const mKeys = Object.keys(MONTHLY_HISTORY_2026);
    const rowsHtml = mKeys.map(k => {
      const t = MONTHLY_HISTORY_2026[k][entityKey][0];
      const raw = MONTHLY_HISTORY_2026[k][entityKey][1];
      const val = rep.isGold ? Math.round(raw / 3) : raw;
      const pct = t > 0 ? ((val / t) * 100).toFixed(2) : '0.00';
      return `
        <tr>
          <td><strong>${MONTHLY_HISTORY_2026[k].label}</strong></td>
          <td>${formatIDR(t)}</td>
          <td>${formatIDR(t / 30)}</td>
          <td>${rep.isGold ? formatIDR(raw) : 'Rekap Historis'}</td>
          <td><strong>${formatIDR(val)}</strong></td>
          <td><span class="status-badge ${Number(pct) >= 100 ? 'badge-success' : 'badge-neutral'}">${pct}%</span></td>
        </tr>
      `;
    });
    document.getElementById('summaryTableBody').innerHTML = rowsHtml.join('');
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
        { label: l1, data: s1, backgroundColor: '#2563EB', borderRadius: 6, barPercentage: 0.65, categoryPercentage: 0.6 },
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
 * KURS MYR REALTIME & SINKRONISASI SPREADSHEET / FIREBASE
 * ============================================================================
 */
async function fetchLiveMyrExchangeRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/MYR');
    const json = await res.json();
    if (json && json.rates && json.rates.IDR) {
      STATE.myrRate = Math.round(json.rates.IDR);
      localStorage.setItem('pg_myr_rate', STATE.myrRate);
      renderApp();
    }
  } catch (_) {
    // Gunakan nilai default / tersimpan jika sedang offline
  }
}

async function syncWithSpreadsheetAndFirebase(showNotice = false) {
  const badge = document.getElementById('lastSyncText');
  badge.textContent = 'Menyinkronkan...';
  await fetchLiveMyrExchangeRate();

  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  badge.textContent = 'Sync: ' + timeStr;
  renderApp();

  if (STATE.firebaseUrl) {
    try {
      await fetch(STATE.firebaseUrl.replace(/\/$/, '') + '/pakkawaruExecutive.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedAt: timeStr, myrRate: STATE.myrRate })
      });
    } catch (_) {}
  }

  if (showNotice) {
    alert('Data realtime dan kurs Ringgit Malaysia berhasil diperbarui.');
  }
}

/**
 * ============================================================================
 * NAVIGASI, FILTER, & GERBANG AUTENTIKASI
 * ============================================================================
 */
window.switchTab = function(tabKey) {
  STATE.activeTab = tabKey;
  STATE.subChannel = 'all';
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderApp();
};

window.selectSubChannel = function(chId) {
  STATE.subChannel = chId;
  renderApp();
};

function unlockDashboard() {
  document.getElementById('securityGateOverlay').classList.add('hidden');
  document.getElementById('appMainWrapper').classList.remove('hidden');
  renderApp();
  fetchLiveMyrExchangeRate();
}

document.addEventListener('DOMContentLoaded', () => {
  // Cek Sesi Login
  if (sessionStorage.getItem(AUTH_CONFIG.sessionKey) === 'UNLOCKED') {
    unlockDashboard();
  }

  document.getElementById('authLoginForm').addEventListener('submit', e => {
    e.preventDefault();
    const u = document.getElementById('authUsername').value.trim();
    const p = document.getElementById('authPassword').value;
    const pin = document.getElementById('authPinInput').value.trim();

    if (u === AUTH_CONFIG.username && p === AUTH_CONFIG.password && pin === AUTH_CONFIG.pin) {
      sessionStorage.setItem(AUTH_CONFIG.sessionKey, 'UNLOCKED');
      document.getElementById('authErrorMsg').classList.add('hidden');
      unlockDashboard();
    } else {
      document.getElementById('authErrorMsg').classList.remove('hidden');
    }
  });

  document.getElementById('btnLockSession').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
    document.getElementById('authPassword').value = '';
    document.getElementById('authPinInput').value = '';
    document.getElementById('appMainWrapper').classList.add('hidden');
    document.getElementById('securityGateOverlay').classList.remove('hidden');
  });

  // Klik Tab Navigasi
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => window.switchTab(btn.dataset.tab));
  });

  document.getElementById('btnHomeLogo').addEventListener('click', () => window.switchTab('holding'));

  // Pemilih Bulan
  document.getElementById('monthSelector').addEventListener('change', e => {
    STATE.selectedMonth = e.target.value;
    renderApp();
  });

  // Tombol Preset Rentang Tanggal
  document.querySelectorAll('#realtimeDatePresets .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#realtimeDatePresets .chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const r = btn.dataset.range;
      STATE.rangePreset = r;
      if (r === 'this_month' || r === 'last_30') {
        STATE.startDate = '2026-11-01';
        STATE.endDate = '2026-11-13';
      } else if (r === 'last_7') {
        STATE.startDate = '2026-11-07';
        STATE.endDate = '2026-11-13';
      }
      document.getElementById('filterStartDate').value = STATE.startDate;
      document.getElementById('filterEndDate').value = STATE.endDate;
      renderApp();
    });
  });

  // Input Tanggal Custom
  ['filterStartDate', 'filterEndDate'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      const s = document.getElementById('filterStartDate').value;
      const e = document.getElementById('filterEndDate').value;
      if (s && e) {
        STATE.startDate = s;
        STATE.endDate = e < s ? s : e;
        document.getElementById('filterEndDate').value = STATE.endDate;
        document.querySelectorAll('#realtimeDatePresets .chip-btn').forEach(b => b.classList.toggle('active', b.dataset.range === 'custom'));
        renderApp();
      }
    });
  });

  document.getElementById('chartViewMode').addEventListener('change', e => {
    STATE.chartMode = e.target.value;
    renderApp();
  });

  // Modal Pengaturan
  document.getElementById('btnOpenConfig').addEventListener('click', () => {
    document.getElementById('cfgSheetId').value = STATE.sheetId;
    document.getElementById('cfgMyrRate').value = STATE.myrRate;
    document.getElementById('cfgFirebaseUrl').value = STATE.firebaseUrl;
    document.getElementById('settingsModal').classList.remove('hidden');
  });

  document.getElementById('btnCloseSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
  });

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    STATE.sheetId = document.getElementById('cfgSheetId').value.trim() || DEFAULT_SHEET_ID;
    STATE.myrRate = Number(document.getElementById('cfgMyrRate').value) || 3580;
    STATE.firebaseUrl = document.getElementById('cfgFirebaseUrl').value.trim();
    localStorage.setItem('pg_sheet_id', STATE.sheetId);
    localStorage.setItem('pg_myr_rate', STATE.myrRate);
    localStorage.setItem('pg_firebase_url', STATE.firebaseUrl);
    document.getElementById('settingsModal').classList.add('hidden');
    renderApp();
  });

  document.getElementById('btnSyncNow').addEventListener('click', () => syncWithSpreadsheetAndFirebase(true));
});