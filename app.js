/**
 * ============================================================================
 * PAKKAWARU GROUP — EXECUTIVE FINANCIAL INTELLIGENCE ENGINE (app.js)
 * - Rekonsiliasi 100% Klop (Shopee/TikTok Batal Kolom B, Meta RTS/Return + Koma Dijumlah)
 * - Fitur Target Custom Tanggal & Persentase Progres dari Rentang Tanggal
 * - Login Berlapis: Username (pakkawaru) + Password (bismillahpakkawaru) + PIN (739482)
 * ============================================================================
 */

const AUTH_CONFIG = {
  username: 'pakkawaru',
  password: 'bismillahpakkawaru',
  pin: '739482',
  sessionKey: 'pakkawaru_exec_auth_v4'
};

const DEFAULT_SHEET_ID = '1CuPBkl1nq2tUuy2tTtRRLZWrptXRZGuDbFylCDFDZNk';

const STATE = {
  sheetId: localStorage.getItem('pg_sheet_id') || DEFAULT_SHEET_ID,
  myrRate: Number(localStorage.getItem('pg_myr_rate')) || 3580,
  firebaseUrl: localStorage.getItem('pg_firebase_url') || '',
  activeTab: 'holding',       // holding | safwan | ansan | amalqu | latihhobi | sjp | ppm
  subChannel: 'all',
  selectedMonth: '2026-11',
  rangePreset: 'this_month',
  startDate: '2026-11-01',
  endDate: '2026-11-13',
  chartMode: 'custom_target',
  barChart: null,
  donutChart: null
};

/**
 * 1. DATA MASTER ENTITAS PAKKAWARU GROUP
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
 * 2. DATA HISTORIS BULANAN (JANUARI - OKTOBER 2026)
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
 * 3. DATA HARIAN NOVEMBER 2026 HASIL REKONSILIASI 100% KLOP
 * Format: [validQty, validOmset, cancelQty, cancelOmset]
 */
