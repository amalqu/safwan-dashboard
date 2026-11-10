/**
 * ============================================================================
 * PAKKAWARU GROUP — EXECUTIVE BI & REALTIME FINANCIAL ENGINE (app.js)
 * Arsitektur: 1 Tab Holding/Regional + 6 Tab Entitas Mandiri (11 Sheet Live)
 * ============================================================================
 */

const DEFAULT_SHEET_ID = '1CuPBkl1nq2tUuy2tTtRRLZWrptXRZGuDbFylCDFDZNk';

const STATE = {
  sheetId: localStorage.getItem('pakkawaru_sheet_id') || DEFAULT_SHEET_ID,
  firebaseUrl: localStorage.getItem('pakkawaru_firebase_url') || '',
  activeTab: 'holding',       // holding | safwan | ansan | amalqu | latihhobi | sjp | ppm
  holdingArea: 'all',         // all | Bandung | Gorontalo
  holdingChartMode: 'entities',
  safwanStore: 'all',         // all | tiktokSafwan | shopeeSafwan
  ansanStore: 'all',          // all | tiktokAnsan | shopeeAnsan | shopeeBasyirah
  searchQuery: '',
  tablePage: 1,
  pageSize: 8,
  barChart: null,
  donutChart: null,
  db: null
};

/**
 * DATABASE AWAL PRESISI DARI 11 SHEET PAKKAWARU GROUP
 */
