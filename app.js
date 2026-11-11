/**
 * ============================================================================
 * PAKKAWARU GROUP — EXECUTIVE BI & REALTIME FINANCIAL ENGINE (app.js)
 * Mendukung:
 * 1. Filter Rentang Tanggal (Dari Tanggal - Sampai Tanggal) di semua Tab
 * 2. Kalkulasi Target Per Tanggal (Target Harian x Jumlah Hari) + Status Achieve
 * 3. Pengakuan Omset Emas SJP & PPM Dibagi 3 (Penjualan ÷ 3) sesuai arahan klien
 * ============================================================================
 */

const DEFAULT_SHEET_ID = '1CuPBkl1nq2tUuy2tTtRRLZWrptXRZGuDbFylCDFDZNk';

const STATE = {
  sheetId: localStorage.getItem('pakkawaru_sheet_id') || DEFAULT_SHEET_ID,
  firebaseUrl: localStorage.getItem('pakkawaru_firebase_url') || '',
  activeTab: 'holding',           // holding | safwan | ansan | amalqu | latihhobi | sjp | ppm
  holdingArea: 'all',             // all | Bandung | Gorontalo
  holdingChartMode: 'period_vs_actual',
  safwanStore: 'all',
  ansanStore: 'all',
  startDate: '2026-11-01',
  endDate: '2026-11-10',
  divideGoldByThree: true,        // Default TRUE sesuai instruksi audio: Omset SJP & PPM dibagi 3
  searchQuery: '',
  tablePage: 1,
  pageSize: 10,
  barChart: null,
  donutChart: null,
  db: null
};

/**
 * DATABASE AWAL PRESISI DARI 11 SHEET PAKKAWARU GROUP (Dilengkapi Tanggal ISO YYYY-MM-DD)
 */
