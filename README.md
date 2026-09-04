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
firebase-config.js   -> Alamat database terpusat (SUDAH DIISI, lihat di bawah)
cloud.js             -> Lapisan penyimpanan terpusat (REST API + realtime ke Firebase Realtime Database)
data.js              -> Bank soal, kunci jawaban, bobot penilaian & mesin penilaian otomatis
db.js                -> Cadangan lokal (IndexedDB) — juga tempat PERMANEN cuplikan foto & audio proctoring
shared.js            -> Penggabung soal bawaan dengan perubahan admin (terpusat / lokal)
app.js               -> Logika sisi siswa (login, jadwal, timer, anti-keluar halaman, kamera/mic)
admin.js             -> Logika dasbor admin (rekap nilai, edit soal, jadwal wajib, ekspor Excel)
```

## Cara menjalankan
Karena memakai kamera/mikrofon, browser **mewajibkan HTTPS atau localhost**.
1. **Uji coba cepat di komputer sendiri**: buka folder ini di terminal, jalankan
   `python3 -m http.server 8080`, lalu buka `http://localhost:8080` di browser.
2. **Produksi/sekolah**: unggah seluruh isi folder ke hosting statis dengan HTTPS
   (mis. GitHub Pages, Netlify, Vercel, cPanel dengan SSL aktif, dsb).

Login admin: buka `admin.html` — kata sandi bawaan **`Rad870773!`**
(dapat diganti kapan saja lewat menu *Pengaturan*).

## Penyimpanan Terpusat — SUDAH AKTIF (tidak perlu pengaturan tambahan)
Portal ini memakai Firebase Realtime Database sebagai server pusat, diakses
langsung lewat **REST API + koneksi realtime (Server-Sent Events)** bawaan
browser — bukan lewat pustaka Firebase SDK — sehingga hanya memerlukan satu
alamat database, bukan kredensial lengkap. Alamat tersebut **sudah diisi**
di `firebase-config.js`:

```
https://portal-ujian-kb-default-rtdb.asia-southeast1.firebasedatabase.app
```

Ini mendukung skenario sekolah yang sesungguhnya — **hingga 88 peserta ujian
dan 1 administrator** memakai perangkat berbeda-beda secara bersamaan — dengan:
- Nama siswa yang boleh login **terpusat** — siswa wajib didaftarkan lebih dulu
  oleh admin di menu *Data Siswa & Kelas* sebelum bisa login mengerjakan ujian.
- Perubahan/penambahan soal di menu *Bank Soal* **langsung tersinkron** ke
  semua perangkat siswa (tidak perlu unggah ulang aplikasi).
- **Jadwal Mulai Ujian (tanggal, bulan, tahun, jam)** di menu *Jadwal Ujian*
  bersifat **wajib diisi admin** dan berlaku untuk semua peserta — lihat bagian
  khusus di bawah.
- Jawaban & hasil ujian seluruh peserta **terkumpul otomatis** di satu tempat,
  terlihat dari dasbor admin di perangkat mana pun, lengkap dengan skor PG,
  skor essay, dan Nilai Akhir gabungan keduanya.
- Kata sandi admin tersimpan terpusat.

Jika sekolah suatu saat perlu memindahkan data ke proyek Firebase lain, cukup
ganti satu baris `EXAM_DB_URL` di `firebase-config.js` dengan databaseURL
proyek baru, lalu unggah ulang folder ke hosting — lihat komentar di berkas
tersebut. Jika alamat itu dikosongkan atau perangkat sedang offline, portal
otomatis memakai cadangan lokal (IndexedDB) di perangkat itu saja — cocok
untuk uji coba cepat satu perangkat, **tetapi tidak mendukung banyak siswa
di perangkat berbeda**.

### Catatan keamanan Realtime Database
Mode uji coba (*test mode*) Firebase membuka baca/tulis tanpa autentikasi
selama 30 hari sejak database dibuat. Untuk penggunaan jangka panjang, buka
**Firebase Console -> Realtime Database -> Rules** dan ganti dengan aturan
yang membatasi penulisan hanya pada struktur data yang dipakai portal ini
(`roster`, `examOverrides`, `examSchedule`, `config`, `attempts`).

## Jadwal Mulai Ujian — WAJIB dikonfigurasi admin
Menu *Jadwal Ujian* di dasbor admin kini **wajib** diisi untuk setiap
kombinasi kelas & mata pelajaran, dengan tanggal, bulan, tahun, dan jam
(satu bidang tanggal-waktu). Selama jadwal belum diatur:
- Peserta **tidak dapat login sama sekali** untuk ujian tersebut — layar
  login menampilkan pesan bahwa jadwal belum ditentukan dan meminta peserta
  menghubungi admin.
- Kolom **Status** pada tabel Jadwal Ujian menandai paket ujian tersebut
  sebagai "Belum dijadwalkan — login terkunci".

Setelah admin menyimpan waktu mulai:
- Sebelum waktu tersebut tiba, peserta melihat hitung mundur/pemberitahuan
  jadwal dan tetap tidak dapat login.
