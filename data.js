/* ============================================================
   DATA UJIAN — SMK Ksatria Bangsa
   Kompetensi Keahlian: Manajemen Perkantoran dan Layanan Bisnis (OTKP)
   Sumber: Naskah STS (Sumatif Tengah Semester) resmi sekolah
   ============================================================ */

const SCHOOL_NAME = "SMK Ksatria Bangsa";
const SCHOOL_PROGRAM = "Manajemen Perkantoran dan Layanan Bisnis";
const DEFAULT_TEACHER = "Rizky Ahmed Darmawan, S.M";
const EXAM_DURATION_MINUTES = 60;
const MAX_EXIT_STRIKES = 3;

/* Bobot penilaian akhir: skor PG dan skor essay masing-masing sudah
   dinormalisasi ke skala 0-100, lalu digabung sesuai bobot berikut
   untuk menghasilkan Nilai Akhir. Ubah nilai ini (harus berjumlah 1)
   bila sekolah ingin bobot PG/essay yang berbeda. */
const MC_WEIGHT = 0.5;
const ESSAY_WEIGHT = 0.5;

/* Struktur kelas -> daftar mapel yang tersedia untuk kelas tsb */
const CLASS_SUBJECT_MAP = {
  "X OTKP": ["Public Speaking"],
  "XI OTKP": ["Digital Marketing", "OTK Kepegawaian"],
  "XII OTKP": ["Digital Marketing"]
};

