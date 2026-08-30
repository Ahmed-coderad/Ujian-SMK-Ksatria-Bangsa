# Portal Ujian Daring — SMK Ksatria Bangsa
Kompetensi Keahlian: Manajemen Perkantoran dan Layanan Bisnis (OTKP)

Dibangun dari 4 naskah STS resmi sekolah:
- Digital Marketing — Kelas XI OTKP (20 PG + 5 essay)
- Digital Marketing — Kelas XII OTKP (20 PG + 5 essay)
- OTK Kepegawaian — Kelas XI OTKP (20 PG + 5 essay)
- Public Speaking — Kelas X OTKP (20 PG + 5 essay)

Guru pengampu keempatnya: **Rizky Ahmed Darmawan, S.M**

## Isi berkas
```
index.html          -> Portal siswa (login, ujian, proctoring, tanda terima)
admin.html           -> Dasbor administrator
style.css            -> Identitas visual (biru #1171b1 & kuning #fcc102, tema dokumen kantor)
firebase-config.js   -> WAJIB DIISI: kredensial Firebase (penyimpanan terpusat)
cloud.js             -> Lapisan penyimpanan terpusat (Firebase Realtime Database)
data.js              -> Bank soal, kunci jawaban, dan mesin penilaian otomatis
db.js                -> Cadangan lokal (IndexedDB) bila perangkat offline / belum dikonfigurasi
shared.js            -> Penggabung soal bawaan dengan perubahan admin (terpusat / lokal)
app.js               -> Logika sisi siswa (login, timer, anti-keluar halaman, kamera/mic)
admin.js             -> Logika dasbor admin (rekap nilai, edit soal, jadwal, ekspor Excel)
```

## Cara menjalankan
Karena memakai kamera/mikrofon, browser **mewajibkan HTTPS atau localhost**.
1. **Uji coba cepat di komputer sendiri**: buka folder ini di terminal, jalankan
   `python3 -m http.server 8080`, lalu buka `http://localhost:8080` di browser.
2. **Produksi/sekolah**: unggah seluruh isi folder ke hosting statis dengan HTTPS
   (mis. GitHub Pages, Netlify, Vercel, cPanel dengan SSL aktif, dsb).

Login admin: buka `admin.html` — kata sandi bawaan **`Rad870773!`**
(dapat diganti kapan saja lewat menu *Pengaturan*).

## Penyimpanan Terpusat (Firebase) — WAJIB untuk banyak perangkat
Sejak versi ini, portal memakai **Firebase Realtime Database** sebagai server
pusat agar mendukung skenario sekolah yang sesungguhnya: **hingga 88 peserta
ujian dan 1 administrator** memakai perangkat berbeda-beda secara bersamaan,
dengan:
- Nama siswa yang boleh login **terpusat** — siswa wajib didaftarkan lebih dulu
  oleh admin di menu *Data Siswa & Kelas* sebelum bisa login mengerjakan ujian.
- Perubahan/penambahan soal di menu *Bank Soal* **langsung tersinkron** ke
  semua perangkat siswa (tidak perlu unggah ulang aplikasi).
- Jadwal mulai ujian (tanggal, bulan, tahun, jam) di menu *Jadwal Ujian*
  berlaku untuk semua peserta.
- Hasil ujian & cuplikan kamera seluruh peserta **terkumpul otomatis** di satu
  tempat, terlihat dari dasbor admin di perangkat mana pun.
- Kata sandi admin tersimpan terpusat.

### Langkah pengaturan (gratis, ±5 menit)
1. Buka https://console.firebase.google.com -> **Add project** -> beri nama
   bebas (mis. "portal-ujian-kb") -> lanjutkan (Google Analytics boleh dimatikan).
2. Menu kiri: **Build -> Realtime Database -> Create Database** -> pilih lokasi
   terdekat (mis. Singapore) -> mulai dalam **test mode** (lihat catatan
   keamanan di bawah untuk memperketat sebelum ujian sesungguhnya).
3. Klik ikon gerigi **Project settings** -> scroll ke **Your apps** -> klik
   ikon web **`</>`** -> beri nama app -> **Register app**.
4. Salin nilai `firebaseConfig` yang muncul, tempel ke `firebase-config.js`
   (ganti seluruh tulisan `ISI_DI_SINI`).
5. Simpan, lalu unggah ulang seluruh folder ke hosting.

Jika `firebase-config.js` belum diisi atau perangkat sedang offline, portal
otomatis memakai cadangan lokal (IndexedDB) di perangkat itu saja — cocok
untuk uji coba cepat satu perangkat, **tetapi tidak mendukung banyak siswa
di perangkat berbeda** sampai Firebase diisi.

### Catatan keamanan Realtime Database
Mode uji coba (*test mode*) Firebase membuka baca/tulis tanpa autentikasi
selama 30 hari. Untuk penggunaan jangka panjang, buka menu **Realtime
Database -> Rules** dan ganti dengan aturan yang membatasi penulisan hanya
pada struktur data yang dipakai portal ini (roster, examOverrides,
examSchedule, config, attempts, snapshots), atau aktifkan Firebase
Authentication khusus untuk akun admin bila ingin proteksi lebih ketat.