function createInitialDatabase() {
  return {
    metadata: {
      company: 'Pakkawaru Group',
      lastUpdated: '10 Nov 2026, 18:16 WIB'
    },
    // Master Target Bulanan & Harian 6 Entitas
    entitiesMeta: [
      { tabKey: 'safwan', entitas: 'PT Safwan Berkah Indonesia', area: 'Bandung', kategori: 'E-Commerce (2 Toko)', targetBulanan: 2918467000, targetHarian: 97282233, rawRealisasiNov: 698569527, isGold: false },
      { tabKey: 'ansan', entitas: 'PT BQY Ansan Pakkawaru', area: 'Bandung', kategori: 'E-Commerce (3 Toko)', targetBulanan: 2244832500, targetHarian: 74827750, rawRealisasiNov: 483859861, isGold: false },
      { tabKey: 'amalqu', entitas: 'Yayasan Amalqu Indonesia Peduli', area: 'Bandung', kategori: 'Filantropi & Wakaf', targetBulanan: 650000000, targetHarian: 21666667, rawRealisasiNov: 145500987, isGold: false },
      { tabKey: 'latihhobi', entitas: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', area: 'Bandung', kategori: 'Edukasi & Pelatihan', targetBulanan: 541654000, targetHarian: 24620636, rawRealisasiNov: 156395702, isGold: false },
      { tabKey: 'sjp', entitas: 'CV Selamat Jaya Pakkawaru', area: 'Gorontalo', kategori: 'Trading Emas (Omset ÷3)', targetBulanan: 1000000000, targetHarian: 33333333, rawRealisasiNov: 1500542700, isGold: true },
      { tabKey: 'ppm', entitas: 'Pakkawaru Permata Mulia', area: 'Gorontalo', kategori: 'Trading Emas (Omset ÷3)', targetBulanan: 750000000, targetHarian: 25000000, rawRealisasiNov: 1273855100, isGold: true }
    ],
    ecommerceChannels: [
      { key: 'shopeeSafwan', parentTab: 'safwan', channel: 'Shopee Safwan', pemilik: 'PT Safwan Berkah Indonesia', qty: 1040, gross: 233073798, diskonPenjual: 60897444, net: 172176354, totalBaris: 1130, selesai: 205, diproses: 724, dibatalkan: 181, batalPersen: 16.02 },
      { key: 'tiktokSafwan', parentTab: 'safwan', channel: 'TikTok Safwan', pemilik: 'PT Safwan Berkah Indonesia', qty: 3391, gross: 739899754, diskonPenjual: 213506581, net: 526393173, totalBaris: 3733, selesai: 17, diproses: 276, dibatalkan: 570, batalPersen: 15.27 },
      { key: 'shopeeAnsan', parentTab: 'ansan', channel: 'Shopee Ansan', pemilik: 'PT BQY Ansan Pakkawaru', qty: 809, gross: 164752000, diskonPenjual: 38401938, net: 126350062, totalBaris: 930, selesai: 208, diproses: 545, dibatalkan: 159, batalPersen: 17.10 },
      { key: 'shopeeBasyirah', parentTab: 'ansan', channel: 'Shopee Basyirah', pemilik: 'PT BQY Ansan Pakkawaru', qty: 272, gross: 56909620, diskonPenjual: 13621269, net: 43288351, totalBaris: 257, selesai: 82, diproses: 123, dibatalkan: 41, batalPersen: 15.95 },
      { key: 'tiktokAnsan', parentTab: 'ansan', channel: 'TikTok Ansan', pemilik: 'PT BQY Ansan Pakkawaru', qty: 2404, gross: 539408300, diskonPenjual: 225192552, net: 314215748, totalBaris: 2635, selesai: 72, diproses: 87, dibatalkan: 388, batalPersen: 14.72 }
    ],
    stores: {
      tiktokSafwan: {
        storeName: 'TikTok Safwan',
        ownerName: 'PT Safwan Berkah Indonesia',
        platform: 'TikTok Shop',
        orders: [
          { orderId: '587089072208116815', isoDate: '2026-11-01', date: '01 Nov 2026', status: 'Belum dibayar', productName: '[Eksklusif Ramadan] Al Quran 30 J Pink', variation: 'A5 Pink', qty: 1, unitPrice: 299999, gross: 299999, sellerDiscount: 90105, net: 209894 },
          { orderId: '587088999291716782', isoDate: '2026-11-02', date: '02 Nov 2026', status: 'Belum dibayar', productName: '[PROMO RAMADAN] Buku Super Hijau', variation: 'Hijau', qty: 1, unitPrice: 179000, gross: 179000, sellerDiscount: 80006, net: 98994 },
          { orderId: '587089023256725117', isoDate: '2026-11-03', date: '03 Nov 2026', status: 'Perlu dikirim', productName: 'Wakaf Iqro Besar A5 Jilid 1-6 Leng 5 Pcs, Penyaluran Yayasan', variation: 'Paket 5 Pcs', qty: 1, unitPrice: 199500, gross: 199500, sellerDiscount: 0, net: 199500 },
          { orderId: '587088901616141913', isoDate: '2026-11-04', date: '04 Nov 2026', status: 'Perlu dikirim', productName: 'Al Quran 30 Juz Latin Terjemah Pe Pink, A4 (Besar)', variation: 'A4 Pink', qty: 1, unitPrice: 300000, gross: 300000, sellerDiscount: 90100, net: 209900 },
          { orderId: '587088938260203235', isoDate: '2026-11-05', date: '05 Nov 2026', status: 'Perlu dikirim', productName: '[Beli Al Quran Dapat 3 BONUS] Biru', variation: 'A5 Biru', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 70000, net: 129000 },
          { orderId: '587088920023630913', isoDate: '2026-11-06', date: '06 Nov 2026', status: 'Perlu dikirim', productName: 'Safwan X AmalQu Wakaf Al Quran 1 Pcs Al-Quran', variation: 'Wakaf 1 Pcs', qty: 1, unitPrice: 74900, gross: 74900, sellerDiscount: 10005, net: 64895 },
          { orderId: '587088815731213879', isoDate: '2026-11-08', date: '08 Nov 2026', status: 'Perlu dikirim', productName: '[Beli Al Quran Dapat 3 BONUS] Al Biru', variation: 'A5 Biru', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64105, net: 134895 },
          { orderId: '587076559156315974', isoDate: '2026-11-10', date: '10 Nov 2026', status: 'Perlu dikirim', productName: 'Safwan X AmalQu Wakaf Al Quran 3 Pcs Al-Quran', variation: 'Wakaf 3 Pcs', qty: 1, unitPrice: 180900, gross: 180900, sellerDiscount: 11905, net: 168995 }
        ]
      },
      shopeeSafwan: {
        storeName: 'Shopee Safwan',
        ownerName: 'PT Safwan Berkah Indonesia',
        platform: 'Shopee',
        orders: [
          { orderId: '25110147BVC6N', isoDate: '2026-11-01', date: '01 Nov 2026', status: 'Batal', productName: 'Safwan Al Quran ASPTJA5PK,3B, Ukuran A5 (Sedang)', variation: 'Pink Buku Doa', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 },
          { orderId: '25110147534R60', isoDate: '2026-11-02', date: '02 Nov 2026', status: 'Pesanan diterima', productName: 'Safwan Al Quran ASPTJA5PK,3B, Ukuran A5 (Sedang)', variation: 'Pink', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 },
          { orderId: '2511014944985V', isoDate: '2026-11-04', date: '04 Nov 2026', status: 'Pesanan diterima', productName: 'Safwan Al Quran ASPTJA5HT,3B, Ukuran A5 (Sedang)', variation: 'Hitam', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 },
          { orderId: '25110150D387U', isoDate: '2026-11-07', date: '07 Nov 2026', status: 'Sedang Dikirim', productName: 'Safwan Al Quran ASPTJA4BL,3B, Ukuran A4 (Besar)', variation: 'Biru A4', qty: 1, unitPrice: 299000, gross: 299000, sellerDiscount: 29100, net: 269900 },
          { orderId: '25110150E9TXW', isoDate: '2026-11-09', date: '09 Nov 2026', status: 'Sedang Dikirim', productName: 'Safwan Al Quran ASPTJA5PK,3B, Ukuran A5 (Sedang)', variation: 'Pink A5', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 }
        ]
      },
      tiktokAnsan: {
        storeName: 'TikTok Ansan',
        ownerName: 'PT BQY Ansan Pakkawaru',
        platform: 'TikTok Shop',
        orders: [
          { orderId: '587380882353514907', isoDate: '2026-11-01', date: '01 Nov 2026', status: 'Perlu dikirim', productName: '[PROMO SPESIAL] Al Quran Super Hitam', variation: 'A5 Hitam', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 69815, net: 129185 },
          { orderId: '587380923442333398', isoDate: '2026-11-03', date: '03 Nov 2026', status: 'Perlu dikirim', productName: '[SPESIAL PROMO] Al Quran Super Pink', variation: 'A5 Pink', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 60000, net: 139000 },
          { orderId: '587380944607482661', isoDate: '2026-11-05', date: '05 Nov 2026', status: 'Perlu dikirim', productName: 'Buku 10 Menit Paham Ruqyah Syar Default', variation: 'Default', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 90000, net: 109000 },
          { orderId: '587380981825921028', isoDate: '2026-11-08', date: '08 Nov 2026', status: 'Perlu dikirim', productName: '[SPESIAL PROMO] Al Quran Super Biru', variation: 'A5 Biru', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 80000, net: 119000 },
          { orderId: '587380994382776999', isoDate: '2026-11-10', date: '10 Nov 2026', status: 'Dibatalkan', productName: 'Buku Super Tahsin Belajar Tahsin 1 Hijau', variation: 'Hijau', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 79025, net: 119975 }
        ]
      },
      shopeeAnsan: {
        storeName: 'Shopee Ansan',
        ownerName: 'PT BQY Ansan Pakkawaru',
        platform: 'Shopee',
        orders: [
          { orderId: '25110104VF4MA4', isoDate: '2026-11-01', date: '01 Nov 2026', status: 'Pesanan diterima', productName: 'Al Quran Tadarus ASTDLASHT,3B, Hijau', variation: 'Hijau', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 80000, net: 119000 },
          { orderId: '25110104U019S2', isoDate: '2026-11-02', date: '02 Nov 2026', status: 'Sedang Dikirim', productName: 'Al Quran Hafalan AHKLASBR,3B, Biru, BONUS LENGKAP', variation: 'Biru', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 87580, net: 111420 },
          { orderId: '25110105196272', isoDate: '2026-11-06', date: '06 Nov 2026', status: 'Pesanan diterima', productName: 'Safwan - Al Quran ASPTJA5HT,3B, Hitam A5', variation: 'Hitam A5', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 },
          { orderId: '25110105PTB8M', isoDate: '2026-11-09', date: '09 Nov 2026', status: 'Pesanan diterima', productName: 'Al Quran Besar ASPTJA4HT,3B, Hitam A4 (Besar)', variation: 'Hitam A4', qty: 2, unitPrice: 239000, gross: 478000, sellerDiscount: 58200, net: 419800 }
        ]
      },
      shopeeBasyirah: {
        storeName: 'Shopee Basyirah',
        ownerName: 'PT BQY Ansan Pakkawaru',
        platform: 'Shopee',
        orders: [
          { orderId: '25110104R7VR04', isoDate: '2026-11-01', date: '01 Nov 2026', status: 'Pesanan diterima', productName: 'Al Quran Super ASPTJA5HT,3B, Hitam A5', variation: 'Hitam A5', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 79563, net: 119437 },
          { orderId: '2511010506G4G', isoDate: '2026-11-04', date: '04 Nov 2026', status: 'Sedang Dikirim', productName: 'Buku Super Tahsin BSPTHASHJ,1B, Hijau', variation: 'Hijau', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 84662, net: 114338 },
          { orderId: '25110105NY5P3', isoDate: '2026-11-07', date: '07 Nov 2026', status: 'Batal', productName: 'Al Quran Besar ASPTJA4HT,3B, Hitam', variation: 'Hitam A4', qty: 1, unitPrice: 239000, gross: 239000, sellerDiscount: 59662, net: 179338 },
          { orderId: '25110106024M1', isoDate: '2026-11-10', date: '10 Nov 2026', status: 'Telah Dikirim', productName: 'Al Quran Besar ASPTJA4PK,3B, Pink Ukuran A4', variation: 'Pink A4', qty: 1, unitPrice: 239000, gross: 239000, sellerDiscount: 59662, net: 179338 }
        ]
      }
    },
    amalqu: {
      entityName: 'Yayasan Amalqu Indonesia Peduli',
      targetBulanan: 650000000,
      targetHarian: 21666667,
      records: [
        { isoDate: '2026-11-01', tanggal: '01/11/2026', sahabat: 30000, amalqu: 16965713, total: 16995713 },
        { isoDate: '2026-11-02', tanggal: '02/11/2026', sahabat: 20000, amalqu: 9925693, total: 9945693 },
        { isoDate: '2026-11-03', tanggal: '03/11/2026', sahabat: 10000, amalqu: 19704000, total: 19714000 },
        { isoDate: '2026-11-04', tanggal: '04/11/2026', sahabat: 0, amalqu: 16661560, total: 16661560 },
        { isoDate: '2026-11-05', tanggal: '05/11/2026', sahabat: 105000, amalqu: 17009200, total: 17114200 },
        { isoDate: '2026-11-06', tanggal: '06/11/2026', sahabat: 304000, amalqu: 32716721, total: 33020721 },
        { isoDate: '2026-11-07', tanggal: '07/11/2026', sahabat: 0, amalqu: 9703000, total: 9703000 },
        { isoDate: '2026-11-08', tanggal: '08/11/2026', sahabat: 5000, amalqu: 7270000, total: 7275000 },
        { isoDate: '2026-11-09', tanggal: '09/11/2026', sahabat: 0, amalqu: 8937100, total: 8937100 },
        { isoDate: '2026-11-10', tanggal: '10/11/2026', sahabat: 0, amalqu: 6134000, total: 6134000 }
      ]
    },
    latihhobi: {
      entityName: 'PT Teknologi Solusi Pendidikan (Latih Hobi)',
      targetBulanan: 541654000,
      targetHarian: 24620636,
      records: [
        { isoDate: '2026-11-01', tanggal: '11/1/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 0, target: 0, persentase: 0 },
        { isoDate: '2026-11-02', tanggal: '11/2/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 48687937, target: 24620636, persentase: 197.75 },
        { isoDate: '2026-11-03', tanggal: '11/3/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 28072550, target: 24620636, persentase: 114.02 },
        { isoDate: '2026-11-04', tanggal: '11/4/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 16845437, target: 24620636, persentase: 68.42 },
        { isoDate: '2026-11-05', tanggal: '11/5/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 4721223, target: 24620636, persentase: 19.18 },
        { isoDate: '2026-11-06', tanggal: '11/6/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 21863730, target: 24620636, persentase: 88.80 },
        { isoDate: '2026-11-07', tanggal: '11/7/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 0, target: 0, persentase: 0 },
        { isoDate: '2026-11-08', tanggal: '11/8/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 0, target: 0, persentase: 0 },
        { isoDate: '2026-11-09', tanggal: '11/9/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 36204825, target: 24620636, persentase: 147.05 },
        { isoDate: '2026-11-10', tanggal: '11/10/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 0, target: 24620636, persentase: 0 }
      ]
    },
    sjp: {
      entityName: 'CV Selamat Jaya Pakkawaru (SJP)',
      targetBulanan: 1000000000,
      targetHarian: 33333333,
      rawTotalNov: 1500542700,
      records: [
        { no: '1', isoDate: '2026-11-01', tanggal: '25-Jul-2026 (Batch 1)', beratBeli: 79.71, modalBeli: 138480468, beratMasak: 79.71, penjualan: 140533900, untungRugi: 2053432, akumulasi: 2053432, status: 'Selesai' },
        { no: '2', isoDate: '2026-11-02', tanggal: '26-Jul-2026 (Batch 2)', beratBeli: 74.91, modalBeli: 119833000, beratMasak: 74.91, penjualan: 125594000, untungRugi: 5761000, akumulasi: 7814432, status: 'Selesai' },
        { no: '3', isoDate: '2026-11-03', tanggal: '27-28 Jul-2026 (Batch 3)', beratBeli: 88.29, modalBeli: 133179726, beratMasak: 88.29, penjualan: 138946000, untungRugi: 5766274, akumulasi: 13580706, status: 'Selesai' },
        { no: '21', isoDate: '2026-11-05', tanggal: '19-Agu-2026 (Batch 21)', beratBeli: 100.69, modalBeli: 154562416, beratMasak: 100.69, penjualan: 167355000, untungRugi: 12792584, akumulasi: 66292044, status: 'Selesai' },
        { no: '22', isoDate: '2026-11-06', tanggal: '21-Agu-2026 (Batch 22)', beratBeli: 123.73, modalBeli: 200628665, beratMasak: 123.73, penjualan: 211992000, untungRugi: 11363335, akumulasi: 77655379, status: 'Selesai (21-22/08/26)' },
        { no: '25', isoDate: '2026-11-08', tanggal: '26-Agu-2026 (Batch 25)', beratBeli: 154.19, modalBeli: 261340040, beratMasak: 154.19, penjualan: 255144600, untungRugi: -6195440, akumulasi: 84497155, status: 'Rugi (26-27/08/26)' },
        { no: '28', isoDate: '2026-11-09', tanggal: '30-31 Agu-2026 (Batch 28)', beratBeli: 193.27, modalBeli: 274907530, beratMasak: 193.27, penjualan: 288239600, untungRugi: 13332070, akumulasi: 121905230, status: 'Penjualan di tgl 31' },
        { no: '29', isoDate: '2026-11-10', tanggal: '1-Sep-2026 (Batch 29)', beratBeli: 100.71, modalBeli: 121479500, beratMasak: 100.71, penjualan: 172737600, untungRugi: 13179100, akumulasi: 135084330, status: 'Selesai' }
      ]
    },
    ppm: {
      entityName: 'Pakkawaru Permata Mulia (PPM)',
      targetBulanan: 750000000,
      targetHarian: 25000000,
      rawTotalNov: 1273855100,
      records: [
        { no: '1', isoDate: '2026-10-12', tanggal: '5,7,9,10,11-Okt-2026', beratBeli: 60.22, modalBeli: 112568360, beratMasak: 51.38, penjualan: 115605000, untungRugi: 3036640, akumulasi: 3036640, status: 'Penjualan di tgl 12/10' },
        { no: '2', isoDate: '2026-10-17', tanggal: '13,14,15,16-Okt-2026', beratBeli: 58.74, modalBeli: 106391260, beratMasak: 48.98, penjualan: 109960100, untungRugi: 3568840, akumulasi: 6605480, status: 'Penjualan di tgl 17/10' },
        { no: '3', isoDate: '2026-10-24', tanggal: '18,20,22-Okt-2026', beratBeli: 62.60, modalBeli: 116016500, beratMasak: 52.60, penjualan: 116246000, untungRugi: 229500, akumulasi: 6834980, status: 'Penjualan di tgl 24/10' },
        { no: '4', isoDate: '2026-10-27', tanggal: '25,26-Okt-2026', beratBeli: 88.38, modalBeli: 159414000, beratMasak: 74.50, penjualan: 164272500, untungRugi: 4858500, akumulasi: 11693480, status: 'Penjualan di tgl 27/10' },
        { no: '5', isoDate: '2026-10-28', tanggal: '27-Okt-2026', beratBeli: 83.29, modalBeli: 153431600, beratMasak: 71.10, penjualan: 157486500, untungRugi: 4054900, akumulasi: 15748380, status: 'Penjualan di tgl 28/10' },
        { no: '6', isoDate: '2026-10-29', tanggal: '28-Okt-2026', beratBeli: 96.10, modalBeli: 175486150, beratMasak: 81.48, penjualan: 180478200, untungRugi: 4992050, akumulasi: 20740430, status: 'Penjualan di tgl 29/10' },
        { no: '7', isoDate: '2026-11-02', tanggal: '29,30,31 Okt-01 Nov 2026', beratBeli: 164.23, modalBeli: 296739220, beratMasak: 141.10, penjualan: 303365000, untungRugi: 6625780, akumulasi: 27366210, status: 'Penjualan di tgl 02/11' },
        { no: '8', isoDate: '2026-11-03', tanggal: '3-Nov-2026', beratBeli: 256.33, modalBeli: 442974980, beratMasak: 202.92, penjualan: 440336400, untungRugi: -2638580, akumulasi: 24727630, status: 'Rugi, Penjualan di tgl 03/11' },
        { no: '9', isoDate: '2026-11-05', tanggal: '4-Nov-2026', beratBeli: 145.09, modalBeli: 262441200, beratMasak: 124.30, penjualan: 277189000, untungRugi: 14747800, akumulasi: 39475430, status: 'Penjualan di tgl 05/11' },
        { no: '10', isoDate: '2026-11-06', tanggal: '5-Nov-2026', beratBeli: 64.69, modalBeli: 119676500, beratMasak: 54.96, penjualan: 121461600, untungRugi: 1785100, akumulasi: 41260530, status: 'Penjualan di tgl 06/11' },
        { no: '11', isoDate: '2026-11-10', tanggal: '10-Nov-2026', beratBeli: 84.02, modalBeli: 123462040, beratMasak: 58.97, penjualan: 131503100, untungRugi: 8041060, akumulasi: 49301590, status: 'Penjualan di tgl 10/11' }
      ]
    }
  };
}

/**
 * ============================================================================
 * HELPER TANGGAL, TARGET PER TANGGAL, & PEMBAGI 3 OMSET EMAS
 * ============================================================================
 */
function getSelectedDaysCount() {
  const s = new Date(STATE.startDate);
  const e = new Date(STATE.endDate);
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

function isWithinDateRange(isoDateStr) {
  if (!isoDateStr) return true;
  return isoDateStr >= STATE.startDate && isoDateStr <= STATE.endDate;
}

function getGoldDivisor() {
  return STATE.divideGoldByThree ? 3 : 1;
}

/**
 * Menghitung Realisasi & Target Per Tanggal untuk masing-masing Entitas
 */
function calculateEntityMetricsForRange(entMeta) {
  const days = getSelectedDaysCount();
  const ratioFromTenDays = Math.min(1, days / 10); // Karena baseline snapshot adalah 1-10 Nov (10 hari)

  let rawRealisasi = 0;

  if (entMeta.tabKey === 'amalqu') {
    const recs = STATE.db.amalqu.records.filter(r => isWithinDateRange(r.isoDate));
    rawRealisasi = recs.reduce((a, b) => a + b.total, 0);
  } else if (entMeta.tabKey === 'latihhobi') {
    const recs = STATE.db.latihhobi.records.filter(r => isWithinDateRange(r.isoDate));
    rawRealisasi = recs.reduce((a, b) => a + b.omset, 0);
  } else if (entMeta.tabKey === 'ppm') {
    const recs = STATE.db.ppm.records.filter(r => isWithinDateRange(r.isoDate));
    rawRealisasi = recs.length > 0 ? recs.reduce((a, b) => a + b.penjualan, 0) : entMeta.rawRealisasiNov * ratioFromTenDays;
  } else if (entMeta.tabKey === 'sjp') {
    const recs = STATE.db.sjp.records.filter(r => isWithinDateRange(r.isoDate));
    rawRealisasi = recs.length > 0 ? recs.reduce((a, b) => a + b.penjualan, 0) : entMeta.rawRealisasiNov * ratioFromTenDays;
  } else {
    // Safwan & BQY Ansan proporsional terhadap tanggal terpilih di dalam rentang 1-10 Nov
    rawRealisasi = Math.round(entMeta.rawRealisasiNov * ratioFromTenDays);
  }

  // ATURAN REVISI 3 (AUDIO): Omset SJP dan PPM dibagi 3
  const divisor = entMeta.isGold ? getGoldDivisor() : 1;
  const recognizedRealisasi = Math.round(rawRealisasi / divisor);

  // ATURAN REVISI 2: Target Per Tanggal (Target Harian x Jumlah Hari Terpilih)
  const targetPeriode = Math.round(entMeta.targetHarian * days);
  const targetBulanan = entMeta.targetBulanan;

  const persenPeriode = targetPeriode > 0 ? Number(((recognizedRealisasi / targetPeriode) * 100).toFixed(2)) : 0;
  const persenBulanan = targetBulanan > 0 ? Number(((recognizedRealisasi / targetBulanan) * 100).toFixed(2)) : 0;
  const isAchieved = recognizedRealisasi >= targetPeriode;
  const selisihPeriode = recognizedRealisasi - targetPeriode;

  return {
    ...entMeta,
    days,
    rawRealisasi,
    realisasi: recognizedRealisasi,
    targetPeriode,
    persenPeriode,
    persenBulanan,
    isAchieved,
    selisihPeriode,
    statusText: isAchieved ? 'ACHIEVED' : 'BELUM ACHIEVE'
  };
}

function formatIDR(val) {
  const num = Math.round(Number(val) || 0);
  const prefix = num < 0 ? '-Rp' : 'Rp';
  return prefix + Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatCompactIDR(val) {
  const num = Number(val) || 0;
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  if (abs >= 1e9) return sign + 'Rp' + (abs / 1e9).toFixed(2).replace('.', ',') + ' M';
  if (abs >= 1e6) return sign + 'Rp' + (abs / 1e6).toFixed(1).replace('.', ',') + ' Jt';
  return formatIDR(num);
}

function parseCleanNumber(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim();
  const isNeg = str.startsWith('-') || (str.includes('(') && str.includes(')'));
  str = str.replace(/[Rp%\s.()]/gi, '').replace(/,/g, '.');
  const parsed = parseFloat(str);
  if (isNaN(parsed)) return 0;
  return isNeg && parsed > 0 ? -parsed : parsed;
}

function animateNumber(elId, targetVal) {
  const el = document.getElementById(elId);
  if (!el) return;
  const duration = 500;
  const start = performance.now();

  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = formatIDR(targetVal * ease);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function formatShortDateRange() {
  const s = STATE.startDate.slice(8, 10) + '/' + STATE.startDate.slice(5, 7);
  const e = STATE.endDate.slice(8, 10) + '/' + STATE.endDate.slice(5, 7);
  return `${s} – ${e} (${getSelectedDaysCount()} Hr)`;
}

/**
 * ============================================================================
 * LIVE SYNC DARI 11 SHEET GOOGLE SPREADSHEET & PUSH FIREBASE
 * ============================================================================
 */
function fetchSheetGviz(sheetId, sheetName) {
  return new Promise((resolve, reject) => {
    const cb = 'pakkawaruCb_' + Math.random().toString(36).substring(2, 9);
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 9000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cb] = function(res) {
      cleanup();
      if (!res || !res.table) return reject(new Error('Invalid table'));
      const rows = res.table.rows.map(r => (r.c || []).map(c => (c ? (c.f !== undefined ? c.f : c.v) : '')));
      resolve(rows);
    };

    script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json;responseHandler:${cb}&sheet=${encodeURIComponent(sheetName)}`;
    script.onerror = () => { cleanup(); reject(new Error('Fetch error')); };
    document.body.appendChild(script);
  });
}

function normalizeAnyDateToIso(rawStr, fallbackIso = '2026-11-01') {
  if (!rawStr) return fallbackIso;
  const s = String(rawStr).trim();
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // Format DD/MM/YYYY (seperti Yayasan Amalqu: 06/11/2026)
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const p1 = dmy[1].padStart(2, '0');
    const p2 = dmy[2].padStart(2, '0');
    // Jika bulan 11 ada di posisi pertama (M/D/YYYY seperti Latih Hobi 11/2/2026)
    if (Number(p1) === 11 && Number(p2) <= 31 && s.indexOf('0') !== 0) {
      return `${dmy[3]}-${p1}-${p2}`;
    }
    return `${dmy[3]}-${p2}-${p1}`;
  }
  // Deteksi catatan penjualan emas seperti "tgl 05/11" atau "10/11"
  const noteMatch = s.match(/(\d{1,2})\/(\d{1,2})/);
  if (noteMatch) {
    const day = noteMatch[1].padStart(2, '0');
    const mon = noteMatch[2].padStart(2, '0');
    return `2026-${mon}-${day}`;
  }
  return fallbackIso;
}

async function syncFromGoogleSheets(manualAlert = false) {
  const badge = document.getElementById('lastSyncText');
  if (badge) badge.textContent = 'Menarik 11 Sheet...';

  try {
    const id = STATE.sheetId;
    const [amalquRows, latihRows, ppmRows] = await Promise.all([
      fetchSheetGviz(id, 'Yayasan Amalqu').catch(() => null),
      fetchSheetGviz(id, 'Latih Hobi').catch(() => null),
      fetchSheetGviz(id, 'PPM').catch(() => null)
    ]);

    if (amalquRows && amalquRows.length > 1) {
      const list = [];
      amalquRows.forEach(r => {
        const t = String(r[0] || '').trim();
        if (!t.includes('/')) return;
        const sh = parseCleanNumber(r[1]), am = parseCleanNumber(r[2]), tot = parseCleanNumber(r[3]);
        if (sh > 0 || am > 0 || tot > 0) {
          const parts = t.split('/');
          const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          list.push({ isoDate: iso, tanggal: t, sahabat: sh, amalqu: am, total: tot });
        }
      });
      if (list.length) STATE.db.amalqu.records = list;
    }

    if (latihRows && latihRows.length > 1) {
      const list = [];
      latihRows.forEach(r => {
        const t = String(r[0] || '').trim();
        if (!t || t.toLowerCase() === 'tanggal') return;
        const parts = t.split('/');
        const iso = parts.length === 3 ? `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}` : '2026-11-01';
        list.push({
          isoDate: iso,
          tanggal: t,
          deskripsi: String(r[1] || ''),
          omset: parseCleanNumber(r[2]),
          target: parseCleanNumber(r[3]),
          persentase: parseCleanNumber(r[4])
        });
      });
      if (list.length) STATE.db.latihhobi.records = list;
    }

    if (ppmRows && ppmRows.length > 3) {
      const list = [];
      ppmRows.forEach(r => {
        const no = String(r[0] || '').trim();
        const modal = parseCleanNumber(r[4]);
        if (!no || isNaN(Number(no)) || modal === 0) return;
        const statusNote = String(r[9] || 'Selesai');
        const iso = normalizeAnyDateToIso(statusNote, '2026-11-02');
        list.push({
          no,
          isoDate: iso,
          tanggal: String(r[1] || 'Nov 2026'),
          beratBeli: parseCleanNumber(r[2]),
          modalBeli: modal,
          beratMasak: parseCleanNumber(r[5]),
          penjualan: parseCleanNumber(r[6]),
          untungRugi: parseCleanNumber(r[7]),
          akumulasi: parseCleanNumber(r[8]),
          status: statusNote
        });
      });
      if (list.length) STATE.db.ppm.records = list;
    }

    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    STATE.db.metadata.lastUpdated = 'Live Sync: ' + now;
    if (badge) badge.textContent = STATE.db.metadata.lastUpdated;

    if (STATE.firebaseUrl) await pushToFirebase(false);
    renderDashboard();
    if (manualAlert) alert('Sinkronisasi 11 Sheet Pakkawaru Group berhasil!');
  } catch (e) {
    if (badge) badge.textContent = 'Data Aktif (' + STATE.db.metadata.lastUpdated + ')';
  }
}

async function pushToFirebase(showAlert = true) {
  if (!STATE.firebaseUrl) {
    if (showAlert) document.getElementById('configModalBackdrop').classList.remove('hidden');
    return;
  }
  try {
    const url = STATE.firebaseUrl.replace(/\/$/, '') + '/pakkawaruGroup.json';
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(STATE.db)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (showAlert) alert('Data berhasil di-push ke Firebase Realtime Database!');
  } catch (err) {
    if (showAlert) alert('Gagal push ke Firebase: ' + err.message);
  }
}

/**
 * ============================================================================
 * CONTROLLER RENDER 7 TAB + PITA TARGET PERIODE
 * ============================================================================
 */
function renderDashboard() {
  const tab = STATE.activeTab;
  const storeSwitch = document.getElementById('storeSubSwitch');
  const areaSwitch = document.getElementById('holdingAreaSwitch');
  const chartModeSel = document.getElementById('holdingChartMode');
  const secondaryCard = document.getElementById('secondaryHoldingCard');

  storeSwitch.classList.add('hidden');
  areaSwitch.classList.add('hidden');
  chartModeSel.classList.add('hidden');
  secondaryCard.classList.add('hidden');

  if (tab === 'holding') {
    areaSwitch.classList.remove('hidden');
    chartModeSel.classList.remove('hidden');
    secondaryCard.classList.remove('hidden');
    renderHoldingTab();
  } else if (tab === 'safwan' || tab === 'ansan') {
    storeSwitch.classList.remove('hidden');
    renderEcommerceEntityTab(tab);
  } else if (tab === 'amalqu') {
    renderAmalquTab();
  } else if (tab === 'latihhobi') {
    renderLatihHobiTab();
  } else if (tab === 'sjp' || tab === 'ppm') {
    renderGoldEntityTab(tab);
  }
}

function updateRibbonSummary(realisasiPeriode, targetPeriode) {
  const days = getSelectedDaysCount();
  const pct = targetPeriode > 0 ? ((realisasiPeriode / targetPeriode) * 100).toFixed(2) : '0.00';
  const achieved = realisasiPeriode >= targetPeriode;

  document.getElementById('activeDaysCountText').textContent = `${days} Hari`;
  document.getElementById('ribbonPeriodTargetText').textContent = formatIDR(targetPeriode);

  const chip = document.getElementById('ribbonAchieveChip');
  chip.className = 'summary-chip ' + (achieved ? 'chip-achieved' : 'chip-progress');
  document.getElementById('ribbonAchieveText').textContent = `${pct.replace('.', ',')}% (${achieved ? 'ACHIEVED ✓' : 'Belum Achieve'})`;
}

/**
 * 1. TAB HOLDING & REGIONAL (TARGET PER TANGGAL + OMSET EMAS DIBAGI 3)
 */
function renderHoldingTab() {
  const area = STATE.holdingArea;
  const days = getSelectedDaysCount();
  const computedEntities = STATE.db.entitiesMeta.map(calculateEntityMetricsForRange);

  const filteredByArea = area === 'all' ? computedEntities : computedEntities.filter(e => e.area === area);

  const totalRealisasi = filteredByArea.reduce((a, b) => a + b.realisasi, 0);
  const totalRawRealisasi = filteredByArea.reduce((a, b) => a + b.rawRealisasi, 0);
  const totalTargetPeriode = filteredByArea.reduce((a, b) => a + b.targetPeriode, 0);
  const totalTargetBulanan = filteredByArea.reduce((a, b) => a + b.targetBulanan, 0);
  const totalTargetHarian = filteredByArea.reduce((a, b) => a + b.targetHarian, 0);

  const capPeriode = totalTargetPeriode > 0 ? Number(((totalRealisasi / totalTargetPeriode) * 100).toFixed(2)) : 0;
  const capBulanan = totalTargetBulanan > 0 ? Number(((totalRealisasi / totalTargetBulanan) * 100).toFixed(2)) : 0;
  const isAchieved = totalRealisasi >= totalTargetPeriode;
  const selisihPeriode = totalRealisasi - totalTargetPeriode;

  updateRibbonSummary(totalRealisasi, totalTargetPeriode);

  document.getElementById('entityRegionBadge').textContent = `KONSOLIDASI PAKKAWARU GROUP • RENTANG ${days} HARI (${STATE.divideGoldByThree ? 'OMSET EMAS DIBAGI 3' : 'OMSET EMAS 100%'})`;
  document.getElementById('currentPageTitle').textContent = 'Pakkawaru Group — Holding & Regional';
  document.getElementById('currentPageSubtitle').textContent = `Evaluasi Realisasi vs Target Per Tanggal (${formatShortDateRange()}) & Target Bulanan`;

  updateTopKpis(
    {
      label: `Realisasi (${days} Hari Terpilih)`,
      pill: formatShortDateRange(),
      val: totalRealisasi,
      trend: `${capPeriode}% dari Target Periode (${isAchieved ? 'ACHIEVED ✓' : 'Kurang ' + formatCompactIDR(Math.abs(selisihPeriode))})`,
      isWarn: !isAchieved
    },
    {
      label: `Target Per Tanggal (${days} Hari)`,
      pill: 'Target Periode',
      val: totalTargetPeriode,
      trend: `Target Harian: ${formatIDR(totalTargetHarian)} / hari`,
      isWarn: false
    },
    {
      label: 'Target Bulanan Penuh (30 Hr)',
      pill: 'Full Bulan',
      val: totalTargetBulanan,
      trend: `Capaian Bulanan: ${capBulanan}% • Penjualan Riil Sebelum ÷3: ${formatCompactIDR(totalRawRealisasi)}`,
      isWarn: false
    }
  );

  // Hitung Komparasi Bandung vs Gorontalo pada rentang tanggal terpilih
  const bdgList = computedEntities.filter(e => e.area === 'Bandung');
  const gtoList = computedEntities.filter(e => e.area === 'Gorontalo');

  const bdgReal = bdgList.reduce((a, b) => a + b.realisasi, 0);
  const bdgTargetPer = bdgList.reduce((a, b) => a + b.targetPeriode, 0);
  const bdgPct = bdgTargetPer > 0 ? ((bdgReal / bdgTargetPer) * 100).toFixed(2) : '0';

  const gtoReal = gtoList.reduce((a, b) => a + b.realisasi, 0);
  const gtoRaw = gtoList.reduce((a, b) => a + b.rawRealisasi, 0);
  const gtoTargetPer = gtoList.reduce((a, b) => a + b.targetPeriode, 0);
  const gtoPct = gtoTargetPer > 0 ? ((gtoReal / gtoTargetPer) * 100).toFixed(2) : '0';

  document.getElementById('contextualCardsContainer').innerHTML = `
    <div class="context-card">
      <div class="context-top">
        <div>
          <div class="context-title">📍 Area Bandung (4 Entitas)</div>
          <div class="context-sub">Target ${days} Hari: <strong>${formatIDR(bdgTargetPer)}</strong></div>
        </div>
        <span class="status-pill ${bdgReal >= bdgTargetPer ? 'pill-approved' : 'pill-pending'}">${bdgPct}% (${bdgReal >= bdgTargetPer ? 'Achieved' : 'Belum Achieve'})</span>
      </div>
      <div class="context-val">${formatIDR(bdgReal)}</div>
      <div class="context-bottom">
        <span>Selisih Periode: ${formatIDR(bdgReal - bdgTargetPer)}</span>
        <button class="btn-link-detail" onclick="setAreaFilter('Bandung')">Filter Bandung</button>
      </div>
    </div>

    <div class="context-card">
      <div class="context-top">
        <div>
          <div class="context-title">📍 Area Gorontalo — SJP & PPM (${STATE.divideGoldByThree ? 'Omset ÷ 3' : '100%'})</div>
          <div class="context-sub">Target ${days} Hari: <strong>${formatIDR(gtoTargetPer)}</strong> • Penjualan Riil: ${formatCompactIDR(gtoRaw)}</div>
        </div>
        <span class="status-pill ${gtoReal >= gtoTargetPer ? 'pill-approved' : 'pill-delivered'}">${gtoPct}% (${gtoReal >= gtoTargetPer ? 'Achieved' : 'Belum Achieve'})</span>
      </div>
      <div class="context-val">${formatIDR(gtoReal)}</div>
      <div class="context-bottom">
        <span>Pengakuan: Penjualan ${formatCompactIDR(gtoRaw)} ÷ ${getGoldDivisor()}</span>
        <button class="btn-link-detail" onclick="setAreaFilter('Gorontalo')">Filter Gorontalo</button>
      </div>
    </div>
  `;

  // Grafik Batang Utama
  if (STATE.holdingChartMode === 'monthly_vs_actual') {
    document.getElementById('mainChartTitle').textContent = 'Perbandingan Target Bulanan Penuh vs Realisasi Aktual';
    drawBarChart(
      filteredByArea.map(e => shortEntity(e.entitas)),
      filteredByArea.map(e => e.targetBulanan),
      filteredByArea.map(e => e.realisasi),
      'Target Bulanan (30 Hr)',
      'Realisasi Aktual'
    );
  } else if (STATE.holdingChartMode === 'ecommerce') {
    document.getElementById('mainChartTitle').textContent = 'Performa 5 Toko E-Commerce (Omset Kotor vs Omset Bersih)';
    drawBarChart(
      STATE.db.ecommerceChannels.map(c => c.channel),
      STATE.db.ecommerceChannels.map(c => c.gross),
      STATE.db.ecommerceChannels.map(c => c.net),
      'Omset Kotor (Kolom Biru)',
      'Omset Bersih (Net)'
    );
  } else if (STATE.holdingChartMode === 'regional') {
    document.getElementById('mainChartTitle').textContent = `Target Periode (${days} Hari) vs Realisasi per Area`;
    drawBarChart(
      ['Area Bandung', 'Area Gorontalo (Emas ÷3)'],
      [bdgTargetPer, gtoTargetPer],
      [bdgReal, gtoReal],
      `Target ${days} Hari`,
      `Realisasi ${days} Hari`
    );
  } else {
    document.getElementById('mainChartTitle').textContent = `Target Per Tanggal (${days} Hari) vs Realisasi (${formatShortDateRange()})`;
    drawBarChart(
      filteredByArea.map(e => shortEntity(e.entitas)),
      filteredByArea.map(e => e.targetPeriode),
      filteredByArea.map(e => e.realisasi),
      `Target ${days} Hari`,
      `Realisasi ${days} Hari`
    );
  }

  // Donut Chart Kanan
  document.getElementById('donutChartTitle').textContent = 'Porsi Realisasi Entitas';
  drawDonutChart(
    filteredByArea.map(e => shortEntity(e.entitas)),
    filteredByArea.map(e => e.realisasi),
    capPeriode + '%',
    formatCompactIDR(totalRealisasi)
  );

  // Tabel Utama 6 Entitas dengan Kolom Target Per Tanggal & Target Bulanan
  document.getElementById('mainTableTitle').textContent = `Evaluasi Target Per Tanggal (${days} Hari) & Target Bulanan — Pakkawaru Group`;
  const q = STATE.searchQuery.toLowerCase();
  const rows = filteredByArea.filter(e => !q || e.entitas.toLowerCase().includes(q) || e.area.toLowerCase().includes(q));

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>Entitas Bisnis</th>
      <th>Target Bulanan</th>
      <th>Target ${days} Hari (Periode)</th>
      <th>Realisasi Pengakuan</th>
      <th>% Achieve (${days} Hr)</th>
      <th>Status Periode</th>
      <th>Aksi</th>
    </tr>
  `;

  document.getElementById('mainTableBody').innerHTML = rows.map(e => {
    const pill = e.isAchieved ? 'pill-approved' : 'pill-delivered';
    const goldNote = e.isGold
      ? `Penjualan Riil: ${formatIDR(e.rawRealisasi)} (Dibagi ${getGoldDivisor()})`
      : e.kategori;
    const payload = encodePayload(e.entitas, `Area ${e.area} • Durasi ${days} Hari`, e.statusText, {
      'Target Bulanan (30 Hr)': formatIDR(e.targetBulanan),
      'Target Harian': formatIDR(e.targetHarian),
      [`Target Periode (${days} Hari)`]: formatIDR(e.targetPeriode),
      'Penjualan Riil (100%)': formatIDR(e.rawRealisasi),
      'Omset Pengakuan Dashboard': formatIDR(e.realisasi),
      [`% Achieve Periode (${days} Hr)`]: e.persenPeriode + '%',
      'Selisih vs Target Periode': formatIDR(e.selisihPeriode)
    });

    return `
      <tr>
        <td>
          <div class="entity-cell">
            <div class="entity-badge-icon">${shortEntity(e.entitas).substring(0, 2).toUpperCase()}</div>
            <div>
              <span class="entity-title">${e.entitas}</span>
              <span class="entity-sub">${goldNote}</span>
            </div>
          </div>
        </td>
        <td>${formatIDR(e.targetBulanan)}</td>
        <td><strong>${formatIDR(e.targetPeriode)}</strong></td>
        <td><strong style="color:#0F172A;font-size:13.5px;">${formatIDR(e.realisasi)}</strong></td>
        <td><strong>${e.persenPeriode}%</strong> <small style="color:#64748B;">(${e.persenBulanan}% Bln)</small></td>
        <td><span class="status-pill ${pill}">${e.statusText}</span></td>
        <td>
          <button class="btn-table-review" onclick="openReviewModal('${payload}')">Review</button>
          <button class="btn-table-action" onclick="switchToTab('${e.tabKey}')">Buka →</button>
        </td>
      </tr>
    `;
  }).join('');
  document.getElementById('mainTablePagination').innerHTML = '';

  // Tabel Kedua: 5 Toko E-Commerce
  document.getElementById('secondaryTableHead').innerHTML = `
    <tr>
      <th>Channel / Toko</th>
      <th>Entitas Pemilik</th>
      <th>Qty Terjual</th>
      <th>Omset Kotor (Gross)</th>
      <th>Diskon Penjual</th>
      <th>Omset Bersih (Net)</th>
      <th>Buka Toko</th>
    </tr>
  `;
  document.getElementById('secondaryTableBody').innerHTML = STATE.db.ecommerceChannels.map(c => `
    <tr>
      <td><strong>${c.channel}</strong></td>
      <td>${c.pemilik}</td>
      <td>${c.qty.toLocaleString('id-ID')} Pcs</td>
      <td>${formatIDR(c.gross)}</td>
      <td style="color:#F43F5E;">-${formatIDR(c.diskonPenjual)}</td>
      <td><strong>${formatIDR(c.net)}</strong></td>
      <td><button class="btn-table-action" onclick="jumpToStore('${c.parentTab}', '${c.key}')">Detail →</button></td>
    </tr>
  `).join('');

  // Panel Kanan: Sorotan Pengakuan Emas ÷ 3
  const sjpCalc = computedEntities.find(e => e.tabKey === 'sjp');
  const ppmCalc = computedEntities.find(e => e.tabKey === 'ppm');
  document.getElementById('rightSideDynamicBoxes').innerHTML = `
    <div class="mini-metric-card">
      <div class="mm-header"><span> Pengakuan Emas SJP (÷${getGoldDivisor()})</span><span class="mm-tag">${sjpCalc.persenPeriode}% Target ${days}Hr</span></div>
      <div class="mm-highlight green-text">${formatIDR(sjpCalc.realisasi)}</div>
      <div class="mm-footer">
        <div><small>Penjualan Riil (100%)</small><strong>${formatIDR(sjpCalc.rawRealisasi)}</strong></div>
        <div><small>Target ${days} Hari</small><strong>${formatCompactIDR(sjpCalc.targetPeriode)}</strong></div>
      </div>
    </div>
    <div class="mini-metric-card">
      <div class="mm-header"><span>🪙 Pengakuan Emas PPM (÷${getGoldDivisor()})</span><span class="mm-tag">${ppmCalc.persenPeriode}% Target ${days}Hr</span></div>
      <div class="mm-highlight blue-text">${formatIDR(ppmCalc.realisasi)}</div>
      <div class="mm-footer">
        <div><small>Penjualan Riil (100%)</small><strong>${formatIDR(ppmCalc.rawRealisasi)}</strong></div>
        <div><small>Target ${days} Hari</small><strong>${formatCompactIDR(ppmCalc.targetPeriode)}</strong></div>
      </div>
    </div>
  `;
}

/**
 * 2. TAB ENTITAS E-COMMERCE: PT SAFWAN & PT BQY ANSAN
 */
function renderEcommerceEntityTab(mode) {
  const isSafwan = mode === 'safwan';
  const meta = calculateEntityMetricsForRange(STATE.db.entitiesMeta.find(e => e.tabKey === mode));
  const storeKeys = isSafwan ? ['tiktokSafwan', 'shopeeSafwan'] : ['tiktokAnsan', 'shopeeAnsan', 'shopeeBasyirah'];
  const activeStore = isSafwan ? STATE.safwanStore : STATE.ansanStore;
  const days = getSelectedDaysCount();

  updateRibbonSummary(meta.realisasi, meta.targetPeriode);

  document.getElementById('entityRegionBadge').textContent = `AREA BANDUNG • FILTER KOLOM BIRU (${formatShortDateRange()})`;
  document.getElementById('currentPageTitle').textContent = meta.entitas;
  document.getElementById('currentPageSubtitle').textContent = `Target ${days} Hari: ${formatIDR(meta.targetPeriode)} • Target Bulanan: ${formatIDR(meta.targetBulanan)}`;

  const switchEl = document.getElementById('storeSubSwitch');
  const buttons = [
    { key: 'all', label: isSafwan ? 'Semua Toko Safwan (2)' : 'Semua Toko Ansan (3)' },
    ...storeKeys.map(k => ({ key: k, label: STATE.db.stores[k].storeName }))
  ];
  switchEl.innerHTML = buttons.map(b => `
    <button class="sub-pill ${activeStore === b.key ? 'active' : ''}" onclick="selectEntityStore('${mode}', '${b.key}')">${b.label}</button>
  `).join('');

  updateTopKpis(
    {
      label: `Realisasi Net (${days} Hari)`,
      pill: formatShortDateRange(),
      val: meta.realisasi,
      trend: `${meta.persenPeriode}% dari Target ${days} Hari (${meta.statusText})`,
      isWarn: !meta.isAchieved
    },
    {
      label: `Target Per Tanggal (${days} Hari)`,
      pill: 'Target Periode',
      val: meta.targetPeriode,
      trend: `Target Harian: ${formatIDR(meta.targetHarian)}`,
      isWarn: false
    },
    {
      label: 'Target Bulanan Penuh',
      pill: '30 Hari',
      val: meta.targetBulanan,
      trend: `Capaian terhadap Bulan Penuh: ${meta.persenBulanan}%`,
      isWarn: false
    }
  );

  const chList = STATE.db.ecommerceChannels.filter(c => c.parentTab === mode && (activeStore === 'all' || c.key === activeStore));
  document.getElementById('contextualCardsContainer').innerHTML = chList.map(c => `
    <div class="context-card">
      <div class="context-top">
        <div><div class="context-title">🛍️ ${c.channel}</div><div class="context-sub">Qty: ${c.qty.toLocaleString('id-ID')} Pcs • Gross: ${formatCompactIDR(c.gross)}</div></div>
        <span class="status-pill pill-approved">Net Kolom Biru</span>
      </div>
      <div class="context-val">${formatIDR(c.net)}</div>
      <div class="context-bottom">
        <span>Diskon Penjual: -${formatIDR(c.diskonPenjual)}</span>
        <span>Batal: ${c.batalPersen}%</span>
      </div>
    </div>
  `).join('');

  let orders = [];
  storeKeys.forEach(k => {
    if (activeStore === 'all' || activeStore === k) {
      const st = STATE.db.stores[k];
      st.orders.filter(o => isWithinDateRange(o.isoDate)).forEach(o => orders.push({ ...o, storeName: st.storeName }));
    }
  });

  document.getElementById('mainChartTitle').textContent = `Perbandingan Target ${days} Hari vs Realisasi Toko (${meta.entitas})`;
  drawBarChart(
    chList.map(c => c.channel),
    chList.map(c => c.gross),
    chList.map(c => c.net),
    'Omset Kotor (Gross Biru)',
    'Omset Bersih (Net Biru)'
  );

  drawDonutChart(
    chList.map(c => c.channel),
    chList.map(c => c.net),
    meta.persenPeriode + '%',
    formatCompactIDR(meta.realisasi)
  );

  document.getElementById('mainTableTitle').textContent = `Daftar Pesanan Kolom Biru (${formatShortDateRange()})`;
  const pageItems = paginateRows(orders);

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>Tanggal & Order ID</th>
      <th>Toko</th>
      <th>Produk</th>
      <th>Qty (Biru)</th>
      <th>Harga Awal (Biru)</th>
      <th>Diskon Penjual (Biru)</th>
      <th>Net</th>
      <th>Audit</th>
    </tr>
  `;

  document.getElementById('mainTableBody').innerHTML = pageItems.map(o => {
    const payload = encodePayload(`Order #${o.orderId}`, `${o.storeName} • ${o.date}`, o.status, {
      'Produk': o.productName,
      'Qty (Kolom Biru)': o.qty + ' Pcs',
      'Harga Awal (Kolom Biru)': formatIDR(o.unitPrice),
      'Diskon Penjual (Kolom Biru)': formatIDR(o.sellerDiscount),
      'Subtotal Net': formatIDR(o.net)
    });
    return `
      <tr>
        <td><strong>${o.date}</strong><span class="entity-sub">#${o.orderId}</span></td>
        <td>${o.storeName}</td>
        <td>${o.productName.substring(0, 36)}</td>
        <td>${o.qty}</td>
        <td>${formatIDR(o.unitPrice)}</td>
        <td style="color:#F43F5E;">-${formatIDR(o.sellerDiscount)}</td>
        <td><strong>${formatIDR(o.net)}</strong></td>
        <td><button class="btn-table-review" onclick="openReviewModal('${payload}')">Review</button></td>
      </tr>
    `;
  }).join('');
}

/**
 * 3. TAB YAYASAN AMALQU (DENGAN FILTER TANGGAL & TARGET PER TANGGAL)
 */
function renderAmalquTab() {
  const meta = calculateEntityMetricsForRange(STATE.db.entitiesMeta.find(e => e.tabKey === 'amalqu'));
  const recs = STATE.db.amalqu.records.filter(r => isWithinDateRange(r.isoDate));
  const days = getSelectedDaysCount();

  updateRibbonSummary(meta.realisasi, meta.targetPeriode);

  document.getElementById('entityRegionBadge').textContent = `AREA BANDUNG • YAYASAN AMALQU (${formatShortDateRange()})`;
  document.getElementById('currentPageTitle').textContent = meta.entitas;
  document.getElementById('currentPageSubtitle').textContent = `Target ${days} Hari: ${formatIDR(meta.targetPeriode)} • Target Bulanan: ${formatIDR(meta.targetBulanan)}`;

  updateTopKpis(
    { label: `Realisasi Donasi (${days} Hari)`, pill: formatShortDateRange(), val: meta.realisasi, trend: `${meta.persenPeriode}% dari Target ${days} Hari (${meta.statusText})`, isWarn: !meta.isAchieved },
    { label: `Target Per Tanggal (${days} Hari)`, pill: 'Target Periode', val: meta.targetPeriode, trend: `Target Harian: ${formatIDR(meta.targetHarian)}`, isWarn: false },
    { label: 'Target Bulanan Penuh', pill: '30 Hari', val: meta.targetBulanan, trend: `Capaian terhadap Target Bulanan: ${meta.persenBulanan}%`, isWarn: false }
  );

  const sumSahabat = recs.reduce((a, b) => a + b.sahabat, 0);
  const sumAmalqu = recs.reduce((a, b) => a + b.amalqu, 0);
  document.getElementById('contextualCardsContainer').innerHTML = `
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">💚 Kanal AmalQu (${days} Hr)</div><div class="context-sub">Penerimaan utama yayasan</div></div><span class="status-pill pill-approved">Utama</span></div>
      <div class="context-val">${formatIDR(sumAmalqu)}</div>
    </div>
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">🤝 Sahabat Berbagi (${days} Hr)</div><div class="context-sub">Program afiliasi kebaikan</div></div><span class="status-pill pill-pending">Program</span></div>
      <div class="context-val">${formatIDR(sumSahabat)}</div>
    </div>
  `;

  document.getElementById('mainChartTitle').textContent = `Target Harian vs Realisasi Donasi (${formatShortDateRange()})`;
  drawBarChart(
    recs.map(r => r.tanggal.substring(0, 5)),
    recs.map(() => meta.targetHarian),
    recs.map(r => r.total),
    'Target Harian (Rp21,66 Jt)',
    'Realisasi Harian'
  );

  drawDonutChart(
    ['Realisasi Periode Ini', 'Sisa Target Periode'],
    [meta.realisasi, Math.max(0, meta.targetPeriode - meta.realisasi)],
    meta.persenPeriode + '%',
    formatCompactIDR(meta.realisasi)
  );

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>Tanggal</th>
      <th>Sahabat Berbagi</th>
      <th>AmalQu</th>
      <th>Realisasi Harian</th>
      <th>Target Harian</th>
      <th>Status Harian</th>
    </tr>
  `;
  document.getElementById('mainTableBody').innerHTML = paginateRows(recs).map(r => {
    const ok = r.total >= meta.targetHarian;
    return `
      <tr>
        <td><strong>${r.tanggal}</strong></td>
        <td>${formatIDR(r.sahabat)}</td>
        <td>${formatIDR(r.amalqu)}</td>
        <td><strong>${formatIDR(r.total)}</strong></td>
        <td>${formatIDR(meta.targetHarian)}</td>
        <td><span class="status-pill ${ok ? 'pill-approved' : 'pill-delivered'}">${((r.total / meta.targetHarian) * 100).toFixed(1)}% (${ok ? 'Achieved' : 'Belum'})</span></td>
      </tr>
    `;
  }).join('');
}

/**
 * 4. TAB LATIH HOBI (DENGAN FILTER TANGGAL & TARGET PER TANGGAL)
 */
function renderLatihHobiTab() {
  const meta = calculateEntityMetricsForRange(STATE.db.entitiesMeta.find(e => e.tabKey === 'latihhobi'));
  const recs = STATE.db.latihhobi.records.filter(r => isWithinDateRange(r.isoDate));
  const days = getSelectedDaysCount();

  updateRibbonSummary(meta.realisasi, meta.targetPeriode);

  document.getElementById('entityRegionBadge').textContent = `AREA BANDUNG • LATIH HOBI (${formatShortDateRange()})`;
  document.getElementById('currentPageTitle').textContent = meta.entitas;
  document.getElementById('currentPageSubtitle').textContent = `Target ${days} Hari: ${formatIDR(meta.targetPeriode)} • Target Bulanan: ${formatIDR(meta.targetBulanan)}`;

  updateTopKpis(
    { label: `Realisasi Omset (${days} Hari)`, pill: formatShortDateRange(), val: meta.realisasi, trend: `${meta.persenPeriode}% dari Target ${days} Hari (${meta.statusText})`, isWarn: !meta.isAchieved },
    { label: `Target Per Tanggal (${days} Hari)`, pill: 'Target Periode', val: meta.targetPeriode, trend: `Target Harian: ${formatIDR(meta.targetHarian)}`, isWarn: false },
    { label: 'Target Bulanan Penuh', pill: '30 Hari', val: meta.targetBulanan, trend: `Capaian Bulanan: ${meta.persenBulanan}%`, isWarn: false }
  );

  document.getElementById('contextualCardsContainer').innerHTML = '';

  document.getElementById('mainChartTitle').textContent = `Target Harian vs Realisasi Omset Latih Hobi (${formatShortDateRange()})`;
  drawBarChart(
    recs.map(r => r.tanggal),
    recs.map(() => meta.targetHarian),
    recs.map(r => r.omset),
    'Target Harian (Rp24,62 Jt)',
    'Realisasi Harian'
  );

  drawDonutChart(
    ['Realisasi Periode', 'Sisa Target Periode'],
    [meta.realisasi, Math.max(0, meta.targetPeriode - meta.realisasi)],
    meta.persenPeriode + '%',
    formatCompactIDR(meta.realisasi)
  );

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>Tanggal</th>
      <th>Unit Bisnis</th>
      <th>Realisasi Harian</th>
      <th>Target Harian</th>
      <th>% Capaian</th>
      <th>Status</th>
    </tr>
  `;
  document.getElementById('mainTableBody').innerHTML = paginateRows(recs).map(r => {
    const ok = r.omset >= meta.targetHarian;
    return `
      <tr>
        <td><strong>${r.tanggal}</strong></td>
        <td>${r.deskripsi}</td>
        <td><strong>${formatIDR(r.omset)}</strong></td>
        <td>${formatIDR(meta.targetHarian)}</td>
        <td><strong>${r.persentase}%</strong></td>
        <td><span class="status-pill ${ok ? 'pill-approved' : 'pill-delivered'}">${ok ? 'ACHIEVED' : 'BELUM ACHIEVE'}</span></td>
      </tr>
    `;
  }).join('');
}

/**
 * 5. TAB DIVISI EMAS: CV SJP & PPM (PENJUALAN DIBAGI 3 SESUAI AUDIO + TARGET PER TANGGAL)
 */
function renderGoldEntityTab(key) {
  const meta = calculateEntityMetricsForRange(STATE.db.entitiesMeta.find(e => e.tabKey === key));
  const rawList = STATE.db[key].records;
  const filteredRecs = rawList.filter(r => isWithinDateRange(r.isoDate));
  const activeRecs = filteredRecs.length > 0 ? filteredRecs : rawList;
  const days = getSelectedDaysCount();
  const divisor = getGoldDivisor();

  updateRibbonSummary(meta.realisasi, meta.targetPeriode);

  document.getElementById('entityRegionBadge').textContent = `AREA GORONTALO • PENGAKUAN OMSET EMAS DIBAGI ${divisor} (${formatShortDateRange()})`;
  document.getElementById('currentPageTitle').textContent = `${ STATE.db[key].entityName }`;
  document.getElementById('currentPageSubtitle').textContent = `Penjualan Riil: ${formatIDR(meta.rawRealisasi)} ÷ ${divisor} = Omset Pengakuan Dashboard: ${formatIDR(meta.realisasi)}`;

  updateTopKpis(
    {
      label: `Omset Pengakuan (Penjualan ÷ ${divisor})`,
      pill: formatShortDateRange(),
      val: meta.realisasi,
      trend: `${meta.persenPeriode}% dari Target ${days} Hari (${meta.statusText})`,
      isWarn: !meta.isAchieved
    },
    {
      label: `Target Per Tanggal (${days} Hari)`,
      pill: 'Target Periode',
      val: meta.targetPeriode,
      trend: `Target Harian: ${formatIDR(meta.targetHarian)} / hari`,
      isWarn: false
    },
    {
      label: 'Target Bulanan Penuh (30 Hr)',
      pill: 'Full Bulan',
      val: meta.targetBulanan,
      trend: `Capaian Bulanan: ${meta.persenBulanan}% • Penjualan Riil 100%: ${formatIDR(meta.rawRealisasi)}`,
      isWarn: false
    }
  );

  const sumProfit = activeRecs.reduce((a, b) => a + b.untungRugi, 0);
  const sumGram = activeRecs.reduce((a, b) => a + b.beratBeli, 0);

  document.getElementById('contextualCardsContainer').innerHTML = `
    <div class="context-card">
      <div class="context-top">
        <div><div class="context-title">💰 Penjualan Emas Riil (100%)</div><div class="context-sub">Angka sebelum dibagi 3 di spreadsheet</div></div>
        <span class="status-pill pill-pending">Gross 100%</span>
      </div>
      <div class="context-val">${formatIDR(meta.rawRealisasi)}</div>
    </div>
    <div class="context-card">
      <div class="context-top">
        <div><div class="context-title">➗ Omset Pengakuan Pakkawaru (÷3)</div><div class="context-sub">Disetarakan agar sebanding dengan net profit</div></div>
        <span class="status-pill pill-approved">Diakui Dashboard</span>
      </div>
      <div class="context-val">${formatIDR(Math.round(meta.rawRealisasi / 3))}</div>
    </div>
    <div class="context-card">
      <div class="context-top">
        <div><div class="context-title">⚖️ Total Gramasi & Laba Batch</div><div class="context-sub">Total berat: ${sumGram.toFixed(2)} gr</div></div>
        <span class="status-pill pill-approved">Net Profit</span>
      </div>
      <div class="context-val">${formatIDR(sumProfit)}</div>
    </div>
  `;

  document.getElementById('mainChartTitle').textContent = `Perbandingan Penjualan Riil (100%) vs Omset Pengakuan Dashboard (÷3) per Batch`;
  drawBarChart(
    activeRecs.map(r => r.tanggal.substring(0, 12)),
    activeRecs.map(r => r.penjualan),
    activeRecs.map(r => Math.round(r.penjualan / 3)),
    'Penjualan Riil (100%)',
    'Omset Pengakuan (÷ 3)'
  );

  drawDonutChart(
    ['Omset Pengakuan (÷3)', `Sisa Target ${days} Hari`],
    [meta.realisasi, Math.max(0, meta.targetPeriode - meta.realisasi)],
    meta.persenPeriode + '%',
    formatCompactIDR(meta.realisasi)
  );

  document.getElementById('mainTableTitle').textContent = `Tabel Transaksi Emas (Menampilkan Penjualan Riil & Omset Dibagi 3)`;
  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>No & Tanggal</th>
      <th>Berat (gr)</th>
      <th>Modal Beli</th>
      <th>Penjualan Riil (100%)</th>
      <th>Omset Dashboard (÷ 3)</th>
      <th>Untung / (Rugi)</th>
      <th>Status</th>
    </tr>
  `;

  document.getElementById('mainTableBody').innerHTML = paginateRows(activeRecs).map(r => {
    const omsetDiv3 = Math.round(r.penjualan / 3);
    const isLoss = r.untungRugi < 0;
    return `
      <tr>
        <td><strong>#${r.no}</strong> • ${r.tanggal}</td>
        <td>${r.beratBeli} gr</td>
        <td>${formatIDR(r.modalBeli)}</td>
        <td>${formatIDR(r.penjualan)}</td>
        <td><strong style="color:#4A8CFF;">${formatIDR(omsetDiv3)}</strong></td>
        <td style="color:${isLoss ? '#F43F5E' : '#10B981'};font-weight:700;">${formatIDR(r.untungRugi)}</td>
        <td><span class="status-pill ${isLoss ? 'pill-danger' : 'pill-approved'}">${r.status}</span></td>
      </tr>
    `;
  }).join('');
}

/**
 * ============================================================================
 * CHART.JS & UI HELPERS
 * ============================================================================
 */
function updateTopKpis(k1, k2, k3) {
  document.getElementById('kpi1Label').textContent = k1.label;
  document.getElementById('kpi1Pill').textContent = k1.pill;
  document.getElementById('kpi1TrendText').textContent = k1.trend;
  document.getElementById('kpi1TrendWrap').className = 'kpi-trend ' + (k1.isWarn ? 'warn' : '');
  animateNumber('kpi1Value', k1.val);

  document.getElementById('kpi2Label').textContent = k2.label;
  document.getElementById('kpi2Pill').textContent = k2.pill;
  document.getElementById('kpi2TrendText').textContent = k2.trend;
  animateNumber('kpi2Value', k2.val);

  document.getElementById('kpi3Label').textContent = k3.label;
  document.getElementById('kpi3Pill').textContent = k3.pill;
  document.getElementById('kpi3TrendText').textContent = k3.trend;
  animateNumber('kpi3Value', k3.val);
}

function drawBarChart(labels, data1, data2, label1, label2) {
  document.getElementById('legend1Text').textContent = label1;
  document.getElementById('legend2Text').textContent = label2;

  const ctx = document.getElementById('revenueBarChart').getContext('2d');
  if (STATE.barChart) STATE.barChart.destroy();

  STATE.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: label1, data: data1, backgroundColor: '#F59E0B', borderRadius: 6, barPercentage: 0.65, categoryPercentage: 0.6 },
        { label: label2, data: data2, backgroundColor: '#2ED47A', borderRadius: 6, barPercentage: 0.65, categoryPercentage: 0.6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1E2433',
          padding: 12,
          cornerRadius: 10,
          callbacks: { label: c => ` ${c.dataset.label}: ${formatIDR(c.parsed.y)}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' }, color: '#64748B' } },
        y: { border: { display: false }, grid: { color: '#F1F5F9' }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#94A3B8', callback: v => formatCompactIDR(v) } }
      }
    }
  });
}

function drawDonutChart(labels, values, pillText, totalText) {
  const palette = ['#4A8CFF', '#2ED47A', '#8B5CF6', '#F43F5E', '#F59E0B', '#06B6D4'];
  const ctx = document.getElementById('distributionDonutChart').getContext('2d');
  if (STATE.donutChart) STATE.donutChart.destroy();

  const sum = values.reduce((a, b) => a + b, 0) || 1;
  const pill = document.getElementById('donutFloatingPill');
  pill.textContent = pillText;
  document.getElementById('donutSharePercent').textContent = pillText;
  document.getElementById('donutTotalNominal').textContent = totalText;

  STATE.donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1E2433',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: c => {
              const pct = ((c.parsed / sum) * 100).toFixed(1) + '%';
              pill.textContent = pct;
              return ` ${c.label}: ${formatIDR(c.parsed)} (${pct})`;
            }
          }
        }
      }
    }
  });

  document.getElementById('donutLegendList').innerHTML = labels.map((l, i) => `
    <div class="donut-legend-item">
      <span class="legend-dot" style="background:${palette[i % palette.length]}"></span>
      <span title="${l}">${l}</span>
    </div>
  `).join('');
}