/* Setiap paket soal diberi id unik "kelas__mapel" */
const EXAMS = {

  /* =====================================================
     DIGITAL MARKETING - KELAS XI OTKP
     ===================================================== */
  "XI OTKP__Digital Marketing": {
    id: "XI OTKP__Digital Marketing",
    kelas: "XI OTKP",
    mapel: "Digital Marketing",
    guru: DEFAULT_TEACHER,
    semester: "Semester 1",
    kisiKisi: "Social media guideline, media sosial, digital marketing, branding, personal branding, kegiatan ekonomi digital, prinsip ekonomi digital, tindakan ekonomi rasional/irasional, motif ekonomi intrinsik/ekstrinsik.",
    mc: [
      { q: "Pedoman yang berisi aturan dan arahan branding media sosial suatu organisasi atau merek disebut ....", opts: ["Guideline Social media","Content calendar","Marketplace","Landing page","Insight"], ans: 0 },
      { q: "Media sosial adalah ....", opts: ["perangkat keras pencetak dokumen","platform digital untuk berinteraksi, berbagi informasi, dan membangun jejaring","aplikasi khusus menghitung laba","sistem penyimpanan barang","alat pembayaran tunai"], ans: 1 },
      { q: "Digital marketing adalah kegiatan pemasaran yang memanfaatkan ....", opts: ["media dan teknologi digital","mesin produksi saja","toko fisik saja","surat kabar saja","tenaga kerja manual"], ans: 0 },
      { q: "Branding merupakan proses ....", opts: ["menentukan jumlah pegawai","membangun identitas dan persepsi suatu merek","menghitung biaya produksi","mencatat transaksi penjualan","mengatur distribusi"], ans: 1 },
      { q: "Personal branding adalah upaya ....", opts: ["membangun citra dan identitas diri secara konsisten","menjual semua barang pribadi","membuat laporan keuangan","mengurangi pengikut media sosial","mengganti nama perusahaan"], ans: 0 },
      { q: "Kegiatan menghasilkan atau menambah nilai guna barang dan jasa disebut ....", opts: ["konsumsi","distribusi","produksi","promosi","investasi"], ans: 2 },
      { q: "Kegiatan menyalurkan barang atau jasa dari produsen kepada konsumen disebut ....", opts: ["produksi","distribusi","konsumsi","branding","segmentasi"], ans: 1 },
      { q: "Kegiatan menggunakan barang atau jasa untuk memenuhi kebutuhan disebut ....", opts: ["produksi","distribusi","konsumsi","promosi","pemasaran"], ans: 2 },
      { q: "Prinsip ekonomi pada dasarnya menekankan pada ....", opts: ["pengorbanan sebesar-besarnya tanpa tujuan","memperoleh hasil tertentu dengan pengorbanan seefisien mungkin","menghindari kegiatan ekonomi","membeli sebanyak-banyaknya","menggunakan sumber daya tanpa batas"], ans: 1 },
      { q: "Tindakan ekonomi rasional adalah tindakan yang ....", opts: ["berdasarkan pertimbangan manfaat, kebutuhan, dan biaya","hanya karena ikut-ikutan","selalu menghasilkan kerugian","tidak mempertimbangkan kebutuhan","spontan tanpa tujuan"], ans: 0 },
      { q: "Contoh tindakan ekonomi irasional adalah ....", opts: ["membandingkan harga","membeli sesuai kebutuhan","membeli karena tren meskipun tidak dibutuhkan","memilih sesuai anggaran","menyusun daftar belanja"], ans: 2 },
      { q: "Motif ekonomi intrinsik berasal dari ....", opts: ["dorongan dari dalam diri seseorang","tekanan pesaing","hadiah pihak lain","promosi pihak lain","perintah pelanggan"], ans: 0 },
      { q: "Contoh motif ekonomi ekstrinsik adalah ....", opts: ["ingin memperoleh penghargaan atau imbalan dari pihak lain","ingin puas karena berhasil","ingin belajar karena rasa ingin tahu","ingin berkembang karena minat pribadi","ingin mencapai kepuasan diri"], ans: 0 },
      { q: "Bisnis menargetkan remaja. Agar komunikasi media sosial sesuai identitas merek, langkah tepat adalah ....", opts: ["menggunakan gaya komunikasi konsisten dengan target dan identitas merek","mengubah gaya setiap hari","memakai semua tren tanpa pertimbangan","mengabaikan komentar audiens","hanya memposting iklan"], ans: 0 },
      { q: "Siswa membuat akun profesional untuk menampilkan Hobi dan mengunggah konten konsisten. Ini merupakan penerapan ....", opts: ["konsumsi","personal branding","distribusi","tindakan irasional","iklan"], ans: 1 },
      { q: "UMKM membuat video, mengunggah di media sosial, mengarahkan ke halaman produk, lalu mengevaluasi data kampanye. Aktivitas tersebut menunjukkan ....", opts: ["digital marketing","konsumsi","produksi konvensional","personal branding","tindakan irasional"], ans: 0 },
      { q: "Perusahaan menetapkan komentar pelanggan harus dijawab sopan, data pribadi tidak dibagikan, dan logo mengikuti identitas visual. Tujuan aturan tersebut adalah ....", opts: ["menjaga konsistensi, keamanan, dan reputasi merek","meningkatkan produksi","mengurangi kebutuhan konsumen","menghapus interaksi pelanggan","mengganti identitas merek"], ans: 0 },
      { q: "Toko online memiliki anggaran iklan terbatas. Pemilik membandingkan platform, memilih target relevan, menetapkan anggaran, lalu mengukur hasil. Ini mencerminkan ....", opts: ["tindakan ekonomi rasional dan penerapan prinsip ekonomi","tindakan ekonomi irasional","motif intrinsik saja","konsumsi","distribusi"], ans: 0 },
      { q: "Content creator ingin dikenal sebagai edukator digital marketing, tetapi banyak ide tidak sesuai citra. Strategi terbaik adalah ....", opts: ["mengunggah semua ide","memilih konten relevan dengan positioning, nilai, dan keahlian","meniru semua kreator","mengganti topik setiap unggahan","menghapus identitas professional"], ans: 1 },
      { q: "Merek mendapat komentar negatif karena informasi produk berbeda antara unggahan dan halaman penjualan. Tindakan paling tepat adalah ....", opts: ["menghapus komentar negatif","menyalahkan pelanggan","merespons profesional, memeriksa fakta, memperbaiki informasi, dan menyelaraskan komunikasi","menghentikan media sosial","mengganti logo"], ans: 2 }
    ],
    essay: [
      { q: "Jelaskan pengertian digital marketing dan sebutkan minimal tiga media atau kanal digital yang dapat digunakan untuk pemasaran.", keywords: ["digital marketing","pemasaran","media digital","teknologi","media sosial","website","marketplace","email","iklan digital"], maxScore: 20 },
      { q: "Jelaskan perbedaan branding dan personal branding serta berikan contoh penerapannya di media sosial.", keywords: ["branding","personal branding","identitas","merek","citra diri","konsisten","contoh"], maxScore: 20 },
      { q: "Jelaskan produksi, distribusi, dan konsumsi serta berikan contoh masing-masing dalam bisnis digital.", keywords: ["produksi","distribusi","konsumsi","nilai guna","menyalurkan","menggunakan","contoh"], maxScore: 20 },
      { q: "Jelaskan perbedaan tindakan ekonomi rasional dan irasional serta motif ekonomi intrinsik dan ekstrinsik. Berikan contoh masing-masing.", keywords: ["rasional","irasional","motif intrinsik","motif ekstrinsik","dorongan dalam diri","imbalan","pertimbangan","contoh"], maxScore: 20 },
      { q: "Suatu UMKM ingin membangun merek kuat di media sosial dengan anggaran terbatas. Buat langkah strategi yang menggabungkan social media guideline, branding/personal branding, digital marketing, dan prinsip ekonomi.", keywords: ["guideline","branding","personal branding","digital marketing","prinsip ekonomi","strategi","anggaran","efisien"], maxScore: 20 }
    ]
  },

  /* =====================================================
     DIGITAL MARKETING - KELAS XII OTKP
     ===================================================== */
  "XII OTKP__Digital Marketing": {
    id: "XII OTKP__Digital Marketing",
    kelas: "XII OTKP",
    mapel: "Digital Marketing",
    guru: DEFAULT_TEACHER,
    semester: "Semester 1",
    kisiKisi: "Pengertian & tujuan digital marketing, target audience, kanal digital, konten pemasaran, CTA, SEO, engagement, marketplace, analytics, conversion, pelayanan pelanggan digital, perencanaan & evaluasi kampanye.",
    mc: [
      { q: "Digital marketing adalah kegiatan pemasaran yang memanfaatkan ....", opts: ["media dan teknologi digital untuk menyampaikan nilai produk kepada target pasar","komunikasi tatap muka tanpa bantuan teknologi","pencatatan stok barang secara manual","kegiatan produksi tanpa promosi","pengarsipan dokumen perusahaan"], ans: 0 },
      { q: "Salah satu tujuan utama digital marketing adalah ....", opts: ["mengurangi seluruh interaksi dengan pelanggan","menjangkau dan membangun hubungan dengan target konsumen melalui kanal digital","menggantikan semua kegiatan produksi","membuat harga produk selalu murah","menghilangkan kebutuhan evaluasi pemasaran"], ans: 1 },
      { q: "Contoh kanal yang dapat digunakan dalam digital marketing adalah ....", opts: ["media sosial dan marketplace","gudang dan ruang produksi","lemari arsip dan ruang rapat","mesin fotokopi dan printer","buku agenda dan papan tulis"], ans: 0 },
      { q: "Target audience dalam pemasaran digital berarti ....", opts: ["semua orang tanpa mempertimbangkan karakteristiknya","kelompok calon konsumen yang menjadi sasaran komunikasi pemasaran","hanya pegawai perusahaan","hanya pelanggan yang pernah membeli","seluruh pesaing bisnis"], ans: 1 },
      { q: "Konten yang dibuat untuk menarik perhatian dan menyampaikan informasi produk melalui media digital disebut ....", opts: ["konten pemasaran","laporan keuangan","surat dinas","dokumen inventaris","daftar hadir"], ans: 0 },
      { q: "Call to action (CTA) pada sebuah konten berfungsi untuk ....", opts: ["mengajak audiens melakukan tindakan tertentu","menyembunyikan informasi produk","menghapus identitas merek","memperpanjang caption tanpa tujuan","mengganti nama perusahaan"], ans: 0 },
      { q: "Seorang siswa PKL diminta membuat konten Instagram untuk produk baru. Sebelum membuat konten, langkah yang paling tepat adalah ....", opts: ["langsung memilih filter yang sedang tren","menentukan target audience dan tujuan konten","menyalin konten pesaing","mengunggah konten sebanyak-banyaknya","mengabaikan karakter produk"], ans: 1 },
      { q: "Sebuah toko online menjual sepatu sekolah. Kontennya menggunakan bahasa yang formal, foto produk jelas, dan informasi ukuran lengkap. Hal tersebut menunjukkan pentingnya ....", opts: ["kesesuaian konten dengan kebutuhan target konsumen","penggunaan bahasa yang selalu sulit","membuat konten tanpa informasi produk","mengutamakan jumlah unggahan daripada kualitas","menghilangkan identitas merek"], ans: 0 },
      { q: "SEO pada pemasaran digital berkaitan dengan upaya ....", opts: ["meningkatkan kemungkinan halaman ditemukan melalui mesin pencari secara organik","menghapus semua konten dari internet","membuat iklan cetak","mengurangi kualitas informasi pada website","mengganti seluruh nama produk"], ans: 0 },
      { q: "Seorang admin marketplace melihat banyak calon pelanggan bertanya tentang ukuran produk. Agar komunikasi pemasaran lebih efektif, tindakan yang tepat adalah ....", opts: ["mengabaikan pertanyaan agar pelanggan mencari sendiri","memberikan jawaban yang jelas dan konsisten serta memperbaiki informasi ukuran pada halaman produk","menghapus produk dari marketplace","mengurangi foto produk","mengarahkan semua pelanggan ke pesaing"], ans: 1 },
      { q: "Data menunjukkan sebuah konten memiliki banyak tayangan tetapi sangat sedikit interaksi. Kesimpulan yang paling tepat adalah ....", opts: ["konten pasti gagal dalam semua aspek","perlu mengevaluasi relevansi konten, pesan, dan ajakan interaksi terhadap target audience","jumlah tayangan tidak perlu diperhatikan","akun harus langsung dihapus","semua konten berikutnya harus dibuat sama"], ans: 1 },
      { q: "Dalam digital marketing, engagement dapat dilihat dari bentuk interaksi seperti ....", opts: ["like, komentar, bagikan, atau bentuk respons audiens lainnya","jumlah meja di kantor","jumlah kendaraan pegawai","luas gudang","jumlah dokumen cetak"], ans: 0 },
      { q: "Saat membuat caption promosi, kalimat yang paling efektif adalah ....", opts: ["\u201cProduk kami bagus sekali.\u201d","\u201cBeli sekarang!!!\u201d tanpa informasi lain","\u201cTampil lebih rapi di sekolah dengan sepatu X\u2014tersedia ukuran 36\u201343. Cek detail dan pesan melalui tautan berikut.\u201d","\u201cIni produk kami.\u201d","\u201cSemua orang wajib membeli.\u201d"], ans: 2 },
      { q: "Sebuah UMKM memiliki banyak pengunjung website, tetapi sedikit yang melakukan pembelian. Langkah awal yang paling logis adalah ....", opts: ["menghapus website","menganalisis perilaku pengunjung dan bagian perjalanan pelanggan yang menyebabkan calon pembeli berhenti","menaikkan harga seluruh produk","mengurangi informasi produk","menghentikan seluruh promosi"], ans: 1 },
      { q: "Konten edukasi memperoleh komentar dan penyimpanan lebih tinggi daripada konten promosi langsung. Strategi yang paling tepat adalah ....", opts: ["menghapus konten edukasi","memperbanyak konten edukasi yang relevan sambil tetap menyisipkan promosi secara proporsional","hanya mengunggah iklan setiap hari","meniru akun pesaing","berhenti mengevaluasi data"], ans: 1 },
      { q: "Sebuah toko menggunakan iklan digital dengan target yang terlalu luas sehingga banyak orang melihat iklan tetapi hanya sedikit yang tertarik membeli. Perbaikan yang paling tepat adalah ....", opts: ["memperjelas segmentasi dan menyesuaikan pesan iklan dengan karakter target audience","menghapus semua informasi produk","membuat iklan tanpa target","menaikkan anggaran tanpa evaluasi","menampilkan iklan yang sama kepada semua orang"], ans: 0 },
      { q: "Data minggu pertama menunjukkan reach tinggi, tetapi conversion rendah. Strategi paling tepat adalah ....", opts: ["hanya mengejar reach lebih tinggi","mengevaluasi kualitas traffic, penawaran, CTA, landing page/halaman produk, dan kesesuaian target audience sebelum mengubah strategi","menghapus seluruh akun","menghentikan pengukuran karena reach sudah tinggi","mengunggah konten tanpa tujuan"], ans: 1 },
      { q: "Brand mendapatkan komentar negatif karena pelanggan menerima produk tidak sesuai deskripsi. Tindakan terbaik adalah ....", opts: ["menghapus semua komentar negatif tanpa membaca masalah","membalas dengan sopan, memahami keluhan, menawarkan penyelesaian sesuai kebijakan, dan mengevaluasi informasi produk","menyalahkan pelanggan di ruang publik","memblokir semua pelanggan","mengabaikan komentar tersebut"], ans: 1 },
      { q: "Iklan A memperoleh banyak klik tetapi sedikit pembelian, Iklan B klik lebih sedikit tetapi pembelian lebih tinggi. Jika tujuan utama kampanye adalah penjualan, keputusan tepat adalah ....", opts: ["selalu memilih Iklan A karena klik lebih banyak","mengevaluasi biaya dan conversion rate, lalu mengoptimalkan iklan yang menghasilkan penjualan lebih efektif","menghentikan kedua iklan","memilih iklan berdasarkan desain saja","mengabaikan data pembelian"], ans: 1 },
      { q: "Siswa PKL melakukan riset target audience, membuat konten, memilih kanal, memasang CTA, memantau data, lalu evaluasi dan perbaikan. Rangkaian tersebut menunjukkan ....", opts: ["kegiatan digital marketing yang dilakukan secara terencana dan berbasis evaluasi data","kegiatan promosi tanpa tujuan","pemasaran yang hanya berfokus pada desain","kegiatan administrasi biasa","kegiatan penjualan tanpa komunikasi"], ans: 0 }
    ],
    essay: [
      { q: "Jelaskan pengertian Digital Marketing dan jelaskan mengapa pemasaran digital penting bagi sebuah perusahaan atau UMKM di era saat ini!", keywords: ["digital marketing","pemasaran","teknologi digital","target pasar","penting","jangkauan","efisien"], maxScore: 20 },
      { q: "Jelaskan langkah-langkah membuat konten media sosial mulai dari mengenali target audience sampai menentukan bentuk konten dan CTA!", keywords: ["target audience","tujuan konten","kanal","bentuk konten","CTA","riset","langkah"], maxScore: 20 },
      { q: "Jelaskan hubungan antara kualitas konten, engagement, dan data/analytics dalam mengevaluasi keberhasilan sebuah kampanye Digital Marketing!", keywords: ["kualitas konten","engagement","analytics","data","evaluasi","kampanye","hubungan"], maxScore: 20 },
      { q: "Sebuah toko online memiliki banyak pengunjung tetapi sedikit pembelian. Analisis kemungkinan penyebabnya dan jelaskan strategi meningkatkan conversion!", keywords: ["conversion","penyebab","landing page","CTA","harga","kepercayaan","strategi","analisis"], maxScore: 20 },
      { q: "Buatlah rancangan singkat kampanye digital untuk satu produk meliputi target audience, tujuan, kanal digital, ide konten, CTA, dan cara mengevaluasi hasilnya!", keywords: ["target audience","tujuan","kanal digital","ide konten","CTA","evaluasi","rancangan","kampanye"], maxScore: 20 }
    ]
  },

  /* =====================================================
     OTK KEPEGAWAIAN - KELAS XI OTKP
     ===================================================== */
  "XI OTKP__OTK Kepegawaian": {
    id: "XI OTKP__OTK Kepegawaian",
    kelas: "XI OTKP",
    mapel: "OTK Kepegawaian",
    guru: DEFAULT_TEACHER,
    semester: "Semester 1",
    kisiKisi: "Administrasi (arti sempit & luas), tenaga kerja/kepegawaian, fungsi manajerial & operatif kepegawaian, prinsip manajemen, skala prioritas Stephen R. Covey, Gantt Chart.",
    mc: [
      { q: "Administrasi dalam arti sempit pada dasarnya berkaitan dengan kegiatan ....", opts: ["perencanaan dan pengawasan seluruh organisasi","pencatatan, surat-menyurat, dan pengarsipan","pengambilan keputusan strategis perusahaan","pengembangan produk dan pemasaran","penetapan visi dan misi organisasi"], ans: 1 },
      { q: "Administrasi dalam arti luas dapat diartikan sebagai ....", opts: ["kegiatan mengetik surat saja","kegiatan menyimpan dokumen","proses kerja sama untuk mencapai tujuan secara efektif dan efisien","kegiatan menerima dan mengirim surat","kegiatan mencatat kehadiran pegawai"], ans: 2 },
      { q: "Tenaga kerja adalah ....", opts: ["seluruh orang yang memiliki jabatan pimpinan","setiap orang yang mampu melakukan pekerjaan untuk menghasilkan barang atau jasa","hanya pegawai negeri sipil","hanya pegawai yang bekerja di kantor","orang yang memiliki perusahaan sendiri"], ans: 1 },
      { q: "Kepegawaian terutama berkaitan dengan pengelolaan ....", opts: ["modal perusahaan","bahan baku produksi","manusia/pegawai dalam organisasi","gedung dan fasilitas","pemasaran produk"], ans: 2 },
      { q: "Salah satu fungsi manajerial dalam administrasi kepegawaian adalah ....", opts: ["perencanaan pegawai","pencatatan surat masuk","pengarsipan kuitansi","penggandaan dokumen","pengetikan surat"], ans: 0 },
      { q: "Fungsi operatif administrasi kepegawaian meliputi kegiatan ....", opts: ["perencanaan strategis organisasi","pengadaan, pengembangan, kompensasi, integrasi, dan pemeliharaan pegawai","penetapan visi organisasi","pengawasan pasar","penyusunan strategi pemasaran"], ans: 1 },
      { q: "Prinsip manajemen yang menekankan pembagian pekerjaan sesuai kemampuan dan bidang keahlian disebut prinsip ....", opts: ["kesatuan perintah","pembagian kerja","stabilitas masa jabatan","sentralisasi","remunerasi"], ans: 1 },
      { q: "Prinsip kesatuan perintah (unity of command) berarti seorang pegawai sebaiknya ....", opts: ["menerima perintah dari banyak atasan","bekerja tanpa arahan","menerima perintah dari satu atasan langsung","selalu bekerja sendiri","bebas mengubah tujuan organisasi"], ans: 2 },
      { q: "Dalam skala prioritas Stephen R. Covey, kegiatan yang penting dan mendesak termasuk kuadran ....", opts: ["I","II","III","IV","V"], ans: 0 },
      { q: "Kegiatan yang penting tetapi kurang mendesak menurut skala prioritas Covey berada pada kuadran ....", opts: ["I","II","III","IV","V"], ans: 1 },
      { q: "Contoh kegiatan kuadran II adalah ....", opts: ["mengerjakan tugas setelah tenggat terlewati","memadamkan masalah yang sedang terjadi","menyusun rencana belajar dan pengembangan diri","melakukan kegiatan yang tidak penting hanya untuk mengisi waktu","menunda pekerjaan utama"], ans: 2 },
      { q: "Gantt Chart merupakan alat yang digunakan terutama untuk ....", opts: ["menghitung gaji pegawai","memvisualisasikan jadwal dan kemajuan pekerjaan berdasarkan waktu","mencatat surat masuk","menentukan struktur organisasi","menilai kepribadian pegawai"], ans: 1 },
      { q: "Dalam Gantt Chart, sumbu horizontal umumnya menunjukkan ....", opts: ["nama pegawai","jenis jabatan","waktu/periode","jumlah dokumen","tingkat pendidikan"], ans: 2 },
      { q: "Seorang kepala bagian membagi pekerjaan kepada pegawai berdasarkan keahlian masing-masing agar pekerjaan lebih efisien. Tindakan tersebut menerapkan prinsip ....", opts: ["kesatuan perintah","pembagian kerja","disiplin","kesatuan arah","kepentingan individu"], ans: 1 },
      { q: "Sebuah kantor menyusun kebutuhan jumlah pegawai, kualifikasi, serta posisi yang diperlukan untuk tahun berikutnya. Kegiatan tersebut merupakan fungsi ....", opts: ["manajerial perencanaan kepegawaian","operatif pengarsipan","administrasi surat-menyurat","penggajian rutin","pemeliharaan fasilitas"], ans: 0 },
      { q: "Seorang pegawai memiliki dua pekerjaan: laporan harus dikumpulkan hari ini dan pelatihan bulan depan. Berdasarkan Covey, laporan hari ini termasuk ....", opts: ["penting dan mendesak","penting dan tidak mendesak","tidak penting dan mendesak","tidak penting dan tidak mendesak","tidak dapat ditentukan"], ans: 0 },
      { q: "Kegiatan A berlangsung 1\u20133 September, B 4\u20138 September, C 9\u201312 September. Jika B terlambat 3 hari tanpa penyesuaian lain, dampak paling logis adalah ....", opts: ["kegiatan B dan C berpotensi bergeser sehingga waktu penyelesaian proyek ikut mundur","kegiatan A otomatis bertambah 3 hari","seluruh kegiatan selesai lebih cepat","tidak ada pengaruh terhadap jadwal","proyek langsung dibatalkan"], ans: 0 },
      { q: "Organisasi sering mengalami pekerjaan mendadak karena perencanaan buruk. Strategi Covey yang paling tepat adalah ....", opts: ["memperbanyak kegiatan kuadran III","mengabaikan kegiatan penting","memperbesar fokus pada kuadran II melalui perencanaan dan pencegahan","menunda semua pekerjaan","mengerjakan semua tugas secara bersamaan"], ans: 2 },
      { q: "Atasan meminta pegawai mengerjakan tiga pekerjaan sekaligus tanpa menentukan urutan. Agar efektif, pegawai sebaiknya ....", opts: ["memilih pekerjaan secara acak","mengerjakan yang paling mudah saja","mengidentifikasi tingkat penting-mendesak lalu menyusun urutan prioritas","menunggu sampai semua pekerjaan menjadi mendesak","mengabaikan instruksi atasan"], ans: 2 },
      { q: "Agar pimpinan dapat melihat waktu mulai, durasi, urutan, dan kemungkinan keterlambatan setiap kegiatan proyek, alat yang paling tepat adalah ....", opts: ["daftar hadir","Gantt Chart","kartu pegawai","buku agenda surat","struktur organisasi"], ans: 1 }
    ],
    essay: [
      { q: "Jelaskan perbedaan pengertian administrasi dalam arti sempit dan administrasi dalam arti luas, serta berikan masing-masing satu contoh.", keywords: ["administrasi sempit","administrasi luas","surat-menyurat","pengarsipan","kerja sama","tujuan","contoh"], maxScore: 20 },
      { q: "Jelaskan pengertian tenaga kerja dan kepegawaian serta hubungan keduanya dalam organisasi.", keywords: ["tenaga kerja","kepegawaian","pegawai","organisasi","hubungan","pengelolaan"], maxScore: 20 },
      { q: "Jelaskan fungsi manajerial dan fungsi operatif dalam administrasi kepegawaian. Berikan contoh kegiatan untuk fungsi yang kamu ketahui.", keywords: ["manajerial","operatif","perencanaan","pengadaan","pengembangan","kompensasi","integrasi","pemeliharaan","contoh"], maxScore: 20 },
      { q: "Jelaskan empat kuadran dalam skala prioritas Stephen R. Covey dan berikan satu contoh kegiatan pada setiap kuadran.", keywords: ["kuadran I","kuadran II","kuadran III","kuadran IV","penting","mendesak","contoh"], maxScore: 20 },
      { q: "Jelaskan pengertian Gantt Chart dan bagaimana penggunaannya dapat membantu seorang pimpinan dalam mengendalikan jadwal suatu pekerjaan atau proyek.", keywords: ["gantt chart","jadwal","waktu","visualisasi","kemajuan pekerjaan","proyek"], maxScore: 20 }
    ]
  },

  /* =====================================================
     PUBLIC SPEAKING - KELAS X OTKP
     ===================================================== */
  "X OTKP__Public Speaking": {
    id: "X OTKP__Public Speaking",
    kelas: "X OTKP",
    mapel: "Public Speaking",
    guru: DEFAULT_TEACHER,
    semester: "Semester 1",
    kisiKisi: "Public speaking, intonasi suara, penampilan, jenis MC, berbicara di depan kamera, kombinasi warna pakaian, mengenali diri sendiri, dampak tatap muka, menghargai kelebihan diri, perilaku audiens, menaklukkan ketakutan berbicara.",
    mc: [
      { q: "Intonasi suara dalam public speaking berfungsi terutama untuk ....", opts: ["membuat suara selalu keras","memberikan variasi nada sehingga pesan lebih jelas dan menarik","mempercepat seluruh pembicaraan","menghilangkan ekspresi wajah","menggantikan penggunaan bahasa tubuh"], ans: 1 },
      { q: "Public speaking dapat diartikan sebagai kemampuan untuk ....", opts: ["berbicara hanya kepada teman dekat","membaca teks tanpa ekspresi","menyampaikan gagasan atau pesan kepada orang lain secara lisan dengan terarah","berbicara dengan suara paling keras","menghafalkan semua kalimat sebelum tampil"], ans: 2 },
      { q: "Salah satu unsur yang perlu diperhatikan ketika berbicara di depan kamera adalah ....", opts: ["menghindari kamera sepenuhnya","kontak mata dengan lensa kamera","berbicara sambil membelakangi kamera","menggunakan suara sekecil mungkin","menutup ekspresi wajah"], ans: 1 },
      { q: "Penampilan seorang MC sebaiknya menunjukkan ....", opts: ["kerapian dan kesesuaian dengan acara","pakaian yang selalu berwarna gelap","aksesori sebanyak mungkin","pakaian yang tidak sesuai tema","gaya yang sama untuk semua acara"], ans: 0 },
      { q: "MC adalah orang yang bertugas ....", opts: ["menjadi penonton utama","mengatur dan memandu jalannya suatu acara","membuat seluruh dekorasi","menjadi pengisi acara pada semua sesi","menentukan nilai peserta"], ans: 1 },
      { q: "Pemilihan jenis MC perlu disesuaikan dengan ....", opts: ["warna favorit MC","jumlah pengikut media sosial","karakter, tujuan, dan suasana acara","harga pakaian MC","ukuran ruangan saja"], ans: 2 },
      { q: "Kombinasi warna pakaian yang baik untuk tampil di depan kamera sebaiknya ....", opts: ["terlalu banyak warna mencolok","selaras dan tidak mengganggu fokus penonton","selalu hitam seluruhnya","selalu menggunakan warna neon","mengikuti semua tren sekaligus"], ans: 1 },
      { q: "Mengenali diri sendiri dalam public speaking berarti ....", opts: ["mengetahui kekuatan dan hal yang masih perlu dikembangkan","membandingkan diri dengan semua pembicara","menutupi seluruh kekurangan","menghindari evaluasi","mengikuti gaya orang lain tanpa pertimbangan"], ans: 0 },
      { q: "Tatap muka memberikan dampak penting karena pembicara dapat ....", opts: ["menghilangkan kebutuhan komunikasi","membaca respons audiens melalui ekspresi dan bahasa tubuh","berbicara tanpa memperhatikan audiens","menghindari kontak mata","hanya mengandalkan teks"], ans: 1 },
      { q: "Menghargai kelebihan diri dalam public speaking dapat membantu seseorang ....", opts: ["menjadi sombong","mengenali potensi yang dapat dikembangkan","menghindari latihan","menolak kritik","tidak membutuhkan persiapan"], ans: 1 },
      { q: "Memahami perilaku audiens penting agar pembicara dapat ....", opts: ["memaksakan pendapat","menyesuaikan cara penyampaian dengan kondisi audiens","mengabaikan reaksi audiens","berbicara tanpa tujuan","mengubah topik setiap saat"], ans: 1 },
      { q: "Ketika suara terdengar datar saat presentasi, tindakan yang paling tepat adalah ....", opts: ["berbicara lebih cepat","menambah variasi intonasi sesuai makna pesan","membaca lebih pelan tanpa ekspresi","menghindari jeda","memperbesar volume terus-menerus"], ans: 1 },
      { q: "Seorang siswa menjadi MC acara resmi sekolah, berpakaian rapi dan bahasa sopan. Tindakan ini menunjukkan penerapan ....", opts: ["kesesuaian penampilan dan karakter acara","ketakutan terhadap audiens","penghindaran tatap muka","perilaku spontan tanpa persiapan","dominasi terhadap audiens"], ans: 0 },
      { q: "Saat berbicara di depan kamera, siswa terus melihat layar sehingga tatapan tidak mengarah ke lensa. Perbaikan yang tepat adalah ....", opts: ["menghafal lebih banyak","mengarahkan pandangan ke lensa kamera saat menyampaikan pesan utama","menutup mata saat berbicara","membaca seluruh teks dengan cepat","menambah gerakan tangan tanpa tujuan"], ans: 1 },
      { q: "Pembicara memiliki artikulasi baik tetapi sering gugup. Sikap yang paling tepat adalah ....", opts: ["berhenti tampil","mengabaikan kelebihan artikulasi","menggunakan kelebihannya sambil melatih pengelolaan rasa gugup","meniru pembicara lain sepenuhnya","menolak evaluasi"], ans: 2 },
      { q: "Dalam acara santai untuk siswa, gaya MC yang paling sesuai adalah ....", opts: ["sangat kaku dan formal sepanjang acara","komunikatif, hangat, dan tetap sopan","tanpa persiapan","menggunakan bahasa yang sulit dipahami","tidak berinteraksi dengan audiens"], ans: 1 },
      { q: "Siswa takut ditertawakan ketika berbicara, lalu berlatih bertahap dari depan cermin, kelompok kecil, lalu kelas. Strategi ini menunjukkan upaya ....", opts: ["menghindari komunikasi","menaklukkan ketakutan melalui latihan bertahap","mengurangi kepercayaan diri","menghilangkan semua kritik","mengganti tujuan komunikasi"], ans: 1 },
      { q: "Saat tatap muka, audiens mulai kehilangan perhatian. Pembicara sebaiknya ....", opts: ["terus membaca materi dengan cara yang sama","memperhatikan respons audiens lalu menyesuaikan intonasi, tempo, atau interaksi","menghentikan acara tanpa alasan","berbicara semakin monoton","mengabaikan bahasa tubuh audiens"], ans: 1 },
      { q: "Calon MC percaya diri tetapi berbicara terlalu cepat. Agar lebih efektif, ia sebaiknya ....", opts: ["menghilangkan rasa percaya diri","mempertahankan kelebihannya dan melatih tempo serta jeda berbicara","berbicara semakin cepat agar acara selesai","tidak menggunakan intonasi","menyerahkan seluruh tugas kepada orang lain"], ans: 1 },
      { q: "Dalam video promosi sekolah, siswa tampil rapi, berbicara jelas, kontak mata dengan kamera, dan warna pakaian tidak mengganggu visual. Ini menunjukkan penerapan ....", opts: ["satu unsur public speaking saja","beberapa unsur public speaking secara terpadu","teknik menghafal semata","penghindaran komunikasi tatap muka","perilaku audiens yang pasif"], ans: 1 }
    ],
    essay: [
      { q: "Jelaskan pengertian public speaking dan sebutkan hal-hal yang perlu diperhatikan agar penyampaian pesan dapat dipahami audiens!", keywords: ["public speaking","gagasan","pesan","audiens","intonasi","bahasa tubuh","kontak mata","jelas"], maxScore: 20 },
      { q: "Jelaskan mengapa intonasi suara, penampilan, dan kombinasi warna pakaian penting ketika seseorang tampil sebagai MC atau berbicara di depan kamera!", keywords: ["intonasi","penampilan","warna pakaian","MC","kamera","fokus","kesan"], maxScore: 20 },
      { q: "Jelaskan pentingnya mengenali diri sendiri, menghargai kelebihan, serta memahami perilaku audiens dalam meningkatkan kemampuan public speaking!", keywords: ["mengenali diri","kelebihan","kekurangan","perilaku audiens","potensi","kepercayaan diri"], maxScore: 20 },
      { q: "Seorang siswa merasa gugup ketika harus berbicara di depan kelas. Jelaskan langkah-langkah yang dapat dilakukan untuk menaklukkan ketakutan tersebut secara bertahap!", keywords: ["gugup","latihan bertahap","cermin","kelompok kecil","kelas","percaya diri","langkah"], maxScore: 20 },
      { q: "Sebutkan jenis MC. Berikan contoh situasi untuk masing-masing!", keywords: ["jenis MC","formal","non formal","semi formal","acara resmi","acara santai","contoh"], maxScore: 20 }
    ]
  }
};

