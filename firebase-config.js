/* ============================================================
   KONFIGURASI PENYIMPANAN TERPUSAT — SUDAH DIISI
   ============================================================
   Portal ini memakai Firebase Realtime Database sebagai server
   pusat (lewat REST API + streaming, lihat cloud.js) agar:
     - Nama siswa yang boleh login terpusat (bukan per perangkat)
     - Perubahan/tambahan soal di dasbor admin langsung tersinkron
       ke SEMUA perangkat siswa (tanpa perlu update ulang aplikasi)
     - Jadwal mulai ujian (tanggal, bulan, tahun, jam) terpusat &
       WAJIB diisi admin sebelum siswa dapat login
     - Hasil ujian seluruh peserta (target: hingga 88 siswa + 1 admin)
       terkumpul otomatis di satu tempat

   Berbeda dari sebagian besar contoh Firebase yang meminta seluruh
   objek "firebaseConfig" (apiKey, appId, dst.), lapisan penyimpanan
   di sini hanya memerlukan alamat Realtime Database (databaseURL)
   karena semua komunikasi dilakukan lewat REST API + koneksi
   streaming (Server-Sent Events) bawaan browser — tanpa perlu
   memuat pustaka Firebase SDK sama sekali.

   URL di bawah ini sudah diisi sesuai database yang disediakan
   untuk SMK Ksatria Bangsa. Cukup pastikan aturan keamanan
   Realtime Database (menu Rules di Firebase Console) mengizinkan
   baca/tulis (mis. mode uji coba / test mode, atau aturan khusus
   yang membatasi ke struktur data portal ini: roster, examOverrides,
   examSchedule, config, attempts).

   CATATAN PRIVASI: cuplikan foto webcam & rekaman audio proctoring
   TIDAK PERNAH dikirim ke alamat ini — keduanya sengaja tetap
   tersimpan lokal (IndexedDB) di perangkat siswa masing-masing.
   Hanya data teks (data siswa, soal, jadwal, jawaban & nilai) yang
   dikirim ke penyimpanan terpusat. Lihat cloud.js & db.js.
   ============================================================ */

window.EXAM_DB_URL = "https://portal-ujian-kb-default-rtdb.asia-southeast1.firebasedatabase.app";

/* Jika suatu saat sekolah perlu memindahkan data ke proyek Firebase
   lain, ganti nilai di atas dengan databaseURL proyek baru (bentuknya
   selalu "https://NAMA-PROYEK-default-rtdb.LOKASI.firebasedatabase.app",
   tanpa garis miring "/" di akhir), lalu simpan berkas ini dan unggah
   ulang seluruh folder ke hosting. Jika perangkat sedang offline atau
   nilai di atas dikosongkan, portal otomatis memakai cadangan lokal
   (IndexedDB) di perangkat itu saja (lihat db.js). */