## Fitur utama
- **Login siswa tervalidasi terpusat**: nama lengkap harus persis cocok
  dengan salah satu data yang didaftarkan admin di *Data Siswa & Kelas*
  (tidak membedakan besar/kecil huruf), ditambah kelas, mata pelajaran
  (menu otomatis menyesuaikan kelas), dan nama guru (divalidasi sesuai jadwal).
- **Jadwal ujian**: admin menentukan tanggal, bulan, tahun & jam pembukaan
  tiap paket ujian di menu *Jadwal Ujian*; peserta tidak dapat masuk sebelum
  waktunya, dengan notifikasi hitung mundur di layar login.
- **Timer 60 menit** dengan auto-submit saat waktu habis.
- **Anti-keluar halaman**: mendeteksi pindah tab, jendela kehilangan fokus, dan
  keluar dari mode layar penuh. Setiap pelanggaran memicu peringatan tegas;
  3 kali pelanggaran memicu pengumpulan otomatis.
- **Proctoring**: kamera depan & mikrofon aktif selama ujian, cuplikan foto
  setiap 20 detik dikirim ke server pusat untuk ditinjau admin dari perangkat
  mana pun; rekaman audio tetap tersimpan lokal (lihat catatan di bawah).
- **Penilaian otomatis**: pilihan ganda dinilai eksak dari kunci jawaban;
  essay diberi **estimasi skor otomatis** berbasis kecocokan kata kunci &
  kelengkapan jawaban (lihat catatan penting di bawah).
- **Dasbor admin real-time**: rekap nilai per kelas/mapel, detail tiap peserta
  (jawaban, cuplikan kamera), editor bank soal yang tersinkron langsung ke
  semua perangkat siswa, jadwal ujian, data siswa/kelas, kata sandi admin
  terpusat, dan ekspor rekap ke file Excel (.xlsx).

## Catatan penting (mohon dibaca)
1. **Penilaian essay otomatis adalah estimasi**, bukan pemeriksaan makna
   sesungguhnya — sistem menghitung kecocokan kata kunci dan panjang jawaban.
   Skor ini ditandai sebagai "estimasi" pada tanda terima siswa maupun dasbor
   admin, dan sebaiknya selalu ditinjau ulang oleh guru sebelum menjadi nilai
   resmi.
2. **Rekaman audio proctoring tetap tersimpan lokal per-perangkat** (bukan
   dikirim ke server pusat) karena ukuran berkasnya besar. Jika ingin
   meninjau audio suatu sesi, dasbor admin perlu dibuka di perangkat yang
   sama dengan yang dipakai siswa saat ujian. Cuplikan foto, jawaban, dan
   nilai tetap terpusat dan bisa dilihat dari perangkat admin mana pun.
3. **Rekaman kamera/mikrofon** memerlukan izin eksplisit dari siswa saat
   ujian dimulai. Pastikan sekolah menginformasikan kebijakan pengawasan ini
   kepada siswa dan orang tua/wali sebelum ujian berlangsung, dan menyimpan/
   menghapus rekaman sesuai kebijakan privasi sekolah.
4. **Mengedit soal**: menu *Bank Soal* di dasbor admin menyimpan perubahan ke
   penyimpanan terpusat dan langsung berlaku untuk semua perangkat siswa
   begitu disimpan. Soal bawaan tidak pernah hilang — gunakan tombol
   "Kembalikan ke Soal Bawaan" kapan saja.
5. Untuk mengubah **durasi ujian** (60 menit) atau **batas pelanggaran** (3
   kali), sunting konstanta `EXAM_DURATION_MINUTES` dan `MAX_EXIT_STRIKES`
   di awal berkas `data.js`.
6. **Siswa wajib didaftarkan lebih dulu** di menu *Data Siswa & Kelas*
   sebelum bisa login — sebelum ada data siswa sama sekali, tidak ada yang
   bisa mengerjakan ujian. Ini berlaku juga saat uji coba lokal tanpa Firebase.

## Palet & identitas visual
- Biru utama `#1171b1`, kuning aksen `#fcc102` — merefleksikan warna
  kompetensi keahlian Manajemen Perkantoran & Layanan Bisnis.
- Elemen khas: kop surat digital, lencana "cap/stempel" untuk status ujian,
  tab folder arsip untuk navigasi soal, dan tabel gaya buku ledger di dasbor
  admin — seluruhnya terinspirasi dari dunia administrasi perkantoran (OTKP).
- Animasi halus (masuk-fade pada kartu, cap stempel, transisi tab, dsb.)
  ditambahkan untuk kesan modern namun tetap profesional; otomatis
  dinonaktifkan bila pengguna mengaktifkan preferensi "reduce motion".
- Sepenuhnya responsif untuk ponsel, tablet, dan laptop, dengan perhatian
  khusus pada header dan menu agar mudah dipahami siswa maupun guru di layar
  kecil.