/* Util: hitung skor pilihan ganda */
function gradeMultipleChoice(examId, answers) {
  const exam = EXAMS[examId];
  let correct = 0;
  const detail = [];
  exam.mc.forEach((item, i) => {
    const chosen = answers[i];
    const isCorrect = chosen === item.ans;
    if (isCorrect) correct++;
    detail.push({ index: i, chosen, correct: item.ans, isCorrect });
  });
  const score = Math.round((correct / exam.mc.length) * 100);
  return { correct, total: exam.mc.length, score, detail };
}

/* Util: heuristic auto-grading utk essay (skor awal, tetap perlu ditinjau guru) */
function gradeEssay(examId, answers) {
  const exam = EXAMS[examId];
  let totalScore = 0;
  const detail = [];
  exam.essay.forEach((item, i) => {
    const text = (answers[i] || "").toLowerCase().trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    let kwHits = 0;
    item.keywords.forEach(k => { if (text.includes(k.toLowerCase())) kwHits++; });
    const kwRatio = item.keywords.length ? kwHits / item.keywords.length : 0;
    // komponen skor: 60% relevansi kata kunci, 40% kelengkapan (panjang jawaban, capped)
    const lengthComponent = Math.min(wordCount / 40, 1); // dianggap cukup lengkap di >=40 kata
    let raw = (kwRatio * 0.6 + lengthComponent * 0.4);
    if (wordCount === 0) raw = 0;
    const score = Math.round(raw * item.maxScore);
    totalScore += score;
    detail.push({ index: i, wordCount, kwHits, kwTotal: item.keywords.length, score, maxScore: item.maxScore });
  });
  return { score: totalScore, maxScore: exam.essay.length * 20, detail };
}

/* Nilai Akhir = gabungan skor PG (0-100) dan skor essay (0-100)
   sesuai bobot MC_WEIGHT / ESSAY_WEIGHT di atas. Dipakai di app.js
   (saat siswa mengumpulkan ujian) dan admin.js (rekap/ekspor) agar
   cara menghitung nilai akhir konsisten di satu tempat saja. */
function computeFinalScore(mcScore, essayScore) {
  return Math.round((mcScore * MC_WEIGHT) + (essayScore * ESSAY_WEIGHT));
}

if (typeof module !== "undefined") {
  module.exports = { SCHOOL_NAME, SCHOOL_PROGRAM, DEFAULT_TEACHER, EXAM_DURATION_MINUTES, MAX_EXIT_STRIKES, MC_WEIGHT, ESSAY_WEIGHT, CLASS_SUBJECT_MAP, EXAMS, gradeMultipleChoice, gradeEssay, computeFinalScore };
}