function paginateRows(rows) {
  const totalPages = Math.max(1, Math.ceil(rows.length / STATE.pageSize));
  if (STATE.tablePage > totalPages) STATE.tablePage = 1;
  const start = (STATE.tablePage - 1) * STATE.pageSize;
  const pagEl = document.getElementById('mainTablePagination');

  if (totalPages <= 1) {
    pagEl.innerHTML = '';
  } else {
    let html = '';
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="page-num-btn ${p === STATE.tablePage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
    }
    pagEl.innerHTML = html;
  }
  return rows.slice(start, start + STATE.pageSize);
}

function shortEntity(name) {
  return name
    .replace('PT Safwan Berkah Indonesia', 'PT Safwan')
    .replace('PT BQY Ansan Pakkawaru', 'PT BQY Ansan')
    .replace('Yayasan Amalqu Indonesia Peduli', 'Yayasan Amalqu')
    .replace('PT Teknologi Solusi Pendidikan (Latih Hobi)', 'Latih Hobi')
    .replace('CV Selamat Jaya Pakkawaru', 'CV SJP (÷3)')
    .replace('Pakkawaru Permata Mulia', 'PPM (÷3)');
}

function encodePayload(title, sub, status, metrics) {
  return encodeURIComponent(JSON.stringify({ title, sub, status, metrics }));
}