- Begitu waktu mulai tiba, peserta dapat login dan mengerjakan ujian kapan
  saja setelahnya (tidak ada batas waktu tutup — hanya batas waktu mulai).
- Admin dapat menghapus jadwal kapan saja lewat tombol "Hapus Jadwal (Kunci
  Login)", yang akan langsung mengunci ulang login untuk ujian tersebut.

## Fitur utama
- **Login siswa tervalidasi terpusat**: nama lengkap harus persis cocok
  dengan salah satu data yang didaftarkan admin di *Data Siswa & Kelas*
  (tidak membedakan besar/kecil huruf), ditambah kelas, mata pelajaran
  (menu otomatis menyesuaikan kelas), nama guru (divalidasi sesuai jadwal),
  dan jadwal mulai ujian (lihat bagian di atas).
- **Timer 60 menit** dengan auto-submit saat waktu habis.
- **Anti-keluar halaman**: mendeteksi pindah tab, jendela kehilangan fokus, dan
  keluar dari mode layar penuh. Setiap pelanggaran memicu peringatan tegas;
  3 kali pelanggaran memicu pengumpulan otomatis.
- **Proctoring**: kamera depan & mikrofon aktif selama ujian, cuplikan foto
  setiap 20 detik. **Cuplikan foto maupun rekaman audio tetap tersimpan lokal
  (IndexedDB) di perangkat siswa masing-masing** — keduanya tidak pernah
  dikirim ke penyimpanan terpusat (lihat catatan penting di bawah).
- **Penilaian otomatis multi-komponen**: pilihan ganda dinilai eksak dari
  kunci jawaban (skor 0-100), essay diberi **estimasi skor otomatis**
  berbasis kecocokan kata kunci & kelengkapan jawaban (skor 0-100), lalu
  keduanya digabung menjadi **Nilai Akhir** sesuai bobot yang dapat diatur
  di `data.js` (`MC_WEIGHT` / `ESSAY_WEIGHT`, bawaan 50:50). Ketiga skor ini
  (PG, essay, Nilai Akhir) tampil di tanda terima siswa maupun dasbor admin.
- **Dasbor admin real-time**: rekap nilai per kelas/mapel, detail tiap peserta
  (jawaban, skor PG/essay/Nilai Akhir, cuplikan kamera bila dibuka di
  perangkat yang sama), editor bank soal yang tersinkron langsung ke semua
  perangkat siswa, jadwal ujian wajib, data siswa/kelas, kata sandi admin
  terpusat, dan ekspor rekap ke file Excel (.xlsx).

## Catatan penting (mohon dibaca)
1. **Penilaian essay otomatis adalah estimasi**, bukan pemeriksaan makna
   sesungguhnya — sistem menghitung kecocokan kata kunci dan panjang jawaban.
   Begitu juga Nilai Akhir yang memuat komponen essay tersebut. Skor-skor ini
   ditandai sebagai "estimasi" pada tanda terima siswa maupun dasbor admin,
   dan sebaiknya selalu ditinjau ulang oleh guru sebelum menjadi nilai resmi.
2. **Cuplikan foto & rekaman audio proctoring tetap tersimpan lokal per-
   perangkat** (bukan dikirim ke server pusat) — foto karena pertimbangan
   privasi, audio juga karena ukuran berkasnya besar. Untuk meninjau salah
   satunya, dasbor admin perlu dibuka di perangkat yang sama dengan yang
   dipakai siswa saat ujian. Data teks (identitas, jawaban, dan seluruh
   skor/nilai) tetap terpusat dan bisa dilihat dari perangkat admin mana pun.
3. **Rekaman kamera/mikrofon** memerlukan izin eksplisit dari siswa saat
   ujian dimulai. Pastikan sekolah menginformasikan kebijakan pengawasan ini
   kepada siswa dan orang tua/wali sebelum ujian berlangsung, dan menyimpan/
   menghapus rekaman sesuai kebijakan privasi sekolah.
4. **Mengedit soal**: menu *Bank Soal* di dasbor admin menyimpan perubahan ke
   penyimpanan terpusat dan langsung berlaku untuk semua perangkat siswa
   begitu disimpan. Soal bawaan tidak pernah hilang — gunakan tombol
   "Kembalikan ke Soal Bawaan" kapan saja.
5. Untuk mengubah **durasi ujian** (60 menit), **batas pelanggaran** (3 kali),
   atau **bobot penilaian PG/essay** (bawaan 50:50), sunting konstanta
   `EXAM_DURATION_MINUTES`, `MAX_EXIT_STRIKES`, `MC_WEIGHT`, dan
   `ESSAY_WEIGHT` di awal berkas `data.js`.
6. **Siswa wajib didaftarkan lebih dulu** di menu *Data Siswa & Kelas*, dan
   **jadwal mulai ujian wajib diatur** di menu *Jadwal Ujian*, sebelum siswa
   bisa login. Tanpa keduanya, tidak ada yang bisa mengerjakan ujian. Ini
   berlaku juga saat uji coba lokal tanpa penyimpanan terpusat.

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
