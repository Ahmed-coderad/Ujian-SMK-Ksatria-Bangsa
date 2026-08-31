/* ============================================================
   KONFIGURASI FIREBASE — WAJIB DIISI SEBELUM DIGUNAKAN
   ============================================================
   Portal ini memakai Firebase Realtime Database sebagai server
   pusat, agar:
     - Nama siswa yang boleh login terpusat (bukan per perangkat)
     - Perubahan/tambahan soal di dasbor admin langsung tersinkron
       ke SEMUA perangkat siswa (tanpa perlu update ulang aplikasi)
     - Jadwal mulai ujian terpusat
     - Hasil ujian seluruh peserta (target: hingga 88 siswa + 1 admin)
       terkumpul otomatis di satu tempat

   CARA MENGISI (gratis, +-5 menit):
   1. Buka https://console.firebase.google.com -> "Add project"
      -> beri nama bebas, misal "portal-ujian-kb" -> lanjutkan
      (Google Analytics boleh dimatikan).
   2. Di menu kiri: Build -> Realtime Database -> "Create Database"
      -> pilih lokasi terdekat (mis. Singapore) -> mulai dalam
      "test mode" (bisa diperketat nanti, lihat README bagian Keamanan).
   3. Klik ikon gerigi (Project settings) -> scroll ke "Your apps"
      -> klik ikon web "</>" -> beri nama app -> "Register app".
   4. Salin nilai firebaseConfig yang muncul, tempel ke object di
      bawah ini (ganti seluruh tulisan "ISI_DI_SINI").
   5. Simpan file ini, lalu unggah ulang seluruh folder ke hosting.

   Selama kolom di bawah belum diisi, portal TETAP BISA dijalankan
   untuk uji coba (memakai penyimpanan lokal per perangkat seperti
   sebelumnya), tetapi fitur terpusat (poin-poin di atas) tidak aktif.
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "ISI_DI_SINI",
  authDomain: "ISI_DI_SINI.firebaseapp.com",
  databaseURL: "https://portal-ujian-kb-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "ISI_DI_SINI",
  storageBucket: "ISI_DI_SINI.appspot.com",
  messagingSenderId: "ISI_DI_SINI",
  appId: "ISI_DI_SINI"
};