const REALTIME_NOV_DAILY = {
  tiktokSafwan: {
    // Total: 3.965 Pcs | Omset: Rp622.687.341 | Cancel: 766 Pcs (Rp134.038.873)
    '2026-11-01': [348, 58756733, 63, 10551187],
    '2026-11-02': [374, 63332916, 91, 14219368],
    '2026-11-03': [388, 63420659, 113, 22007356],
    '2026-11-04': [329, 53535521, 71, 11343165],
    '2026-11-05': [309, 47874240, 75, 11627299],
    '2026-11-06': [375, 52359793, 65, 9984554],
    '2026-11-07': [249, 36835101, 25, 3717323],
    '2026-11-08': [407, 63631314, 69, 15244374],
    '2026-11-09': [426, 65911306, 57, 8706935],
    '2026-11-10': [350, 55076249, 92, 19722086],
    '2026-11-11': [410, 61953509, 45, 6915226]
  },
  shopeeSafwan: {
    // Total: 1.507 Pcs | Omset: Rp239.414.500 | Cancel: 239 Pcs (Rp37.993.533)
    '2026-11-01': [103, 17387599, 20, 3322100],
    '2026-11-02': [93, 15282294, 16, 2527599],
    '2026-11-03': [109, 17686868, 24, 3939365],
    '2026-11-04': [118, 18929895, 16, 2411499],
    '2026-11-05': [113, 18168704, 12, 1928532],
    '2026-11-06': [120, 19249940, 11, 1772790],
    '2026-11-07': [114, 18595346, 18, 2808702],
    '2026-11-08': [125, 20047004, 24, 4168773],
    '2026-11-09': [115, 17779353, 13, 2300192],
    '2026-11-10': [88, 14436688, 16, 2504241],
    '2026-11-11': [409, 61850809, 69, 10309740]
  },
  shopeeMalaysia: {
    // Total: 31 Pcs | Omset: RM 2.952,55 | Cancel: 13 Pcs (RM 1.308,16)
    '2026-11-01': [5, 468.55, 0, 0.0],
    '2026-11-02': [1, 118.0, 0, 0.0],
    '2026-11-03': [3, 297.26, 0, 0.0],
    '2026-11-04': [3, 229.07, 1, 84.19],
    '2026-11-05': [2, 168.41, 1, 60.48],
    '2026-11-06': [3, 279.51, 1, 107.93],
    '2026-11-07': [5, 479.93, 2, 215.86],
    '2026-11-08': [2, 193.72, 2, 215.86],
    '2026-11-09': [2, 215.86, 1, 84.19],
    '2026-11-10': [3, 310.12, 4, 431.72],
    '2026-11-11': [2, 192.12, 1, 107.93]
  },
  tiktokAnsan: {
    // Total: 2.825 Pcs | Omset: Rp387.564.316 | Cancel: 488 Pcs (Rp68.761.818)
    '2026-11-01': [225, 32074700, 43, 6888299],
    '2026-11-02': [306, 40852552, 59, 7764651],
    '2026-11-03': [337, 45012165, 69, 9617314],
    '2026-11-04': [296, 41638357, 85, 11499395],
    '2026-11-05': [276, 39912646, 41, 5666581],
    '2026-11-06': [302, 40244202, 57, 7514228],
    '2026-11-07': [145, 21733324, 18, 2794752],
    '2026-11-08': [283, 38125530, 22, 3162940],
    '2026-11-09': [251, 32194068, 27, 3557483],
    '2026-11-10': [204, 26756500, 41, 6279895],
    '2026-11-11': [200, 29020272, 26, 4016280]
  },
  shopeeAnsan: {
    // Total: 1.071 Pcs | Omset: Rp154.098.749 | Cancel: 134 Pcs (Rp19.978.621)
    '2026-11-01': [82, 11586445, 13, 1992339],
    '2026-11-02': [112, 16377095, 12, 1743753],
    '2026-11-03': [103, 14784106, 17, 2738068],
    '2026-11-04': [94, 13808246, 13, 1901748],
    '2026-11-05': [75, 10487289, 14, 1792373],
    '2026-11-06': [85, 11973242, 4, 562952],
    '2026-11-07': [81, 11955282, 4, 654244],
    '2026-11-08': [67, 9262761, 12, 1600670],
    '2026-11-09': [109, 15590865, 13, 1977415],
    '2026-11-10': [88, 12858793, 14, 2280388],
    '2026-11-11': [175, 25414625, 18, 2734671]
  },
  shopeeBasyirah: {
    // Total: 352 Pcs | Omset: Rp45.979.092 | Cancel: 101 Pcs (Rp16.836.037)
    '2026-11-01': [31, 4510551, 5, 843923],
    '2026-11-02': [79, 5391423, 1, 190395],
    '2026-11-03': [19, 2911135, 6, 816854],
    '2026-11-04': [27, 3700061, 10, 1501563],
    '2026-11-05': [29, 3694719, 22, 3871326],
    '2026-11-06': [24, 3720806, 2, 292345],
    '2026-11-07': [14, 1981570, 5, 746322],
    '2026-11-08': [21, 3350630, 21, 3820030],
    '2026-11-09': [27, 4248398, 4, 684516],
    '2026-11-10': [38, 5999465, 17, 2757957],
    '2026-11-11': [43, 6470334, 8, 1310806]
  },
  metaBqy: {
    // Total: 14 Pcs | Omset: Rp1.386.000 | Cancel: 0 Pcs (Rp0)
    '2026-11-02': [2, 198000, 0, 0],
    '2026-11-03': [3, 297000, 0, 0],
    '2026-11-05': [5, 495000, 0, 0],
    '2026-11-10': [4, 396000, 0, 0]
  },
  metaLp: {
    // Total: 1.762 Pcs | Omset: Rp192.428.000 (Sudah termasuk +Rp4.351.000 dari 17 sel berkoma) | Cancel (RTS/Return): 24 Pcs (Rp2.726.000)
    '2026-11-02': [283, 31027000, 12, 1398000],
    '2026-11-03': [208, 22902000, 7, 763000],
    '2026-11-04': [210, 22610000, 2, 198000],
    '2026-11-05': [188, 20712000, 2, 198000],
    '2026-11-06': [166, 18044000, 1, 169000],
    '2026-11-07': [80, 8760000, 0, 0],
    '2026-11-09': [205, 22045000, 0, 0],
    '2026-11-10': [275, 29885000, 0, 0],
    '2026-11-11': [147, 16443000, 0, 0]
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
  sjp: {
    // Penjualan Riil SJP (Akan dibagi 3 otomatis oleh mesin)
    '2026-11-01': [1, 194898000, 0, 0],
    '2026-11-03': [1, 202090000, 0, 0],
    '2026-11-06': [1, 287870000, 0, 0],
    '2026-11-07': [1, 446486000, 0, 0],
    '2026-11-10': [2, 640211000, 0, 0]
  },
  ppm: {
    // Penjualan Riil PPM (Akan dibagi 3 otomatis oleh mesin)
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
 * FORMATTER & HELPER TANGGAL
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

function formatReadableRange() {
  if (STATE.selectedMonth === '2026-ALL') return 'Akumulasi Tahun 2026';
  if (STATE.selectedMonth !== '2026-11') return MONTHLY_HISTORY_2026[STATE.selectedMonth].label;
  const sDay = Number(STATE.startDate.slice(8, 10));
  const eDay = Number(STATE.endDate.slice(8, 10));
  return `${sDay} Nov s/d ${eDay} Nov 2026 (${getActiveDaysCount()} Hari)`;
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
 * Menghitung Metrik Lengkap per Entitas
 */
function computeEntityReport(entityKey) {
  const meta = ENTITY_META[entityKey];
  const days = getActiveDaysCount();

  if (STATE.selectedMonth !== '2026-11') {
    let targetBulanan = 0, rawOmset = 0;
    if (STATE.selectedMonth === '2026-ALL') {
      Object.values(MONTHLY_HISTORY_2026).forEach(m => {
        targetBulanan += m[entityKey][0];
        rawOmset += m[entityKey][1];
      });
      const novRep = computeRealtimeNovemberEntity(entityKey, 13);
      targetBulanan += meta.targetBulanan;
      rawOmset += meta.isGold ? novRep.rawBeforeDiv3 : novRep.validOmset;
    } else {
      const mData = MONTHLY_HISTORY_2026[STATE.selectedMonth];
      targetBulanan = mData[entityKey][0];
      rawOmset = mData[entityKey][1];
    }

    const omsetTercapai = meta.isGold ? Math.round(rawOmset / 3) : rawOmset;
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

function computeRealtimeNovemberEntity(entityKey, days = 13) {
  const meta = ENTITY_META[entityKey];
  const targetBulanan = meta.targetBulanan;
  const targetHarian = meta.targetHarian;
  const targetCustomTanggal = Math.round(targetHarian * days);

  let validQty = 0, validOmset = 0, cancelQty = 0, cancelOmset = 0, rawBeforeDiv3 = 0;
  let channels = [];

  if (entityKey === 'safwan') {
    const ttId = sumSeries(REALTIME_NOV_DAILY.tiktokSafwan, false);
    const shId = sumSeries(REALTIME_NOV_DAILY.shopeeSafwan, false);
    const shMy = sumSeries(REALTIME_NOV_DAILY.shopeeMalaysia, true);

    channels = [
      { id: 'tiktokSafwan', name: 'Tiktok Safwan', ...ttId },
      { id: 'shopeeSafwan', name: 'Shopee Safwan', ...shId },
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
    });
  } else if (entityKey === 'ansan') {
    const ttAn = sumSeries(REALTIME_NOV_DAILY.tiktokAnsan, false);
    const mtLp = sumSeries(REALTIME_NOV_DAILY.metaLp, false);
    const shAn = sumSeries(REALTIME_NOV_DAILY.shopeeAnsan, false);
    const shBs = sumSeries(REALTIME_NOV_DAILY.shopeeBasyirah, false);
    const mtBq = sumSeries(REALTIME_NOV_DAILY.metaBqy, false);

    channels = [
      { id: 'tiktokAnsan', name: 'Tiktok Ansan', ...ttAn },
      { id: 'metaLp', name: 'Meta Pakkawaru Ansan (LP)', ...mtLp },
      { id: 'shopeeAnsan', name: 'Shopee Ansan', ...shAn },
      { id: 'shopeeBasyirah', name: 'Shopee Basyirah Ansan', ...shBs },
      { id: 'metaBqy', name: 'Meta BQY Ansan', ...mtBq }
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
    validOmset = Math.round(rawBeforeDiv3 / 3);
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
 * RENDERER BANNER "PROGRES TARGET CUSTOM TANGGAL" (MUDAH DIPAHAMI)
 * ============================================================================
 */
function renderCustomTargetBanner(titleContext, targetCustom, omsetActual, targetHarian, days) {
  const pct = targetCustom > 0 ? Number(((omsetActual / targetCustom) * 100).toFixed(2)) : 0;
  const selisih = omsetActual - targetCustom;
  const isAchieved = selisih >= 0;
  const barWidth = Math.max(3, Math.min(100, pct));
  const barColor = isAchieved ? '#10B981' : '#2563EB';

  document.getElementById('customDateTargetPanel').innerHTML = `
    <div class="ct-header">
      <div class="ct-title-box">
        <h3>Target & Progres Custom Tanggal: ${formatReadableRange()}</h3>
        <p>Mengukur apakah omset <strong>${titleContext}</strong> sudah mencapai target pada rentang <strong>${days} hari</strong> yang dipilih</p>
      </div>
      <span class="ct-status-pill ${isAchieved ? 'badge-success' : 'badge-warning'}">
        ${isAchieved ? 'TARGET TANGGAL INI TERCAPAI' : 'BELUM MENCAPAI TARGET TANGGAL INI'}
      </span>
    </div>

    <div class="ct-metrics-grid">
      <div class="ct-metric-box">
        <small>1. Target Custom Tanggal (${days} Hari)</small>
        <strong style="color:#4F46E5;">${formatIDR(targetCustom)}</strong>
        <span>Rumus: ${formatIDR(targetHarian)} × ${days} hari</span>
      </div>

      <div class="ct-metric-box">
        <small>2. Omset Tercapai di Tanggal Ini</small>
        <strong style="color:#047857;">${formatIDR(omsetActual)}</strong>
        <span>Rata-rata: ${formatIDR(omsetActual / days)} / hari</span>
      </div>

      <div class="ct-metric-box">
        <small>3. Persentase Progres Tanggal Ini</small>
        <strong style="color:${isAchieved ? '#047857' : '#2563EB'};">${pct}%</strong>
        <span>Dari target ${days} hari yang ditentukan</span>
      </div>

      <div class="ct-metric-box">
        <small>4. Selisih / Kekurangan Target</small>
        <strong style="color:${isAchieved ? '#047857' : '#BE123C'};">${isAchieved ? '+' + formatIDR(selisih) : formatIDR(selisih)}</strong>
        <span>${isAchieved ? 'Surplus melampaui target tanggal ini' : 'Nominal yang perlu dikejar di periode ini'}</span>
      </div>
    </div>

    <div class="ct-progress-wrap">
      <div class="ct-progress-labels">
        <span>Progres Pencapaian Target Tanggal (${formatReadableRange()})</span>
        <strong>${pct}% Tercapai (${formatIDR(omsetActual)} dari ${formatIDR(targetCustom)})</strong>
      </div>
      <div class="ct-progress-bar">
        <div class="ct-progress-fill" style="width:${barWidth}%;background:${barColor};"></div>
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
  const isRealtimeNov = STATE.selectedMonth === '2026-11';

  document.getElementById('realtimeDatePresets').classList.toggle('hidden', !isRealtimeNov);
  document.getElementById('customDateWrap').classList.toggle('hidden', !isRealtimeNov);
  document.getElementById('fxRateText').textContent = `Kurs: 1 MYR = ${formatIDR(STATE.myrRate)}`;

  if (STATE.activeTab === 'holding') {
    renderHoldingView(days);
  } else {
    renderSingleEntityView(STATE.activeTab, days);
  }
}

/**
 * A. TAMPILAN KESELURUHAN PAKKAWARU GROUP
 */
function renderHoldingView(days) {
  const keys = ['safwan', 'ansan', 'amalqu', 'latihhobi', 'sjp', 'ppm'];
  const reports = keys.map(k => computeEntityReport(k));

  const totTargetBulan = reports.reduce((a, b) => a + b.targetBulanan, 0);
  const totTargetHari = reports.reduce((a, b) => a + b.targetHarian, 0);
  const totTargetCustom = reports.reduce((a, b) => a + b.targetCustomTanggal, 0);
  const totOmset = reports.reduce((a, b) => a + b.validOmset, 0);
  const totEstimasi = reports.reduce((a, b) => a + b.estimasiBulan, 0);
  const totValidQty = reports.reduce((a, b) => a + b.validQty, 0);
  const totCancelQty = reports.reduce((a, b) => a + b.cancelQty, 0);
  const totCancelOmset = reports.reduce((a, b) => a + b.cancelOmset, 0);

  const pctBulan = totTargetBulan > 0 ? ((totOmset / totTargetBulan) * 100).toFixed(2) : '0.00';
  const pctCustom = totTargetCustom > 0 ? ((totOmset / totTargetCustom) * 100).toFixed(2) : '0.00';
  const pctEstimasi = totTargetBulan > 0 ? ((totEstimasi / totTargetBulan) * 100).toFixed(2) : '0.00';
  const pctCancel = (totOmset + totCancelOmset) > 0 ? ((totCancelOmset / (totOmset + totCancelOmset)) * 100).toFixed(2) : '0.00';

  document.getElementById('viewBadgeTag').textContent = 'KESELURUHAN PAKKAWARU GROUP • 6 ENTITAS';
  document.getElementById('viewTitleHeading').textContent = 'Ringkasan Eksekutif Pakkawaru Group';
  document.getElementById('viewSubtitleDesc').textContent = 'Target Bulanan, Target Harian, Omset Tercapai, Proyeksi Akhir Bulan & Capaian Daerah Bandung – Gorontalo';

  document.getElementById('channelSubPills').classList.add('hidden');
  document.getElementById('malaysiaFxBanner').classList.add('hidden');
  document.getElementById('regionalCompareSection').classList.remove('hidden');

  // 1. Render Panel Target Custom Tanggal
  renderCustomTargetBanner('Keseluruhan Pakkawaru Group', totTargetCustom, totOmset, totTargetHari, days);

  // 2. Render 6 Kartu Indikator Utama
  renderSixCards([
    { title: 'Target Bulanan (30 Hari)', badge: '6 Entitas', value: formatIDR(totTargetBulan), subLeft: `Target ${days} Hari Ini:`, subRight: formatCompact(totTargetCustom), pct: 100, tone: 'tone-indigo' },
    { title: 'Target Harian', badge: 'Patokan Harian', value: formatIDR(totTargetHari), subLeft: 'Rata-rata Omset/Hari:', subRight: formatCompact(totOmset / days), pct: Math.min(100, Number(pctCustom)), tone: 'tone-blue' },
    { title: 'Omset Tercapai', badge: `${pctBulan}% dari Bulan`, value: formatIDR(totOmset), subLeft: `Progres Target ${days} Hari:`, subRight: `${pctCustom}%`, pct: Math.min(100, Number(pctBulan)), tone: 'tone-emerald' },
    { title: 'Estimasi Akhir Bulan', badge: `${pctEstimasi}% Target`, value: formatIDR(totEstimasi), subLeft: 'Dilihat dari tren saat ini:', subRight: Number(pctEstimasi) >= 100 ? 'Tercapai' : 'On Progress', pct: Math.min(100, Number(pctEstimasi)), tone: 'tone-purple' },
    { title: 'Qty Berhasil / Proses', badge: 'Toko & Meta', value: `${totValidQty.toLocaleString('id-ID')} Pcs`, subLeft: 'Persentase Pesanan Valid:', subRight: `${(100 - Number(pctCancel)).toFixed(1)}%`, pct: 100 - Number(pctCancel), tone: 'tone-amber' },
    { title: 'Qty Cancel / Return', badge: `${pctCancel}% Penjualan`, value: `${totCancelQty.toLocaleString('id-ID')} Pcs`, subLeft: 'Nominal Batal/RTS:', subRight: formatIDR(totCancelOmset), pct: Math.min(100, Number(pctCancel)), tone: 'tone-rose' }
  ]);

  // 3. Render Pencapaian Per Daerah: Bandung vs Gorontalo
  const bandungList = reports.filter(r => r.region === 'Bandung');
  const gorontaloList = reports.filter(r => r.region === 'Gorontalo');

  const bdgTargetBulan = bandungList.reduce((a, b) => a + b.targetBulanan, 0);
  const bdgTargetCustom = bandungList.reduce((a, b) => a + b.targetCustomTanggal, 0);
  const bdgOmset = bandungList.reduce((a, b) => a + b.validOmset, 0);
  const bdgEst = bandungList.reduce((a, b) => a + b.estimasiBulan, 0);
  const bdgPctCustom = bdgTargetCustom > 0 ? ((bdgOmset / bdgTargetCustom) * 100).toFixed(2) : '0.00';
  const bdgPctBulan = bdgTargetBulan > 0 ? ((bdgOmset / bdgTargetBulan) * 100).toFixed(2) : '0.00';

  const gtoTargetBulan = gorontaloList.reduce((a, b) => a + b.targetBulanan, 0);
  const gtoTargetCustom = gorontaloList.reduce((a, b) => a + b.targetCustomTanggal, 0);
  const gtoOmset = gorontaloList.reduce((a, b) => a + b.validOmset, 0);
  const gtoRaw = gorontaloList.reduce((a, b) => a + b.rawBeforeDiv3, 0);
  const gtoEst = gorontaloList.reduce((a, b) => a + b.estimasiBulan, 0);
  const gtoPctCustom = gtoTargetCustom > 0 ? ((gtoOmset / gtoTargetCustom) * 100).toFixed(2) : '0.00';
  const gtoPctBulan = gtoTargetBulan > 0 ? ((gtoOmset / gtoTargetBulan) * 100).toFixed(2) : '0.00';

  document.getElementById('regionalCompareSection').innerHTML = `
    <div class="reg-card">
      <div class="reg-head">
        <div>
          <h3>Pencapaian Daerah Bandung (4 Entitas)</h3>
          <p>PT Safwan Berkah, PT BQY Ansan, Yayasan Amalqu, Latih Hobi</p>
        </div>
        <span class="status-badge ${Number(bdgPctCustom) >= 100 ? 'badge-success' : 'badge-neutral'}">${bdgPctCustom}% dari Target ${days} Hr</span>
      </div>
      <div class="reg-metrics">
        <div><small>Target ${days} Hari</small><strong>${formatCompact(bdgTargetCustom)}</strong></div>
        <div><small>Omset Tercapai</small><strong>${formatIDR(bdgOmset)}</strong></div>
        <div><small>Estimasi Akhir Bulan</small><strong>${formatCompact(bdgEst)}</strong></div>
      </div>
      <div class="kpi-sub"><span>Target Bulanan Penuh: ${formatIDR(bdgTargetBulan)}</span><strong>${bdgPctBulan}% dari Target Bulanan</strong></div>
    </div>

    <div class="reg-card">
      <div class="reg-head">
        <div>
          <h3>Pencapaian Daerah Gorontalo (2 Entitas Emas ÷ 3)</h3>
          <p>CV Selamat Jaya Pakkawaru (SJP) & Pakkawaru Permata Mulia (PPM)</p>
        </div>
        <span class="status-badge ${Number(gtoPctCustom) >= 100 ? 'badge-success' : 'badge-warning'}">${gtoPctCustom}% dari Target ${days} Hr</span>
      </div>
      <div class="reg-metrics">
        <div><small>Target ${days} Hari</small><strong>${formatCompact(gtoTargetCustom)}</strong></div>
        <div><small>Omset Diakui (÷ 3)</small><strong>${formatIDR(gtoOmset)}</strong></div>
        <div><small>Estimasi Akhir Bulan</small><strong>${formatCompact(gtoEst)}</strong></div>
      </div>
      <div class="kpi-sub"><span>Penjualan Riil (100%): ${formatIDR(gtoRaw)} • Target Bulanan: ${formatCompact(gtoTargetBulan)}</span><strong>${gtoPctBulan}% Bulanan</strong></div>
    </div>
  `;

  // 4. Render Grafik & Tabel
  renderChartsForHolding(reports, pctCustom, days);

  document.getElementById('summaryTableHeading').textContent = `Tabel Capaian 6 Entitas (${formatReadableRange()})`;
  document.getElementById('summaryTableHead').innerHTML = `
    <tr>
      <th>Entitas Bisnis</th>
      <th>Target Bulanan</th>
      <th>Target ${days} Hari (Custom)</th>
      <th>Omset Tercapai</th>
      <th>% Progres (${days} Hr)</th>
      <th>Qty Berhasil / Proses</th>
      <th>Qty Cancel (Pcs, Rp & %)</th>
      <th>Estimasi Akhir Bulan</th>
      <th>Detail</th>
    </tr>
  `;

  document.getElementById('summaryTableBody').innerHTML = reports.map(r => `
    <tr>
      <td>
        <strong style="color:#0F172A;display:block;">${r.name}</strong>
        <small style="color:#64748B;">Daerah ${r.region} ${r.isGold ? '• Penjualan Riil: ' + formatIDR(r.rawBeforeDiv3) : ''}</small>
      </td>
      <td>${formatIDR(r.targetBulanan)}</td>
      <td><strong style="color:#4F46E5;">${formatIDR(r.targetCustomTanggal)}</strong></td>
      <td><strong style="color:#047857;">${formatIDR(r.validOmset)}</strong></td>
      <td>
        <span class="status-badge ${r.persenCustomTanggal >= 100 ? 'badge-success' : 'badge-warning'}">${r.persenCustomTanggal}%</span>
        <small style="display:block;color:#64748B;margin-top:2px;">${r.persenBulanan}% Bulan</small>
      </td>
      <td>${r.hasQty ? r.validQty.toLocaleString('id-ID') + ' Pcs' : '-'}</td>
      <td>${r.hasQty ? `<span style="color:#BE123C;font-weight:700;">${r.cancelQty.toLocaleString('id-ID')} Pcs</span><br><small>${formatIDR(r.cancelOmset)} (${r.cancelRatePct}%)</small>` : '-'}</td>
      <td>
        <strong>${formatIDR(r.estimasiBulan)}</strong>
        <small style="display:block;color:#64748B;">(${r.estimasiPct}% Target)</small>
      </td>
      <td><button class="btn-table-jump" onclick="switchTab('${r.key}')">Lihat Rincian</button></td>
    </tr>
  `).join('');
}

/**
 * B. TAMPILAN MASING-MASING ENTITAS
 */
function renderSingleEntityView(entityKey, days) {
  const rep = computeEntityReport(entityKey);

  document.getElementById('viewBadgeTag').textContent = `DAERAH ${rep.region.toUpperCase()} • ${rep.isGold ? 'OMSET PENJUALAN DIBAGI 3' : 'LAPORAN ENTITAS'}`;
  document.getElementById('viewTitleHeading').textContent = rep.name;
  document.getElementById('viewSubtitleDesc').textContent = `Target Bulanan: ${formatIDR(rep.targetBulanan)} • Target Harian: ${formatIDR(rep.targetHarian)}`;

  document.getElementById('regionalCompareSection').classList.add('hidden');

  // Render Panel Progres Target Custom Tanggal untuk Entitas Ini
  renderCustomTargetBanner(rep.name, rep.targetCustomTanggal, rep.validOmset, rep.targetHarian, days);

  // Tampilkan Pilihan Sub-Toko untuk PT Safwan & PT BQY Ansan
  const subPillsEl = document.getElementById('channelSubPills');
  if ((entityKey === 'safwan' || entityKey === 'ansan') && STATE.selectedMonth === '2026-11') {
    subPillsEl.classList.remove('hidden');
    const allChannels = computeRealtimeNovemberEntity(entityKey, days).channels;
    const pillItems = [{ id: 'all', name: 'Semua Akun / Toko' }, ...allChannels];
    subPillsEl.innerHTML = pillItems.map(p => `
      <button class="sub-pill ${STATE.subChannel === p.id ? 'active' : ''}" onclick="selectSubChannel('${p.id}')">${p.name}</button>
    `).join('');
  } else {
    subPillsEl.classList.add('hidden');
  }

  // Banner Konversi Ringgit ke Rupiah Khusus Shopee Malaysia di Tab Safwan
  const fxBanner = document.getElementById('malaysiaFxBanner');
  if (entityKey === 'safwan' && STATE.selectedMonth === '2026-11') {
    const myStats = sumSeries(REALTIME_NOV_DAILY.shopeeMalaysia, true);
    const totalMyr = myStats.rawMyrValid + myStats.rawMyrCancel;
    const myCancelPct = totalMyr > 0 ? ((myStats.rawMyrCancel / totalMyr) * 100).toFixed(2) : '0.00';
    fxBanner.classList.remove('hidden');
    fxBanner.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="font-size:15px;">Data Khusus Shopee Malaysia Safwan (Ringgit MYR & Konversi Rupiah)</strong>
          <p style="font-size:12px;color:#94A3B8;">Dikonversi otomatis dengan kurs realtime 1 MYR = ${formatIDR(STATE.myrRate)}</p>
        </div>
        <span class="status-badge badge-neutral">Digabung ke PT Safwan Berkah</span>
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
          <span>Hasil Konversi Kurs Aktif</span>
        </div>
        <div class="fx-item">
          <small>Data Cancel (Ringgit)</small>
          <strong>${formatMYR(myStats.rawMyrCancel)}</strong>
          <span style="color:#FDA4AF;">Qty Cancel: ${myStats.cancelQty} Pcs (${myCancelPct}%)</span>
        </div>
        <div class="fx-item">
          <small>Data Cancel (Rupiah)</small>
          <strong>${formatIDR(myStats.cancelOmset)}</strong>
          <span style="color:#FDA4AF;">Tidak Dimasukkan ke Omset</span>
        </div>
      </div>
    `;
  } else {
    fxBanner.classList.add('hidden');
  }

  // Render 6 Kartu Indikator Wajib Entitas
  renderSixCards([
    { title: 'Target Bulanan', badge: rep.short, value: formatIDR(rep.targetBulanan), subLeft: `Target ${days} Hari Ini:`, subRight: formatIDR(rep.targetCustomTanggal), pct: 100, tone: 'tone-indigo' },
    { title: 'Target Harian', badge: 'Per Hari', value: formatIDR(rep.targetHarian), subLeft: 'Rata-rata Omset/Hari:', subRight: formatIDR(rep.validOmset / days), pct: Math.min(100, rep.persenCustomTanggal), tone: 'tone-blue' },
    { title: 'Omset Tercapai', badge: `${rep.persenBulanan}% Bulan`, value: formatIDR(rep.validOmset), subLeft: rep.isGold ? 'Penjualan Riil (100%):' : `Progres Target ${days} Hari:`, subRight: rep.isGold ? formatCompact(rep.rawBeforeDiv3) : `${rep.persenCustomTanggal}%`, pct: Math.min(100, rep.persenBulanan), tone: 'tone-emerald' },
    { title: 'Estimasi Akhir Bulan', badge: `${rep.estimasiPct}% Target`, value: formatIDR(rep.estimasiBulan), subLeft: 'Dilihat dari tren saat ini:', subRight: rep.estimasiPct >= 100 ? 'Tercapai' : 'Perlu Digenjot', pct: Math.min(100, rep.estimasiPct), tone: 'tone-purple' },
    { title: 'Qty Berhasil / Proses', badge: rep.hasQty ? 'Pesanan Valid' : 'Hari / Batch Aktif', value: rep.hasQty ? `${rep.validQty.toLocaleString('id-ID')} Pcs` : `${rep.validQty} Transaksi`, subLeft: 'Persentase Berhasil:', subRight: `${(100 - rep.cancelRatePct).toFixed(1)}%`, pct: 100 - rep.cancelRatePct, tone: 'tone-amber' },
    { title: 'Qty Cancel / Return', badge: `${rep.cancelRatePct}% Penjualan`, value: `${rep.cancelQty.toLocaleString('id-ID')} Pcs`, subLeft: 'Nominal Cancel:', subRight: formatIDR(rep.cancelOmset), pct: Math.min(100, rep.cancelRatePct), tone: 'tone-rose' }
  ]);

  renderChartsForSingleEntity(entityKey, rep, days);
  renderTableForSingleEntity(entityKey, rep, days);
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
 * VISUALISASI GRAFIK & TABEL RINCIAN AKUN
 * ============================================================================
 */
function renderChartsForHolding(reports, pctCustom, days) {
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
      `Target ${days} Hari Ini`,
      'Omset Tercapai'
    );
  }

  drawDonutChart(
    reports.map(r => r.short),
    reports.map(r => r.validOmset),
    pctCustom + '%',
    `Progres ${days} Hr`
  );
}

function renderChartsForSingleEntity(entityKey, rep, days) {
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

  document.getElementById('barChartHeading').textContent = `Tren Bulanan 2026 — ${rep.short}`;
  drawBarChart(labels, targets, actuals, 'Target Bulanan', 'Omset Tercapai');

  if (rep.channels && rep.channels.length > 0) {
    document.getElementById('donutChartHeading').textContent = 'Porsi Omset per Akun / Toko';
    drawDonutChart(
      rep.channels.map(c => c.name),
      rep.channels.map(c => c.validOmset),
      rep.persenCustomTanggal + '%',
      `Progres ${days} Hr`
    );
  } else {
    document.getElementById('donutChartHeading').textContent = `Progres Target ${days} Hari Ini`;
    drawDonutChart(
      ['Omset Tercapai', `Sisa Target ${days} Hari`],
      [rep.validOmset, Math.max(0, rep.targetCustomTanggal - rep.validOmset)],
      rep.persenCustomTanggal + '%',
      `Progres ${days} Hr`
    );
  }
}

function renderTableForSingleEntity(entityKey, rep, days) {
  if (rep.channels && rep.channels.length > 0 && STATE.selectedMonth === '2026-11') {
    document.getElementById('summaryTableHeading').textContent = `Rincian Performa per Akun / Toko — ${rep.name} (${formatReadableRange()})`;
    document.getElementById('summaryTableHead').innerHTML = `
      <tr>
        <th>Nama Akun / Toko</th>
        <th>Omset Tercapai</th>
        <th>Qty Berhasil / Proses</th>
        <th>Qty Cancel / RTS</th>
        <th>Nominal Cancel / RTS</th>
        <th>% Cancel dari Penjualan</th>
      </tr>
    `;
    const allChannels = computeRealtimeNovemberEntity(entityKey, days).channels;
    document.getElementById('summaryTableBody').innerHTML = allChannels.map(c => {
      const tot = c.validOmset + c.cancelOmset;
      const cPct = tot > 0 ? ((c.cancelOmset / tot) * 100).toFixed(2) : '0.00';
      const myrNote = c.isMyr ? `<br><small style="color:#2563EB;">Ringgit: ${formatMYR(c.rawMyrValid)} (Cancel: ${formatMYR(c.rawMyrCancel)})</small>` : '';
      return `
        <tr>
          <td><strong>${c.name}</strong>${myrNote}</td>
          <td><strong style="color:#047857;">${formatIDR(c.validOmset)}</strong></td>
          <td><strong>${c.validQty.toLocaleString('id-ID')} Pcs</strong></td>
          <td><span class="status-badge badge-danger">${c.cancelQty.toLocaleString('id-ID')} Pcs</span></td>
          <td style="color:#BE123C;font-weight:700;">${formatIDR(c.cancelOmset)}</td>
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
        <th>Omset Tercapai ${rep.isGold ? '(Dibagi 3)' : ''}</th>
        <th>% Capaian</th>
      </tr>
    `;
    const mKeys = Object.keys(MONTHLY_HISTORY_2026);
    document.getElementById('summaryTableBody').innerHTML = mKeys.map(k => {
      const t = MONTHLY_HISTORY_2026[k][entityKey][0];
      const raw = MONTHLY_HISTORY_2026[k][entityKey][1];
      const val = rep.isGold ? Math.round(raw / 3) : raw;
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
 * KURS MYR REALTIME & EVENT LISTENERS
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
  } catch (_) {}
}

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

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => window.switchTab(btn.dataset.tab));
  });

  document.getElementById('btnHomeLogo').addEventListener('click', () => window.switchTab('holding'));

  document.getElementById('monthSelector').addEventListener('change', e => {
    STATE.selectedMonth = e.target.value;
    renderApp();
  });

  document.querySelectorAll('#realtimeDatePresets .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#realtimeDatePresets .chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const r = btn.dataset.range;
      STATE.rangePreset = r;
      if (r === 'this_month') {
        STATE.startDate = '2026-11-01';
        STATE.endDate = '2026-11-13';
      } else if (r === '10_days') {
        STATE.startDate = '2026-11-01';
        STATE.endDate = '2026-11-10';
      } else if (r === 'last_7') {
        STATE.startDate = '2026-11-05';
        STATE.endDate = '2026-11-11';
      }
      document.getElementById('filterStartDate').value = STATE.startDate;
      document.getElementById('filterEndDate').value = STATE.endDate;
      renderApp();
    });
  });

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

  document.getElementById('btnSyncNow').addEventListener('click', async () => {
    await fetchLiveMyrExchangeRate();
    document.getElementById('lastSyncText').textContent = 'Sync: ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    renderApp();
  });
});