/**
 * ============================================================================
 * EVENT HANDLERS (FILTER TANGGAL, SAKELAR EMAS ÷ 3, & NAVIGASI)
 * ============================================================================
 */
window.switchToTab = function(tabKey) {
  STATE.activeTab = tabKey;
  STATE.tablePage = 1;
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
  renderDashboard();
};

window.jumpToStore = function(parentTab, storeKey) {
  if (parentTab === 'safwan') STATE.safwanStore = storeKey;
  if (parentTab === 'ansan') STATE.ansanStore = storeKey;
  window.switchToTab(parentTab);
};

window.selectEntityStore = function(mode, storeKey) {
  if (mode === 'safwan') STATE.safwanStore = storeKey;
  if (mode === 'ansan') STATE.ansanStore = storeKey;
  STATE.tablePage = 1;
  renderDashboard();
};

window.setAreaFilter = function(area) {
  STATE.holdingArea = area;
  document.querySelectorAll('#holdingAreaSwitch .sub-pill').forEach(b => b.classList.toggle('active', b.dataset.area === area));
  renderDashboard();
};

window.goToPage = function(p) {
  STATE.tablePage = p;
  renderDashboard();
};

window.openReviewModal = function(encoded) {
  const item = JSON.parse(decodeURIComponent(encoded));
  document.getElementById('modalEntityAvatar').textContent = item.title.replace('#', '').substring(0, 2).toUpperCase();
  document.getElementById('modalEntityName').textContent = item.title;
  document.getElementById('modalEntitySub').textContent = item.sub;
  document.getElementById('modalEntityStatus').textContent = item.status;

  document.getElementById('modalMetricsDetail').innerHTML = Object.entries(item.metrics || {}).map(([k, v]) => `
    <div>
      <small style="color:#64748B;display:block;">${k}</small>
      <strong style="color:#0F172A;">${v}</strong>
    </div>
  `).join('');

  document.getElementById('reviewModalBackdrop').classList.remove('hidden');
};