function createInitialDatabase() {
  return {
    metadata: {
      company: 'Pakkawaru Group',
      lastUpdated: '10 Nov 2026, 18:16 WIB'
    },
    holding: {
      summary: {
        realisasi: 4258723877,
        targetBulanan: 8104953500,
        targetHarian: 276730620,
        capaianPersen: 52.54,
        estimasiAkhirBulan: 12776171631
      },
      regional: {
        Bandung: {
          nama: 'Wilayah Bandung',
          unitCount: '4 Entitas (Safwan, BQY Ansan, AmalQu, Latih Hobi)',
          targetBulanan: 6354953500,
          targetHarian: 218397286,
          realisasi: 1484326077,
          capaianPersen: 23.36,
          estimasi: 4452978231,
          status: 'On Progress'
        },
        Gorontalo: {
          nama: 'Wilayah Gorontalo',
          unitCount: '2 Entitas Emas (CV SJP & PPM)',
          targetBulanan: 1750000000,
          targetHarian: 58333333,
          realisasi: 2774397800,
          capaianPersen: 158.54,
          estimasi: 8323193400,
          status: 'Tercapai'
        }
      },
      entities: [
        { tabKey: 'safwan', entitas: 'PT Safwan Berkah Indonesia', area: 'Bandung', kategori: 'E-Commerce (2 Toko)', targetBulanan: 2918467000, targetHarian: 97282233, realisasi: 698569527, persentase: 23.94, estimasi: 2095708581, status: 'On Progress' },
        { tabKey: 'ansan', entitas: 'PT BQY Ansan Pakkawaru', area: 'Bandung', kategori: 'E-Commerce (3 Toko)', targetBulanan: 2244832500, targetHarian: 74827750, realisasi: 483859861, persentase: 21.55, estimasi: 1451579583, status: 'On Progress' },
        { tabKey: 'amalqu', entitas: 'Yayasan Amalqu Indonesia Peduli', area: 'Bandung', kategori: 'Filantropi & Wakaf', targetBulanan: 650000000, targetHarian: 21666667, realisasi: 145500987, persentase: 22.38, estimasi: 436502961, status: 'On Progress' },
        { tabKey: 'latihhobi', entitas: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', area: 'Bandung', kategori: 'Edukasi & Pelatihan', targetBulanan: 541654000, targetHarian: 24620636, realisasi: 156395702, persentase: 28.87, estimasi: 469187106, status: 'On Progress' },
        { tabKey: 'sjp', entitas: 'CV Selamat Jaya Pakkawaru', area: 'Gorontalo', kategori: 'Trading Emas', targetBulanan: 1000000000, targetHarian: 33333333, realisasi: 1500542700, persentase: 150.05, estimasi: 4501628100, status: 'Tercapai' },
        { tabKey: 'ppm', entitas: 'Pakkawaru Permata Mulia', area: 'Gorontalo', kategori: 'Trading Emas', targetBulanan: 750000000, targetHarian: 25000000, realisasi: 1273855100, persentase: 169.85, estimasi: 3821565300, status: 'Tercapai' }
      ],
      ecommerceChannels: [
        { key: 'shopeeSafwan', parentTab: 'safwan', channel: 'Shopee Safwan', pemilik: 'PT Safwan Berkah Indonesia', qty: 1040, gross: 233073798, diskonPenjual: 60897444, net: 172176354, totalBaris: 1130, selesai: 205, diproses: 724, dibatalkan: 181, batalPersen: 16.02 },
        { key: 'tiktokSafwan', parentTab: 'safwan', channel: 'TikTok Safwan', pemilik: 'PT Safwan Berkah Indonesia', qty: 3391, gross: 739899754, diskonPenjual: 213506581, net: 526393173, totalBaris: 3733, selesai: 17, diproses: 276, dibatalkan: 570, batalPersen: 15.27 },
        { key: 'shopeeAnsan', parentTab: 'ansan', channel: 'Shopee Ansan', pemilik: 'PT BQY Ansan Pakkawaru', qty: 809, gross: 164752000, diskonPenjual: 38401938, net: 126350062, totalBaris: 930, selesai: 208, diproses: 545, dibatalkan: 159, batalPersen: 17.10 },
        { key: 'shopeeBasyirah', parentTab: 'ansan', channel: 'Shopee Basyirah', pemilik: 'PT BQY Ansan Pakkawaru', qty: 272, gross: 56909620, diskonPenjual: 13621269, net: 43288351, totalBaris: 257, selesai: 82, diproses: 123, dibatalkan: 41, batalPersen: 15.95 },
        { key: 'tiktokAnsan', parentTab: 'ansan', channel: 'TikTok Ansan', pemilik: 'PT BQY Ansan Pakkawaru', qty: 2404, gross: 539408300, diskonPenjual: 225192552, net: 314215748, totalBaris: 2635, selesai: 72, diproses: 87, dibatalkan: 388, batalPersen: 14.72 }
      ]
    },
    stores: {
      tiktokSafwan: {
        storeName: 'TikTok Safwan',
        ownerName: 'PT Safwan Berkah Indonesia',
        platform: 'TikTok Shop',
        orders: [
          { orderId: '587089072208116815', date: '01 Nov 2026', status: 'Belum dibayar', productName: '[Eksklusif Ramadan] Al Quran 30 J Pink', variation: 'A5 Pink', qty: 1, unitPrice: 299999, gross: 299999, sellerDiscount: 90105, net: 209894 },
          { orderId: '587088999291716782', date: '01 Nov 2026', status: 'Belum dibayar', productName: '[PROMO RAMADAN] Buku Super Hijau', variation: 'Hijau', qty: 1, unitPrice: 179000, gross: 179000, sellerDiscount: 80006, net: 98994 },
          { orderId: '587089023256725117', date: '01 Nov 2026', status: 'Perlu dikirim', productName: 'Wakaf Iqro Besar A5 Jilid 1-6 Leng 5 Pcs, Penyaluran Yayasan', variation: 'Paket 5 Pcs', qty: 1, unitPrice: 199500, gross: 199500, sellerDiscount: 0, net: 199500 },
          { orderId: '587088901616141913', date: '01 Nov 2026', status: 'Perlu dikirim', productName: 'Al Quran 30 Juz Latin Terjemah Pe Pink, A4 (Besar)', variation: 'A4 Pink', qty: 1, unitPrice: 300000, gross: 300000, sellerDiscount: 90100, net: 209900 },
          { orderId: '587088938260203235', date: '01 Nov 2026', status: 'Perlu dikirim', productName: '[Beli Al Quran Dapat 3 BONUS] Biru', variation: 'A5 Biru', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 70000, net: 129000 },
          { orderId: '587088920023630913', date: '01 Nov 2026', status: 'Perlu dikirim', productName: 'Safwan X AmalQu Wakaf Al Quran 1 Pcs Al-Quran', variation: 'Wakaf 1 Pcs', qty: 1, unitPrice: 74900, gross: 74900, sellerDiscount: 10005, net: 64895 },
          { orderId: '587088815731213879', date: '01 Nov 2026', status: 'Perlu dikirim', productName: '[Beli Al Quran Dapat 3 BONUS] Al Biru', variation: 'A5 Biru', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64105, net: 134895 },
          { orderId: '587076559156315974', date: '01 Nov 2026', status: 'Perlu dikirim', productName: 'Safwan X AmalQu Wakaf Al Quran 3 Pcs Al-Quran', variation: 'Wakaf 3 Pcs', qty: 1, unitPrice: 180900, gross: 180900, sellerDiscount: 11905, net: 168995 }
        ]
      },
      shopeeSafwan: {
        storeName: 'Shopee Safwan',
        ownerName: 'PT Safwan Berkah Indonesia',
        platform: 'Shopee',
        orders: [
          { orderId: '25110147BVC6N', date: '2026-11-01', status: 'Batal', productName: 'Safwan Al Quran ASPTJA5PK,3B, Ukuran A5 (Sedang)', variation: 'Pink Buku Doa', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 },
          { orderId: '25110147534R60', date: '2026-11-01', status: 'Pesanan diterima', productName: 'Safwan Al Quran ASPTJA5PK,3B, Ukuran A5 (Sedang)', variation: 'Pink', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 },
          { orderId: '2511014944985V', date: '2026-11-01', status: 'Pesanan diterima', productName: 'Safwan Al Quran ASPTJA5HT,3B, Ukuran A5 (Sedang)', variation: 'Hitam', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 },
          { orderId: '25110150D387U', date: '2026-11-01', status: 'Sedang Dikirim', productName: 'Safwan Al Quran ASPTJA4BL,3B, Ukuran A4 (Besar)', variation: 'Biru A4', qty: 1, unitPrice: 299000, gross: 299000, sellerDiscount: 29100, net: 269900 },
          { orderId: '25110150E9TXW', date: '2026-11-01', status: 'Sedang Dikirim', productName: 'Safwan Al Quran ASPTJA5PK,3B, Ukuran A5 (Sedang)', variation: 'Pink A5', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 }
        ]
      },
      tiktokAnsan: {
        storeName: 'TikTok Ansan',
        ownerName: 'PT BQY Ansan Pakkawaru',
        platform: 'TikTok Shop',
        orders: [
          { orderId: '587380882353514907', date: '01 Nov 2026', status: 'Perlu dikirim', productName: '[PROMO SPESIAL] Al Quran Super Hitam', variation: 'A5 Hitam', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 69815, net: 129185 },
          { orderId: '587380923442333398', date: '01 Nov 2026', status: 'Perlu dikirim', productName: '[SPESIAL PROMO] Al Quran Super Pink', variation: 'A5 Pink', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 60000, net: 139000 },
          { orderId: '587380944607482661', date: '01 Nov 2026', status: 'Perlu dikirim', productName: 'Buku 10 Menit Paham Ruqyah Syar Default', variation: 'Default', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 90000, net: 109000 },
          { orderId: '587380981825921028', date: '01 Nov 2026', status: 'Perlu dikirim', productName: '[SPESIAL PROMO] Al Quran Super Biru', variation: 'A5 Biru', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 80000, net: 119000 },
          { orderId: '587380994382776999', date: '01 Nov 2026', status: 'Dibatalkan', productName: 'Buku Super Tahsin Belajar Tahsin 1 Hijau', variation: 'Hijau', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 79025, net: 119975 }
        ]
      },
      shopeeAnsan: {
        storeName: 'Shopee Ansan',
        ownerName: 'PT BQY Ansan Pakkawaru',
        platform: 'Shopee',
        orders: [
          { orderId: '25110104VF4MA4', date: '2026-11-01', status: 'Pesanan diterima', productName: 'Al Quran Tadarus ASTDLASHT,3B, Hijau', variation: 'Hijau', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 80000, net: 119000 },
          { orderId: '25110104U019S2', date: '2026-11-01', status: 'Sedang Dikirim', productName: 'Al Quran Hafalan AHKLASBR,3B, Biru, BONUS LENGKAP', variation: 'Biru', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 87580, net: 111420 },
          { orderId: '25110105196272', date: '2026-11-01', status: 'Pesanan diterima', productName: 'Safwan - Al Quran ASPTJA5HT,3B, Hitam A5', variation: 'Hitam A5', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 64100, net: 134900 },
          { orderId: '25110105PTB8M', date: '2026-11-01', status: 'Pesanan diterima', productName: 'Al Quran Besar ASPTJA4HT,3B, Hitam A4 (Besar)', variation: 'Hitam A4', qty: 2, unitPrice: 239000, gross: 478000, sellerDiscount: 58200, net: 419800 }
        ]
      },
      shopeeBasyirah: {
        storeName: 'Shopee Basyirah',
        ownerName: 'PT BQY Ansan Pakkawaru',
        platform: 'Shopee',
        orders: [
          { orderId: '25110104R7VR04', date: '2026-11-01', status: 'Pesanan diterima', productName: 'Al Quran Super ASPTJA5HT,3B, Hitam A5', variation: 'Hitam A5', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 79563, net: 119437 },
          { orderId: '2511010506G4G', date: '2026-11-01', status: 'Sedang Dikirim', productName: 'Buku Super Tahsin BSPTHASHJ,1B, Hijau', variation: 'Hijau', qty: 1, unitPrice: 199000, gross: 199000, sellerDiscount: 84662, net: 114338 },
          { orderId: '25110105NY5P3', date: '2026-11-01', status: 'Batal', productName: 'Al Quran Besar ASPTJA4HT,3B, Hitam', variation: 'Hitam A4', qty: 1, unitPrice: 239000, gross: 239000, sellerDiscount: 59662, net: 179338 },
          { orderId: '25110106024M1', date: '2026-11-01', status: 'Telah Dikirim', productName: 'Al Quran Besar ASPTJA4PK,3B, Pink Ukuran A4', variation: 'Pink A4', qty: 1, unitPrice: 239000, gross: 239000, sellerDiscount: 59662, net: 179338 }
        ]
      }
    },
    amalqu: {
      entityName: 'Yayasan Amalqu Indonesia Peduli',
      targetBulanan: 650000000,
      targetHarian: 21666667,
      realisasi: 145500987,
      capaianPersen: 22.38,
      estimasi: 436502961,
      totalSahabat: 474000,
      totalAmalqu: 145026987,
      records: [
        { tanggal: '01/11/2026', sahabat: 30000, amalqu: 16965713, total: 16995713 },
        { tanggal: '02/11/2026', sahabat: 20000, amalqu: 9925693, total: 9945693 },
        { tanggal: '03/11/2026', sahabat: 10000, amalqu: 19704000, total: 19714000 },
        { tanggal: '04/11/2026', sahabat: 0, amalqu: 16661560, total: 16661560 },
        { tanggal: '05/11/2026', sahabat: 105000, amalqu: 17009200, total: 17114200 },
        { tanggal: '06/11/2026', sahabat: 304000, amalqu: 32716721, total: 33020721 },
        { tanggal: '07/11/2026', sahabat: 0, amalqu: 9703000, total: 9703000 },
        { tanggal: '08/11/2026', sahabat: 5000, amalqu: 7270000, total: 7275000 },
        { tanggal: '09/11/2026', sahabat: 0, amalqu: 8937100, total: 8937100 },
        { tanggal: '10/11/2026', sahabat: 0, amalqu: 6134000, total: 6134000 }
      ]
    },
    latihhobi: {
      entityName: 'PT Teknologi Solusi Pendidikan (Latih Hobi)',
      targetBulanan: 541654000,
      targetHarian: 24620636,
      realisasi: 156395702,
      capaianPersen: 28.87,
      estimasi: 469187106,
      records: [
        { tanggal: '11/1/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 0, target: 0, persentase: 0 },
        { tanggal: '11/2/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 48687937, target: 24620636, persentase: 197.75 },
        { tanggal: '11/3/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 28072550, target: 24620636, persentase: 114.02 },
        { tanggal: '11/4/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 16845437, target: 24620636, persentase: 68.42 },
        { tanggal: '11/5/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 4721223, target: 24620636, persentase: 19.18 },
        { tanggal: '11/6/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 21863730, target: 24620636, persentase: 88.80 },
        { tanggal: '11/7/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 0, target: 0, persentase: 0 },
        { tanggal: '11/8/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 0, target: 0, persentase: 0 },
        { tanggal: '11/9/2026', deskripsi: 'PT Teknologi Solusi Pendidikan (Latih Hobi)', omset: 36204825, target: 24620636, persentase: 147.05 }
      ]
    },
    sjp: {
      entityName: 'CV Selamat Jaya Pakkawaru (SJP)',
      targetBulanan: 1000000000,
      targetHarian: 33333333,
      realisasi: 1500542700,
      capaianPersen: 150.05,
      estimasi: 4501628100,
      records: [
        { no: '1', tanggal: '25-Jul-2026', beratBeli: 79.71, modalBeli: 138480468, beratMasak: 79.71, penjualan: 140533900, untungRugi: 2053432, akumulasi: 2053432, status: 'Selesai' },
        { no: '2', tanggal: '26-Jul-2026', beratBeli: 74.91, modalBeli: 119833000, beratMasak: 74.91, penjualan: 125594000, untungRugi: 5761000, akumulasi: 7814432, status: 'Selesai' },
        { no: '3', tanggal: '27-28 Jul-2026', beratBeli: 88.29, modalBeli: 133179726, beratMasak: 88.29, penjualan: 138946000, untungRugi: 5766274, akumulasi: 13580706, status: 'Selesai' },
        { no: '7', tanggal: '1-Agu-2026', beratBeli: 49.67, modalBeli: 57429900, beratMasak: 49.67, penjualan: 54913000, untungRugi: -2516900, akumulasi: 18769314, status: 'Rugi' },
        { no: '18', tanggal: '14-Agu-2026', beratBeli: 79.93, modalBeli: 134351970, beratMasak: 79.93, penjualan: 128478000, untungRugi: -5873970, akumulasi: 46954640, status: 'Rugi' },
        { no: '21', tanggal: '19-Agu-2026', beratBeli: 100.69, modalBeli: 154562416, beratMasak: 100.69, penjualan: 167355000, untungRugi: 12792584, akumulasi: 66292044, status: 'Selesai' },
        { no: '22', tanggal: '21-Agu-2026', beratBeli: 123.73, modalBeli: 200628665, beratMasak: 123.73, penjualan: 211992000, untungRugi: 11363335, akumulasi: 77655379, status: 'Selesai (21-22/08/26)' },
        { no: '25', tanggal: '26-Agu-2026', beratBeli: 154.19, modalBeli: 261340040, beratMasak: 154.19, penjualan: 255144600, untungRugi: -6195440, akumulasi: 84497155, status: 'Rugi (26-27/08/26)' },
        { no: '28', tanggal: '30-31 Agu-2026', beratBeli: 193.27, modalBeli: 274907530, beratMasak: 193.27, penjualan: 288239600, untungRugi: 13332070, akumulasi: 121905230, status: 'Penjualan di tgl 31' },
        { no: '29', tanggal: '1-Sep-2026', beratBeli: 100.71, modalBeli: 121479500, beratMasak: 100.71, penjualan: 134658600, untungRugi: 13179100, akumulasi: 135084330, status: 'Selesai' }
      ]
    },
    ppm: {
      entityName: 'Pakkawaru Permata Mulia (PPM)',
      targetBulanan: 750000000,
      targetHarian: 25000000,
      realisasi: 1273855100,
      capaianPersen: 169.85,
      estimasi: 3821565300,
      records: [
        { no: '1', tanggal: '5,7,9,10,11-Okt-2026', beratBeli: 60.22, modalBeli: 112568360, beratMasak: 51.38, penjualan: 115605000, untungRugi: 3036640, akumulasi: 3036640, status: 'Penjualan di tgl 12/10' },
        { no: '2', tanggal: '13,14,15,16-Okt-2026', beratBeli: 58.74, modalBeli: 106391260, beratMasak: 48.98, penjualan: 109960100, untungRugi: 3568840, akumulasi: 6605480, status: 'Penjualan di tgl 17/10' },
        { no: '3', tanggal: '18,20,22-Okt-2026', beratBeli: 62.60, modalBeli: 116016500, beratMasak: 52.60, penjualan: 116246000, untungRugi: 229500, akumulasi: 6834980, status: 'Penjualan di tgl 24/10' },
        { no: '4', tanggal: '25,26-Okt-2026', beratBeli: 88.38, modalBeli: 159414000, beratMasak: 74.50, penjualan: 164272500, untungRugi: 4858500, akumulasi: 11693480, status: 'Penjualan di tgl 27/10' },
        { no: '5', tanggal: '27-Okt-2026', beratBeli: 83.29, modalBeli: 153431600, beratMasak: 71.10, penjualan: 157486500, untungRugi: 4054900, akumulasi: 15748380, status: 'Penjualan di tgl 28/10' },
        { no: '6', tanggal: '28-Okt-2026', beratBeli: 96.10, modalBeli: 175486150, beratMasak: 81.48, penjualan: 180478200, untungRugi: 4992050, akumulasi: 20740430, status: 'Penjualan di tgl 29/10' },
        { no: '7', tanggal: '29,30,31 Okt-01 Nov 2026', beratBeli: 164.23, modalBeli: 296739220, beratMasak: 141.10, penjualan: 303365000, untungRugi: 6625780, akumulasi: 27366210, status: 'Penjualan di tgl 02/11' },
        { no: '8', tanggal: '3-Nov-2026', beratBeli: 256.33, modalBeli: 442974980, beratMasak: 202.92, penjualan: 440336400, untungRugi: -2638580, akumulasi: 24727630, status: 'Rugi, Penjualan di tgl 03/11' },
        { no: '9', tanggal: '4-Nov-2026', beratBeli: 145.09, modalBeli: 262441200, beratMasak: 124.30, penjualan: 277189000, untungRugi: 14747800, akumulasi: 39475430, status: 'Penjualan di tgl 05/11' },
        { no: '10', tanggal: '5-Nov-2026', beratBeli: 64.69, modalBeli: 119676500, beratMasak: 54.96, penjualan: 121461600, untungRugi: 1785100, akumulasi: 41260530, status: 'Penjualan di tgl 06/11' },
        { no: '11', tanggal: '10-Nov-2026', beratBeli: 84.02, modalBeli: 123462040, beratMasak: 58.97, penjualan: 131503100, untungRugi: 8041060, akumulasi: 49301590, status: 'Penjualan di tgl 10/11' }
      ]
    }
  };
}

/**
 * ============================================================================
 * HELPER FORMAT RUPIAH & ANIMASI COUNT-UP
 * ============================================================================
 */
function formatIDR(val) {
  const num = Math.round(Number(val) || 0);
  const prefix = num < 0 ? '-Rp' : 'Rp';
  return prefix + Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatCompactIDR(val) {
  const num = Number(val) || 0;
  if (Math.abs(num) >= 1e9) return 'Rp' + (num / 1e9).toFixed(2).replace('.', ',') + ' M';
  if (Math.abs(num) >= 1e6) return 'Rp' + (num / 1e6).toFixed(1).replace('.', ',') + ' Jt';
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

function animateNumber(elId, targetVal, isCurrency = true, suffix = '') {
  const el = document.getElementById(elId);
  if (!el) return;
  const duration = 600;
  const start = performance.now();

  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const cur = targetVal * ease;
    el.textContent = isCurrency ? formatIDR(cur) : cur.toFixed(2).replace('.', ',') + suffix;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/**
 * ============================================================================
 * LIVE SYNC DARI 11 SHEET GOOGLE SPREADSHEET & PUSH KE FIREBASE
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

function parseTikTokBlue(rows, storeName, ownerName) {
  const orders = [];
  rows.forEach(r => {
    const id = String(r[0] || '').trim();
    if (!id || isNaN(Number(id.substring(0, 5)))) return;
    const qty = parseCleanNumber(r[9]);            // Kolom J (Biru)
    const unitPrice = parseCleanNumber(r[11]);     // Kolom L (Biru)
    const subBefore = parseCleanNumber(r[12]);     // Kolom M (Biru)
    const sellerDisc = parseCleanNumber(r[14]);    // Kolom O (Biru)
    const gross = subBefore > 0 ? subBefore : qty * unitPrice;
    if (orders.length < 150) {
      orders.push({
        orderId: id,
        date: 'Nov 2026',
        status: String(r[1] || 'Diproses'),
        productName: String(r[7] || 'Produk Al-Quran'),
        variation: String(r[8] || '-'),
        qty,
        unitPrice,
        gross,
        sellerDiscount: sellerDisc,
        net: gross - sellerDisc
      });
    }
  });
  return { storeName, ownerName, platform: 'TikTok Shop', orders };
}

function parseShopeeBlue(rows, storeName, ownerName) {
  const orders = [];
  rows.forEach(r => {
    const id = String(r[0] || '').trim();
    if (!id || id.toLowerCase().includes('pesanan')) return;
    const unitPrice = parseCleanNumber(r[17]);     // Kolom R (Biru)
    const qty = parseCleanNumber(r[19]);           // Kolom T (Biru)
    const sellerDisc = parseCleanNumber(r[23]);    // Kolom X (Biru)
    const gross = unitPrice * qty;
    if (orders.length < 150) {
      orders.push({
        orderId: id,
        date: String(r[9] || '2026-11-01').substring(0, 10),
        status: String(r[1] || 'Diproses'),
        productName: String(r[14] || 'Produk Al-Quran'),
        variation: String(r[16] || '-'),
        qty,
        unitPrice,
        gross,
        sellerDiscount: sellerDisc,
        net: gross - sellerDisc
      });
    }
  });
  return { storeName, ownerName, platform: 'Shopee', orders };
}

async function syncFromGoogleSheets(manualAlert = false) {
  const badge = document.getElementById('lastSyncText');
  if (badge) badge.textContent = 'Menyinkronkan 11 Sheet...';

  try {
    const id = STATE.sheetId;
    const [ttSafwan, shSafwan, ttAnsan, shAnsan, shBasyirah, amalquRows, latihRows, sjpRows, ppmRows] = await Promise.all([
      fetchSheetGviz(id, 'Tiktok Safwan').catch(() => null),
      fetchSheetGviz(id, 'Shopee Safwan').catch(() => null),
      fetchSheetGviz(id, 'Tiktok Ansan').catch(() => null),
      fetchSheetGviz(id, 'Shopee Ansan').catch(() => null),
      fetchSheetGviz(id, 'Shopee Basyirah').catch(() => null),
      fetchSheetGviz(id, 'Yayasan Amalqu').catch(() => null),
      fetchSheetGviz(id, 'Latih Hobi').catch(() => null),
      fetchSheetGviz(id, 'SJP').catch(() => null),
      fetchSheetGviz(id, 'PPM').catch(() => null)
    ]);

    if (ttSafwan) { const p = parseTikTokBlue(ttSafwan, 'TikTok Safwan', 'PT Safwan Berkah Indonesia'); if (p.orders.length) STATE.db.stores.tiktokSafwan = p; }
    if (shSafwan) { const p = parseShopeeBlue(shSafwan, 'Shopee Safwan', 'PT Safwan Berkah Indonesia'); if (p.orders.length) STATE.db.stores.shopeeSafwan = p; }
    if (ttAnsan) { const p = parseTikTokBlue(ttAnsan, 'TikTok Ansan', 'PT BQY Ansan Pakkawaru'); if (p.orders.length) STATE.db.stores.tiktokAnsan = p; }
    if (shAnsan) { const p = parseShopeeBlue(shAnsan, 'Shopee Ansan', 'PT BQY Ansan Pakkawaru'); if (p.orders.length) STATE.db.stores.shopeeAnsan = p; }
    if (shBasyirah) { const p = parseShopeeBlue(shBasyirah, 'Shopee Basyirah', 'PT BQY Ansan Pakkawaru'); if (p.orders.length) STATE.db.stores.shopeeBasyirah = p; }

    if (amalquRows && amalquRows.length > 1) {
      const list = [];
      let sSahabat = 0, sAmalqu = 0, sTot = 0;
      amalquRows.forEach(r => {
        const t = String(r[0] || '').trim();
        if (!t.includes('/')) return;
        const sh = parseCleanNumber(r[1]), am = parseCleanNumber(r[2]), tot = parseCleanNumber(r[3]);
        if (sh > 0 || am > 0 || tot > 0) {
          sSahabat += sh; sAmalqu += am; sTot += tot;
          list.push({ tanggal: t, sahabat: sh, amalqu: am, total: tot });
        }
      });
      if (list.length) {
        STATE.db.amalqu.records = list;
        STATE.db.amalqu.totalSahabat = sSahabat;
        STATE.db.amalqu.totalAmalqu = sAmalqu;
        STATE.db.amalqu.realisasi = sTot;
      }
    }

    if (latihRows && latihRows.length > 1) {
      const list = [];
      let sOmset = 0;
      latihRows.forEach(r => {
        const t = String(r[0] || '').trim();
        if (!t || t.toLowerCase() === 'tanggal') return;
        const omset = parseCleanNumber(r[2]), target = parseCleanNumber(r[3]), pct = parseCleanNumber(r[4]);
        sOmset += omset;
        list.push({ tanggal: t, deskripsi: String(r[1] || ''), omset, target, persentase: pct });
      });
      if (list.length) {
        STATE.db.latihhobi.records = list;
        STATE.db.latihhobi.realisasi = sOmset;
      }
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
    if (showAlert) alert('Database Pakkawaru Group berhasil disinkronkan ke Firebase!');
  } catch (err) {
    if (showAlert) alert('Gagal push ke Firebase: ' + err.message);
  }
}

/**
 * ============================================================================
 * CONTROLLER RENDER 7 TAB MANDIRI PAKKAWARU GROUP
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
  } else if (tab === 'safwan') {
    storeSwitch.classList.remove('hidden');
    renderEcommerceEntityTab('safwan');
  } else if (tab === 'ansan') {
    storeSwitch.classList.remove('hidden');
    renderEcommerceEntityTab('ansan');
  } else if (tab === 'amalqu') {
    renderAmalquTab();
  } else if (tab === 'latihhobi') {
    renderLatihHobiTab();
  } else if (tab === 'sjp') {
    renderGoldEntityTab('sjp');
  } else if (tab === 'ppm') {
    renderGoldEntityTab('ppm');
  }
}

/**
 * 1. RENDER TAB HOLDING & REGIONAL (TARGET OMSET + DASHBOARD WILAYAH)
 */
function renderHoldingTab() {
  const h = STATE.db.holding;
  const area = STATE.holdingArea;

  document.getElementById('entityRegionBadge').textContent = 'HOLDING CONSOLIDATION • BANDUNG & GORONTALO';
  document.getElementById('currentPageTitle').textContent = 'Pakkawaru Group — Holding & Regional';
  document.getElementById('currentPageSubtitle').textContent = 'Konsolidasi Realisasi Omset 6 Entitas Bisnis & Perbandingan Wilayah Operasional';

  let entities = h.entities;
  let kpiReal = h.summary.realisasi;
  let kpiTarget = h.summary.targetBulanan;
  let kpiHarian = h.summary.targetHarian;
  let kpiEst = h.summary.estimasiAkhirBulan;
  let kpiCap = h.summary.capaianPersen;

  if (area === 'Bandung' || area === 'Gorontalo') {
    const reg = h.regional[area];
    entities = h.entities.filter(e => e.area === area);
    kpiReal = reg.realisasi;
    kpiTarget = reg.targetBulanan;
    kpiHarian = reg.targetHarian;
    kpiEst = reg.estimasi;
    kpiCap = reg.capaianPersen;
  }

  updateTopKpis(
    { label: 'Total Realisasi Omset', pill: area === 'all' ? 'Konsolidasi' : area, val: kpiReal, trend: `${kpiCap}% dari target bulanan` },
    { label: 'Target Bulanan', pill: 'Nov 2026', val: kpiTarget, trend: `Target Harian: ${formatIDR(kpiHarian)}` },
    { label: 'Estimasi Akhir Bulan', pill: 'Proyeksi', val: kpiEst, trend: `${entities.length} Entitas Aktif` }
  );

  // Render 2 Kartu Komparasi Wilayah Bandung vs Gorontalo
  const bdg = h.regional.Bandung;
  const gto = h.regional.Gorontalo;
  document.getElementById('contextualCardsContainer').innerHTML = `
    <div class="context-card">
      <div class="context-top">
        <div>
          <div class="context-title">📍 Wilayah Bandung (4 Entitas)</div>
          <div class="context-sub">PT Safwan, PT BQY Ansan, Yayasan Amalqu, Latih Hobi</div>
        </div>
        <span class="status-pill pill-pending">${bdg.capaianPersen}% Target</span>
      </div>
      <div class="context-val">${formatIDR(bdg.realisasi)} <small style="font-size:12px;color:#64748B;font-weight:600;">/ Target ${formatCompactIDR(bdg.targetBulanan)}</small></div>
      <div class="context-bottom">
        <button class="btn-link-detail" onclick="setAreaFilter('Bandung')">Filter Khusus Bandung</button>
        <svg class="spark-svg" viewBox="0 0 120 40">
          <path d="M5,32 Q25,28 45,18 T85,20 T115,8" fill="none" stroke="#4A8CFF" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
    </div>

    <div class="context-card">
      <div class="context-top">
        <div>
          <div class="context-title">📍 Wilayah Gorontalo (2 Entitas Emas)</div>
          <div class="context-sub">CV Selamat Jaya Pakkawaru (SJP) & Pakkawaru Permata Mulia (PPM)</div>
        </div>
        <span class="status-pill pill-approved">${gto.capaianPersen}% Tercapai</span>
      </div>
      <div class="context-val">${formatIDR(gto.realisasi)} <small style="font-size:12px;color:#64748B;font-weight:600;">/ Target ${formatCompactIDR(gto.targetBulanan)}</small></div>
      <div class="context-bottom">
        <button class="btn-link-detail" onclick="setAreaFilter('Gorontalo')">Filter Khusus Gorontalo</button>
        <svg class="spark-svg" viewBox="0 0 120 40">
          <path d="M5,34 Q30,28 55,14 T90,10 T115,4" fill="none" stroke="#2ED47A" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
  `;

  // Grafik Batang Utama
  if (STATE.holdingChartMode === 'ecommerce') {
    document.getElementById('mainChartTitle').textContent = 'Performa 5 Toko E-Commerce (Omset Kotor vs Omset Bersih)';
    drawBarChart(
      h.ecommerceChannels.map(c => c.channel),
      h.ecommerceChannels.map(c => c.gross),
      h.ecommerceChannels.map(c => c.net),
      'Omset Kotor (Gross)',
      'Omset Bersih (Net)'
    );
  } else if (STATE.holdingChartMode === 'regional') {
    document.getElementById('mainChartTitle').textContent = 'Perbandingan Target vs Realisasi per Wilayah (November 2026)';
    drawBarChart(
      ['Wilayah Bandung', 'Wilayah Gorontalo'],
      [bdg.targetBulanan, gto.targetBulanan],
      [bdg.realisasi, gto.realisasi],
      'Target Wilayah',
      'Realisasi Wilayah'
    );
  } else {
    document.getElementById('mainChartTitle').textContent = 'Target Bulanan vs Realisasi Aktual per Entitas';
    drawBarChart(
      entities.map(e => shortEntity(e.entitas)),
      entities.map(e => e.targetBulanan),
      entities.map(e => e.realisasi),
      'Target Bulanan',
      'Realisasi Aktual'
    );
  }

  // Donut Chart Kanan
  document.getElementById('donutChartTitle').textContent = 'Porsi Realisasi Entitas';
  drawDonutChart(
    entities.map(e => shortEntity(e.entitas)),
    entities.map(e => e.realisasi),
    kpiCap + '%',
    formatCompactIDR(kpiReal)
  );

  // Tabel Utama: 6 Entitas
  document.getElementById('mainTableTitle').textContent = `Matriks Performa Entitas (${area === 'all' ? 'Seluruh Wilayah' : 'Wilayah ' + area})`;
  const q = STATE.searchQuery.toLowerCase();
  const filtered = entities.filter(e => !q || e.entitas.toLowerCase().includes(q) || e.area.toLowerCase().includes(q));

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>Entitas Bisnis</th>
      <th>Wilayah</th>
      <th>Target Bulanan</th>
      <th>Realisasi Aktual</th>
      <th>% Capaian</th>
      <th>Estimasi Akhir Bulan</th>
      <th>Status</th>
      <th>Navigasi & Audit</th>
    </tr>
  `;

  document.getElementById('mainTableBody').innerHTML = filtered.map(e => {
    const pill = e.persentase >= 100 ? 'pill-approved' : 'pill-pending';
    const payload = encodePayload(e.entitas, `Wilayah ${e.area} • ${e.kategori}`, e.status, {
      'Target Bulanan': formatIDR(e.targetBulanan),
      'Target Harian': formatIDR(e.targetHarian),
      'Realisasi Aktual': formatIDR(e.realisasi),
      'Persentase Capaian': e.persentase + '%',
      'Estimasi Akhir Bulan': formatIDR(e.estimasi)
    });

    return `
      <tr>
        <td>
          <div class="entity-cell">
            <div class="entity-badge-icon">${shortEntity(e.entitas).substring(0, 2).toUpperCase()}</div>
            <div>
              <span class="entity-title">${e.entitas}</span>
              <span class="entity-sub">${e.kategori}</span>
            </div>
          </div>
        </td>
        <td><strong>${e.area}</strong></td>
        <td>${formatIDR(e.targetBulanan)}</td>
        <td><strong>${formatIDR(e.realisasi)}</strong></td>
        <td><strong>${e.persentase}%</strong></td>
        <td>${formatIDR(e.estimasi)}</td>
        <td><span class="status-pill ${pill}">${e.status}</span></td>
        <td>
          <button class="btn-table-review" onclick="openReviewModal('${payload}')">Review</button>
          <button class="btn-table-action" onclick="switchToTab('${e.tabKey}')">Buka Unit →</button>
        </td>
      </tr>
    `;
  }).join('');
  document.getElementById('mainTablePagination').innerHTML = '';

  // Tabel Kedua: Konsolidasi 5 Toko E-Commerce
  document.getElementById('secondaryTableHead').innerHTML = `
    <tr>
      <th>Channel / Toko</th>
      <th>Entitas Pemilik</th>
      <th>Qty Terjual</th>
      <th>Omset Kotor (Gross)</th>
      <th>Diskon Penjual</th>
      <th>Omset Bersih (Net)</th>
      <th>Selesai / Proses / Batal</th>
      <th>Buka Toko</th>
    </tr>
  `;

  document.getElementById('secondaryTableBody').innerHTML = h.ecommerceChannels.map(c => `
    <tr>
      <td><strong>${c.channel}</strong></td>
      <td>${c.pemilik}</td>
      <td>${c.qty.toLocaleString('id-ID')} Pcs</td>
      <td>${formatIDR(c.gross)}</td>
      <td style="color:#F43F5E;">-${formatIDR(c.diskonPenjual)}</td>
      <td><strong>${formatIDR(c.net)}</strong></td>
      <td>
        <span class="status-pill pill-approved">${c.selesai}</span>
        <span class="status-pill pill-pending">${c.diproses}</span>
        <span class="status-pill pill-danger">${c.dibatalkan} (${c.batalPersen}%)</span>
      </td>
      <td>
        <button class="btn-table-action" onclick="jumpToStore('${c.parentTab}', '${c.key}')">Detail Toko →</button>
      </td>
    </tr>
  `).join('');

  // Panel Kanan
  document.getElementById('rightSideDynamicBoxes').innerHTML = `
    <div class="mini-metric-card">
      <div class="mm-header"><span>Total Konsolidasi E-Commerce</span><span class="mm-tag">5 Toko</span></div>
      <div class="mm-highlight blue-text">Rp1.182.425.388</div>
      <div class="mm-footer">
        <div><small>Gross (Kolom Biru)</small><strong>Rp1.734.043.472</strong></div>
        <div><small>Total Qty</small><strong>7.916 Pcs</strong></div>
        <span style="color:#10B981;font-weight:700;">8.685 Order</span>
      </div>
    </div>
    <div class="mini-metric-card">
      <div class="mm-header"><span>Total Konsolidasi Emas Gorontalo</span><span class="mm-tag">SJP & PPM</span></div>
      <div class="mm-highlight green-text">Rp2.774.397.800</div>
      <div class="mm-footer">
        <div><small>CV SJP</small><strong>Rp1,50 M</strong></div>
        <div><small>PPM</small><strong>Rp1,27 M</strong></div>
        <span style="color:#10B981;font-weight:700;">▲ 158,54%</span>
      </div>
    </div>
  `;
}

/**
 * 2. RENDER TAB ENTITAS E-COMMERCE: PT SAFWAN BERKAH & PT BQY ANSAN (KHUSUS KOLOM BIRU)
 */
function renderEcommerceEntityTab(mode) {
  const isSafwan = mode === 'safwan';
  const entInfo = STATE.db.holding.entities.find(e => e.tabKey === mode);
  const storeKeys = isSafwan ? ['tiktokSafwan', 'shopeeSafwan'] : ['tiktokAnsan', 'shopeeAnsan', 'shopeeBasyirah'];
  const activeStore = isSafwan ? STATE.safwanStore : STATE.ansanStore;

  document.getElementById('entityRegionBadge').textContent = `WILAYAH BANDUNG • ${isSafwan ? '2 TOKO E-COMMERCE' : '3 TOKO E-COMMERCE'} (FILTER KOLOM BIRU)`;
  document.getElementById('currentPageTitle').textContent = entInfo.entitas;
  document.getElementById('currentPageSubtitle').textContent = `Target Bulanan: ${formatIDR(entInfo.targetBulanan)} • Realisasi Bersih (Net): ${formatIDR(entInfo.realisasi)} (${entInfo.persentase}%)`;

  // Render Tombol Sub-Switch Toko
  const switchEl = document.getElementById('storeSubSwitch');
  const buttons = [
    { key: 'all', label: isSafwan ? 'Semua Toko Safwan (2)' : 'Semua Toko Ansan (3)' },
    ...storeKeys.map(k => ({ key: k, label: STATE.db.stores[k].storeName }))
  ];
  switchEl.innerHTML = buttons.map(b => `
    <button class="sub-pill ${activeStore === b.key ? 'active' : ''}" onclick="selectEntityStore('${mode}', '${b.key}')">${b.label}</button>
  `).join('');

  // Ambil daftar channel summary
  const chList = STATE.db.holding.ecommerceChannels.filter(c =>
    c.parentTab === mode && (activeStore === 'all' || c.key === activeStore)
  );

  const sumNet = chList.reduce((a, b) => a + b.net, 0);
  const sumGross = chList.reduce((a, b) => a + b.gross, 0);
  const sumDisc = chList.reduce((a, b) => a + b.diskonPenjual, 0);
  const sumQty = chList.reduce((a, b) => a + b.qty, 0);
  const sumSelesai = chList.reduce((a, b) => a + b.selesai, 0);
  const sumProses = chList.reduce((a, b) => a + b.diproses, 0);
  const sumBatal = chList.reduce((a, b) => a + b.dibatalkan, 0);
  const sumBaris = chList.reduce((a, b) => a + b.totalBaris, 0);

  updateTopKpis(
    { label: 'Omset Bersih (Net)', pill: 'Kolom Biru', val: sumNet, trend: `${sumQty.toLocaleString('id-ID')} Pcs Terjual` },
    { label: 'Omset Kotor (Gross)', pill: 'Sebelum Diskon', val: sumGross, trend: `Target PT: ${formatCompactIDR(entInfo.targetBulanan)}` },
    { label: 'Total Diskon Penjual', pill: 'Subsidi Toko', val: sumDisc, trend: `${((sumDisc / (sumGross || 1)) * 100).toFixed(1)}% dari Omset Gross` }
  );

  // 3 Kartu Audit Volume & Status Pesanan
  document.getElementById('contextualCardsContainer').innerHTML = `
    <div class="context-card">
      <div class="context-top">
        <div><div class="context-title">✅ Pesanan Selesai / Terkirim</div><div class="context-sub">Transaksi tuntas terverifikasi</div></div>
        <span class="status-pill pill-approved">Verified</span>
      </div>
      <div class="context-val">${sumSelesai.toLocaleString('id-ID')} Pesanan</div>
    </div>
    <div class="context-card">
      <div class="context-top">
        <div><div class="context-title">🚚 Pesanan Sedang Diproses</div><div class="context-sub">Perlu dikirim / sedang berjalan</div></div>
        <span class="status-pill pill-pending">In Transit</span>
      </div>
      <div class="context-val">${sumProses.toLocaleString('id-ID')} Pesanan</div>
    </div>
    <div class="context-card">
      <div class="context-top">
        <div><div class="context-title">⚠️ Pesanan Dibatalkan</div><div class="context-sub">Dari total ${sumBaris.toLocaleString('id-ID')} baris pesanan</div></div>
        <span class="status-pill pill-danger">${((sumBatal / (sumBaris || 1)) * 100).toFixed(2)}% Batal</span>
      </div>
      <div class="context-val">${sumBatal.toLocaleString('id-ID')} Pesanan</div>
    </div>
  `;

  // Gabungkan pesanan dari toko yang dipilih
  let orders = [];
  storeKeys.forEach(k => {
    if (activeStore === 'all' || activeStore === k) {
      const st = STATE.db.stores[k];
      st.orders.forEach(o => orders.push({ ...o, storeName: st.storeName }));
    }
  });

  // Grafik Batang: Perbandingan Toko atau Top Order
  if (activeStore === 'all') {
    document.getElementById('mainChartTitle').textContent = `Perbandingan Omset Kotor vs Bersih (${entInfo.entitas})`;
    drawBarChart(
      chList.map(c => c.channel),
      chList.map(c => c.gross),
      chList.map(c => c.net),
      'Omset Kotor (Kolom Biru)',
      'Omset Bersih (Net)'
    );
  } else {
    document.getElementById('mainChartTitle').textContent = `Rincian Gross vs Net Sample Transaksi (${STATE.db.stores[activeStore].storeName})`;
    drawBarChart(
      orders.slice(0, 7).map(o => '#' + o.orderId.slice(-6)),
      orders.slice(0, 7).map(o => o.gross),
      orders.slice(0, 7).map(o => o.net),
      'Gross (Kolom Biru)',
      'Net (Setelah Diskon Penjual)'
    );
  }

  // Donut Chart Kanan
  document.getElementById('donutChartTitle').textContent = activeStore === 'all' ? 'Porsi Omset per Toko' : 'Komposisi Status Order';
  if (activeStore === 'all') {
    drawDonutChart(
      chList.map(c => c.channel),
      chList.map(c => c.net),
      entInfo.persentase + '%',
      formatCompactIDR(sumNet)
    );
  } else {
    drawDonutChart(
      ['Selesai', 'Diproses', 'Dibatalkan'],
      [sumSelesai, sumProses, sumBatal],
      (100 - (sumBatal / (sumBaris || 1)) * 100).toFixed(1) + '%',
      sumBaris + ' Baris'
    );
  }

  // Tabel Rincian Transaksi Kolom Biru dengan Paginasi
  document.getElementById('mainTableTitle').textContent = `Daftar Transaksi Kolom Biru (${activeStore === 'all' ? 'Seluruh Toko ' + shortEntity(entInfo.entitas) : STATE.db.stores[activeStore].storeName})`;
  const q = STATE.searchQuery.toLowerCase();
  const filtered = orders.filter(o => !q || o.orderId.toLowerCase().includes(q) || o.productName.toLowerCase().includes(q) || o.storeName.toLowerCase().includes(q));

  const pageItems = paginateRows(filtered);

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>Toko & Order ID</th>
      <th>Produk & Variasi</th>
      <th>Qty (Biru)</th>
      <th>Harga Awal (Biru)</th>
      <th>Diskon Penjual (Biru)</th>
      <th>Subtotal Net</th>
      <th>Status</th>
      <th>Audit</th>
    </tr>
  `;

  document.getElementById('mainTableBody').innerHTML = pageItems.map(o => {
    const isCancel = o.status.toLowerCase().includes('batal');
    const pill = isCancel ? 'pill-danger' : o.status.toLowerCase().includes('terima') || o.status.toLowerCase().includes('selesai') ? 'pill-approved' : 'pill-pending';
    const payload = encodePayload(`Order #${o.orderId}`, `${o.storeName} • ${entInfo.entitas}`, o.status, {
      'Nama Produk': o.productName,
      'Variasi': o.variation,
      'Qty (Kolom Biru)': o.qty + ' Pcs',
      'Harga Awal (Kolom Biru)': formatIDR(o.unitPrice),
      'Subtotal Gross (Kolom Biru)': formatIDR(o.gross),
      'Diskon Penjual (Kolom Biru)': formatIDR(o.sellerDiscount),
      'Net Diterima Toko': formatIDR(o.net)
    });

    return `
      <tr>
        <td>
          <span class="entity-title">#${o.orderId}</span>
          <span class="entity-sub">${o.storeName}</span>
        </td>
        <td>
          <span class="entity-title">${o.productName.substring(0, 38)}</span>
          <span class="entity-sub">${o.variation}</span>
        </td>
        <td><strong>${o.qty}</strong></td>
        <td>${formatIDR(o.unitPrice)}</td>
        <td style="color:#F43F5E;">-${formatIDR(o.sellerDiscount)}</td>
        <td><strong>${formatIDR(o.net)}</strong></td>
        <td><span class="status-pill ${pill}">${o.status.substring(0, 18)}</span></td>
        <td>
          <button class="btn-table-review" onclick="openReviewModal('${payload}')">Review</button>
          <button class="btn-table-action" onclick="openActionModal('${payload}')">Action</button>
        </td>
      </tr>
    `;
  }).join('');

  // Panel Kanan
  document.getElementById('rightSideDynamicBoxes').innerHTML = chList.map(c => `
    <div class="mini-metric-card">
      <div class="mm-header"><span>${c.channel}</span><span class="mm-tag">${c.qty} Pcs</span></div>
      <div class="mm-highlight blue-text">${formatIDR(c.net)}</div>
      <div class="mm-footer">
        <div><small>Gross (Biru)</small><strong>${formatCompactIDR(c.gross)}</strong></div>
        <div><small>Diskon (Biru)</small><strong style="color:#F43F5E;">-${formatCompactIDR(c.diskonPenjual)}</strong></div>
      </div>
    </div>
  `).join('');
}

/**
 * 3. RENDER TAB YAYASAN AMALQU INDONESIA PEDULI
 */
function renderAmalquTab() {
  const y = STATE.db.amalqu;
  document.getElementById('entityRegionBadge').textContent = 'WILAYAH BANDUNG • FILANTROPI & WAKAF AL-QURAN';
  document.getElementById('currentPageTitle').textContent = y.entityName;
  document.getElementById('currentPageSubtitle').textContent = 'Rekapitulasi Penerimaan Harian Program Sahabat Berbagi & Yayasan AmalQu';

  updateTopKpis(
    { label: 'Total Donasi Terkumpul', pill: 'Nov 2026', val: y.realisasi, trend: `${y.capaianPersen}% dari Target Rp650 Jt` },
    { label: 'Kanal Yayasan AmalQu', pill: 'Utama', val: y.totalAmalqu, trend: `99,67% Kontribusi Utama` },
    { label: 'Kanal Sahabat Berbagi', pill: ' Afiliasi', val: y.totalSahabat, trend: `Estimasi Akhir: ${formatCompactIDR(y.estimasi)}` }
  );

  const maxDay = [...y.records].sort((a, b) => b.total - a.total)[0];
  document.getElementById('contextualCardsContainer').innerHTML = `
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">🏆 Puncak Penerimaan Harian</div><div class="context-sub">Tanggal ${maxDay.tanggal}</div></div><span class="status-pill pill-approved">Tertinggi</span></div>
      <div class="context-val">${formatIDR(maxDay.total)}</div>
    </div>
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">📊 Rata-Rata Donasi Harian</div><div class="context-sub">Dari ${y.records.length} hari berjalan</div></div><span class="status-pill pill-pending">Run-rate</span></div>
      <div class="context-val">${formatIDR(y.realisasi / (y.records.length || 1))} / hari</div>
    </div>
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">🎯 Target Harian Yayasan</div><div class="context-sub">Patokan menuju Rp650 Juta/bulan</div></div><span class="status-pill pill-delivered">Target</span></div>
      <div class="context-val">${formatIDR(y.targetHarian)} / hari</div>
    </div>
  `;

  document.getElementById('mainChartTitle').textContent = 'Tren Perolehan Donasi Harian (1 – 10 November 2026)';
  drawBarChart(
    y.records.map(r => r.tanggal.substring(0, 5)),
    y.records.map(() => y.targetHarian),
    y.records.map(r => r.total),
    'Target Harian (Rp21,66 Jt)',
    'Realisasi Donasi Harian'
  );

  document.getElementById('donutChartTitle').textContent = 'Proporsi Capaian Target';
  drawDonutChart(
    ['Yayasan AmalQu', 'Sahabat Berbagi', 'Sisa Target November'],
    [y.totalAmalqu, y.totalSahabat, Math.max(0, y.targetBulanan - y.realisasi)],
    y.capaianPersen + '%',
    formatCompactIDR(y.realisasi)
  );

  document.getElementById('mainTableTitle').textContent = 'Tabel Rincian Penerimaan Harian Yayasan Amalqu';
  const filtered = y.records.filter(r => !STATE.searchQuery || r.tanggal.includes(STATE.searchQuery));
  const pageItems = paginateRows(filtered);

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>Tanggal</th>
      <th>Sahabat Berbagi</th>
      <th>AmalQu</th>
      <th>Total Keseluruhan</th>
      <th>Vs Target Harian</th>
      <th>Audit</th>
    </tr>
  `;

  document.getElementById('mainTableBody').innerHTML = pageItems.map(r => {
    const pct = ((r.total / y.targetHarian) * 100).toFixed(1);
    const pill = r.total >= y.targetHarian ? 'pill-approved' : 'pill-pending';
    const payload = encodePayload(`Donasi ${r.tanggal}`, y.entityName, pct + '% Target Harian', {
      'Sahabat Berbagi': formatIDR(r.sahabat),
      'AmalQu': formatIDR(r.amalqu),
      'Total Keseluruhan': formatIDR(r.total),
      'Target Harian': formatIDR(y.targetHarian)
    });
    return `
      <tr>
        <td><strong>${r.tanggal}</strong></td>
        <td>${formatIDR(r.sahabat)}</td>
        <td>${formatIDR(r.amalqu)}</td>
        <td><strong>${formatIDR(r.total)}</strong></td>
        <td><span class="status-pill ${pill}">${pct}%</span></td>
        <td>
          <button class="btn-table-review" onclick="openReviewModal('${payload}')">Review</button>
          <button class="btn-table-action" onclick="openActionModal('${payload}')">Action</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('rightSideDynamicBoxes').innerHTML = `
    <div class="mini-metric-card">
      <div class="mm-header"><span>Proyeksi Akhir Bulan</span><span class="mm-tag">AmalQu</span></div>
      <div class="mm-highlight green-text">${formatIDR(y.estimasi)}</div>
      <div class="mm-footer"><div><small>Target Bulanan</small><strong>${formatIDR(y.targetBulanan)}</strong></div></div>
    </div>
  `;
}

/**
 * 4. RENDER TAB LATIH HOBI (PT TEKNOLOGI SOLUSI PENDIDIKAN)
 */
function renderLatihHobiTab() {
  const lh = STATE.db.latihhobi;
  document.getElementById('entityRegionBadge').textContent = 'WILAYAH BANDUNG • EDUKASI & PELATIHAN';
  document.getElementById('currentPageTitle').textContent = lh.entityName;
  document.getElementById('currentPageSubtitle').textContent = 'Monitoring Omset Harian vs Target Harian (Rp24.620.636)';

  updateTopKpis(
    { label: 'Realisasi Omset', pill: 'Latih Hobi', val: lh.realisasi, trend: `${lh.capaianPersen}% dari Target Bulanan` },
    { label: 'Target Bulanan', pill: 'Nov 2026', val: lh.targetBulanan, trend: `Target Harian: ${formatIDR(lh.targetHarian)}` },
    { label: 'Estimasi Akhir Bulan', pill: 'Proyeksi', val: lh.estimasi, trend: `Rekor Tertinggi: 197,75% (2 Nov)` }
  );

  const activeDays = lh.records.filter(r => r.omset > 0);
  document.getElementById('contextualCardsContainer').innerHTML = `
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">🚀 Capaian Harian Tertinggi</div><div class="context-sub">Tanggal 11/2/2026</div></div><span class="status-pill pill-approved">197,75%</span></div>
      <div class="context-val">Rp48.687.937</div>
    </div>
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">📅 Hari Operasional Aktif</div><div class="context-sub">Hari dengan omset tercatat</div></div><span class="status-pill pill-pending">${activeDays.length} Hari</span></div>
      <div class="context-val">Rata-rata ${formatIDR(lh.realisasi / (activeDays.length || 1))}</div>
    </div>
  `;

  document.getElementById('mainChartTitle').textContent = 'Perbandingan Target Harian vs Realisasi Omset Latih Hobi';
  drawBarChart(
    lh.records.map(r => r.tanggal),
    lh.records.map(r => r.target),
    lh.records.map(r => r.omset),
    'Target Harian',
    'Omset Aktual'
  );

  document.getElementById('donutChartTitle').textContent = 'Distribusi Omset per Tanggal';
  drawDonutChart(
    activeDays.map(r => r.tanggal),
    activeDays.map(r => r.omset),
    lh.capaianPersen + '%',
    formatCompactIDR(lh.realisasi)
  );

  document.getElementById('mainTableTitle').textContent = 'Rekapitulasi Harian PT Teknologi Solusi Pendidikan (Latih Hobi)';
  const pageItems = paginateRows(lh.records);

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>Tanggal</th>
      <th>Deskripsi Entitas</th>
      <th>Omset Aktual</th>
      <th>Target Harian</th>
      <th>Persentase</th>
      <th>Audit</th>
    </tr>
  `;

  document.getElementById('mainTableBody').innerHTML = pageItems.map(r => {
    const pill = r.persentase >= 100 ? 'pill-approved' : r.omset === 0 ? 'pill-delivered' : 'pill-pending';
    const payload = encodePayload(`Latih Hobi (${r.tanggal})`, r.deskripsi, r.persentase + '% Target', {
      'Omset Harian': formatIDR(r.omset),
      'Target Harian': formatIDR(r.target),
      'Persentase Capaian': r.persentase + '%'
    });
    return `
      <tr>
        <td><strong>${r.tanggal}</strong></td>
        <td>${r.deskripsi}</td>
        <td><strong>${formatIDR(r.omset)}</strong></td>
        <td>${formatIDR(r.target)}</td>
        <td><span class="status-pill ${pill}">${r.persentase}%</span></td>
        <td>
          <button class="btn-table-review" onclick="openReviewModal('${payload}')">Review</button>
          <button class="btn-table-action" onclick="openActionModal('${payload}')">Action</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('rightSideDynamicBoxes').innerHTML = `
    <div class="mini-metric-card">
      <div class="mm-header"><span>Sisa Target Bulanan</span><span class="mm-tag">Nov 2026</span></div>
      <div class="mm-highlight blue-text">${formatIDR(lh.targetBulanan - lh.realisasi)}</div>
    </div>
  `;
}

/**
 * 5. RENDER TAB ENTITAS EMAS GORONTALO: CV SJP & PPM
 */
function renderGoldEntityTab(key) {
  const g = STATE.db[key];
  document.getElementById('entityRegionBadge').textContent = 'WILAYAH GORONTALO • DIVISI PERDAGANGAN & PENGOLAHAN EMAS';
  document.getElementById('currentPageTitle').textContent = g.entityName;
  document.getElementById('currentPageSubtitle').textContent = `Target Bulanan: ${formatIDR(g.targetBulanan)} • Realisasi: ${formatIDR(g.realisasi)} (${g.capaianPersen}% — TERCAPAI)`;

  const sumGramBeli = g.records.reduce((a, b) => a + b.beratBeli, 0);
  const sumGramMasak = g.records.reduce((a, b) => a + (b.beratMasak || b.beratBeli), 0);
  const lastAccum = g.records.length ? g.records[g.records.length - 1].akumulasi : 0;

  updateTopKpis(
    { label: 'Realisasi Penjualan Emas', pill: 'Nov 2026', val: g.realisasi, trend: `▲ ${g.capaianPersen}% dari Target (${formatCompactIDR(g.targetBulanan)})` },
    { label: 'Akumulasi Laba Bersih', pill: 'Jumlah Kas', val: lastAccum, trend: `Dari ${g.records.length} Batch Tercatat` },
    { label: 'Estimasi Akhir Bulan', pill: 'Proyeksi', val: g.estimasi, trend: `Melampaui Target Bulanan` }
  );

  const lossBatches = g.records.filter(r => r.untungRugi < 0);
  document.getElementById('contextualCardsContainer').innerHTML = `
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">⚖️ Total Gramasi Pembelian</div><div class="context-sub">Akumulasi berat emas mentah</div></div><span class="status-pill pill-pending">Input</span></div>
      <div class="context-val">${sumGramBeli.toFixed(2).replace('.', ',')} Gram</div>
    </div>
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">🔥 Emas Sudah Dimasak</div><div class="context-sub">Gramasi siap jual</div></div><span class="status-pill pill-approved">Output</span></div>
      <div class="context-val">${sumGramMasak.toFixed(2).replace('.', ',')} Gram</div>
    </div>
    <div class="context-card">
      <div class="context-top"><div><div class="context-title">🔍 Audit Batch Rugi</div><div class="context-sub">Transaksi selisih negatif</div></div><span class="status-pill ${lossBatches.length ? 'pill-danger' : 'pill-approved'}">${lossBatches.length} Batch</span></div>
      <div class="context-val">${lossBatches.length ? formatIDR(lossBatches.reduce((a, b) => a + b.untungRugi, 0)) : 'Rp0 (Nihil)'}</div>
    </div>
  `;

  document.getElementById('mainChartTitle').textContent = `Modal Pembelian vs Nilai Penjualan Emas per Batch (${g.entityName})`;
  drawBarChart(
    g.records.map(r => r.tanggal.substring(0, 12)),
    g.records.map(r => r.modalBeli),
    g.records.map(r => r.penjualan),
    'Modal Pembelian',
    'Nilai Penjualan'
  );

  document.getElementById('donutChartTitle').textContent = 'Target vs Realisasi Aktual';
  drawDonutChart(
    ['Realisasi Penjualan', 'Target Bulanan'],
    [g.realisasi, g.targetBulanan],
    g.capaianPersen + '%',
    formatCompactIDR(g.realisasi)
  );

  document.getElementById('mainTableTitle').textContent = `Rekapitulasi Pembelian & Penjualan Emas — ${g.entityName}`;
  const q = STATE.searchQuery.toLowerCase();
  const filtered = g.records.filter(r => !q || r.tanggal.toLowerCase().includes(q) || r.status.toLowerCase().includes(q));
  const pageItems = paginateRows(filtered);

  document.getElementById('mainTableHead').innerHTML = `
    <tr>
      <th>No & Tanggal</th>
      <th>Berat Beli (gr)</th>
      <th>Modal Pembelian</th>
      <th>Berat Masak (gr)</th>
      <th>Nilai Penjualan</th>
      <th>Untung / (Rugi)</th>
      <th>Akumulasi</th>
      <th>Status & Audit</th>
    </tr>
  `;

  document.getElementById('mainTableBody').innerHTML = pageItems.map(r => {
    const isLoss = r.untungRugi < 0;
    const pill = isLoss ? 'pill-danger' : 'pill-approved';
    const payload = encodePayload(`Batch #${r.no} (${r.tanggal})`, g.entityName, r.status, {
      'Berat Beli': r.beratBeli + ' gr',
      'Modal Pembelian': formatIDR(r.modalBeli),
      'Berat Masak': (r.beratMasak || r.beratBeli) + ' gr',
      'Nilai Penjualan': formatIDR(r.penjualan),
      'Untung / (Rugi)': formatIDR(r.untungRugi),
      'Akumulasi Jumlah': formatIDR(r.akumulasi)
    });

    return `
      <tr>
        <td><strong>#${r.no}</strong> • ${r.tanggal}</td>
        <td>${r.beratBeli} gr</td>
        <td>${formatIDR(r.modalBeli)}</td>
        <td>${r.beratMasak || r.beratBeli} gr</td>
        <td><strong>${formatIDR(r.penjualan)}</strong></td>
        <td style="color:${isLoss ? '#F43F5E' : '#10B981'};font-weight:800;">${formatIDR(r.untungRugi)}</td>
        <td><strong>${formatIDR(r.akumulasi)}</strong></td>
        <td>
          <span class="status-pill ${pill}" style="margin-right:6px;">${r.status}</span>
          <button class="btn-table-review" onclick="openReviewModal('${payload}')">Review</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('rightSideDynamicBoxes').innerHTML = `
    <div class="mini-metric-card">
      <div class="mm-header"><span>Status Target Bulanan</span><span class="mm-tag">Gorontalo</span></div>
      <div class="mm-highlight green-text">TERCAPAI (${g.capaianPersen}%)</div>
      <div class="mm-footer">
        <div><small>Surplus Di Atas Target</small><strong>+${formatIDR(g.realisasi - g.targetBulanan)}</strong></div>
      </div>
    </div>
  `;
}

/**
 * ============================================================================
 * KOMPONEN GRAFIK CHART.JS & PAGINASI
 * ============================================================================
 */
function updateTopKpis(k1, k2, k3) {
  document.getElementById('kpi1Label').textContent = k1.label;
  document.getElementById('kpi1Pill').textContent = k1.pill;
  document.getElementById('kpi1TrendText').textContent = k1.trend;
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
        { label: label1, data: data1, backgroundColor: '#4A8CFF', borderRadius: 6, barPercentage: 0.65, categoryPercentage: 0.6 },
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
    .replace('CV Selamat Jaya Pakkawaru', 'CV SJP')
    .replace('Pakkawaru Permata Mulia', 'PPM');
}

function encodePayload(title, sub, status, metrics) {
  return encodeURIComponent(JSON.stringify({ title, sub, status, metrics }));
}

/**
 * ============================================================================
 * GLOBAL INTERACTION HANDLERS (PINDAH TAB, SUB-TOKO, & POP-UP MODAL)
 * ============================================================================
 */
window.switchToTab = function(tabKey) {
  STATE.activeTab = tabKey;
  STATE.tablePage = 1;
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const rows = [['Entitas', 'Wilayah', 'Target Bulanan', 'Realisasi', 'Capaian (%)', 'Estimasi Akhir Bulan']];
  STATE.db.holding.entities.forEach(e => {
    rows.push([e.entitas, e.area, e.targetBulanan, e.realisasi, e.persentase + '%', e.estimasi]);
  });
  const csv = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = encodeURI(csv);
  a.download = `Pakkawaru_Group_${STATE.activeTab}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * INISIALISASI SAAT HALAMAN DIBUKA
 */
document.addEventListener('DOMContentLoaded', () => {
  STATE.db = createInitialDatabase();
  renderDashboard();

  syncFromGoogleSheets(false);
  setInterval(() => syncFromGoogleSheets(false), 60000);

  // Klik 7 Tab Navigasi
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => window.switchToTab(btn.dataset.tab));
  });

  document.getElementById('btnHomeLogo').addEventListener('click', () => window.switchToTab('holding'));

  // Klik Filter Wilayah di Tab Holding
  document.querySelectorAll('#holdingAreaSwitch .sub-pill').forEach(btn => {
    btn.addEventListener('click', () => window.setAreaFilter(btn.dataset.area));
  });

  document.getElementById('holdingChartMode').addEventListener('change', e => {
    STATE.holdingChartMode = e.target.value;
    renderDashboard();
  });

  // Pencarian Global & Lokal
  ['globalSearchInput', 'localTableSearch'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      STATE.searchQuery = e.target.value;
      STATE.tablePage = 1;
      renderDashboard();
    });
  });

  // Tag Pills Interaktif di Modal Review
  document.querySelectorAll('#modalSelectableTags .tag-pill').forEach(tag => {
    tag.addEventListener('click', () => tag.classList.toggle('active'));
  });

  ['btnCloseReviewModal', 'btnCancelReview', 'btnSubmitReview'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('reviewModalBackdrop').classList.add('hidden'));
  });

  ['btnCloseActionModal', 'btnCancelAction', 'btnSubmitAction'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('actionModalBackdrop').classList.add('hidden'));
  });

  // Modal Konfigurasi
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