window.openActionModal = function(encoded) {
  const item = JSON.parse(decodeURIComponent(encoded));
  document.getElementById('actionEntityName').textContent = item.title;
  document.getElementById('actionEntitySub').textContent = item.sub;
  document.getElementById('actionModalBackdrop').classList.remove('hidden');
};

function exportActiveTabCsv() {
  const days = getSelectedDaysCount();
  const rows = [['Entitas', 'Area', 'Target Bulanan', `Target ${days} Hari`, 'Penjualan Riil (100%)', 'Omset Pengakuan Dashboard', `% Achieve (${days} Hr)`, 'Status']];
  STATE.db.entitiesMeta.map(calculateEntityMetricsForRange).forEach(e => {
    rows.push([e.entitas, e.area, e.targetBulanan, e.targetPeriode, e.rawRealisasi, e.realisasi, e.persenPeriode + '%', e.statusText]);
  });
  const csv = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = encodeURI(csv);
  a.download = `Pakkawaru_Group_${STATE.startDate}_sd_${STATE.endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

document.addEventListener('DOMContentLoaded', () => {
  STATE.db = createInitialDatabase();
  renderDashboard();

  syncFromGoogleSheets(false);
  setInterval(() => syncFromGoogleSheets(false), 60000);

  // Input Tanggal Mulai & Akhir
  const startInp = document.getElementById('startDateInput');
  const endInp = document.getElementById('endDateInput');

  function onDateRangeChange() {
    if (startInp.value && endInp.value) {
      STATE.startDate = startInp.value;
      STATE.endDate = endInp.value < startInp.value ? startInp.value : endInp.value;
      endInp.value = STATE.endDate;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      renderDashboard();
    }
  }

  startInp.addEventListener('change', onDateRangeChange);
  endInp.addEventListener('change', onDateRangeChange);

  // Tombol Pintasan Rentang Tanggal
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const p = btn.dataset.preset;
      if (p === '5days') {
        STATE.startDate = '2026-11-01';
        STATE.endDate = '2026-11-05';
      } else if (p === '10days') {
        STATE.startDate = '2026-11-01';
        STATE.endDate = '2026-11-10';
      } else if (p === '15days') {
        STATE.startDate = '2026-11-01';
        STATE.endDate = '2026-11-15';
      } else if (p === 'fullmonth') {
        STATE.startDate = '2026-11-01';
        STATE.endDate = '2026-11-30';
      }
      startInp.value = STATE.startDate;
      endInp.value = STATE.endDate;
      renderDashboard();
    });
  });

  // Tombol Sakelar Pengakuan Omset Emas (Dibagi 3 vs 100%)
  const goldBtn = document.getElementById('btnToggleGoldRule');
  goldBtn.addEventListener('click', () => {
    STATE.divideGoldByThree = !STATE.divideGoldByThree;
    goldBtn.classList.toggle('raw-mode', !STATE.divideGoldByThree);
    document.getElementById('goldRuleText').textContent = STATE.divideGoldByThree
      ? 'Omset Emas: Dibagi 3 (÷3)'
      : 'Omset Emas: Penjualan Riil (100%)';
    renderDashboard();
  });

  // Navigasi 7 Tab
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => window.switchToTab(btn.dataset.tab));
  });

  document.getElementById('btnHomeLogo').addEventListener('click', () => window.switchToTab('holding'));

  document.querySelectorAll('#holdingAreaSwitch .sub-pill').forEach(btn => {
    btn.addEventListener('click', () => window.setAreaFilter(btn.dataset.area));
  });

  document.getElementById('holdingChartMode').addEventListener('change', e => {
    STATE.holdingChartMode = e.target.value;
    renderDashboard();
  });

  ['globalSearchInput', 'localTableSearch'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      STATE.searchQuery = e.target.value;
      STATE.tablePage = 1;
      renderDashboard();
    });
  });

  document.querySelectorAll('#modalSelectableTags .tag-pill').forEach(tag => {
    tag.addEventListener('click', () => tag.classList.toggle('active'));
  });

  ['btnCloseReviewModal', 'btnCancelReview', 'btnSubmitReview'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('reviewModalBackdrop').classList.add('hidden'));
  });

  ['btnCloseActionModal', 'btnCancelAction', 'btnSubmitAction'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('actionModalBackdrop').classList.add('hidden'));
  });

  document.getElementById('btnOpenConfig').addEventListener('click', () => {
    document.getElementById('inputSheetId').value = STATE.sheetId;
    document.getElementById('inputFirebaseUrl').value = STATE.firebaseUrl;
    document.getElementById('configModalBackdrop').classList.remove('hidden');
  });

  ['btnCloseConfigModal', 'btnCancelConfig'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('configModalBackdrop').classList.add('hidden'));
  });

  document.getElementById('btnSaveConfig').addEventListener('click', () => {
    STATE.sheetId = document.getElementById('inputSheetId').value.trim() || DEFAULT_SHEET_ID;
    STATE.firebaseUrl = document.getElementById('inputFirebaseUrl').value.trim();
    localStorage.setItem('pakkawaru_sheet_id', STATE.sheetId);
    localStorage.setItem('pakkawaru_firebase_url', STATE.firebaseUrl);
    document.getElementById('configModalBackdrop').classList.add('hidden');
    syncFromGoogleSheets(true);
  });

  document.getElementById('btnSyncNow').addEventListener('click', () => syncFromGoogleSheets(true));
  document.getElementById('btnPushFirebase').addEventListener('click', () => pushToFirebase(true));
  document.getElementById('btnExportCsv').addEventListener('click', exportActiveTabCsv);
});