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
index.html    -> Portal siswa (login, ujian, proctoring, tanda terima)
admin.html    -> Dasbor administrator
style.css     -> Identitas visual (biru #1171b1 & kuning #fcc102, tema dokumen kantor)
data.js       -> Bank soal, kunci jawaban, dan mesin penilaian otomatis
db.js         -> Penyimpanan lokal (IndexedDB): hasil ujian, cuplikan kamera
shared.js     -> Penggabung soal bawaan dengan perubahan admin
app.js        -> Logika sisi siswa (timer, anti-keluar halaman, kamera/mic)
admin.js      -> Logika dasbor admin (rekap nilai, edit soal, ekspor Excel)
```

## Cara menjalankan
Karena memakai kamera/mikrofon, browser **mewajibkan HTTPS atau localhost**.
1. **Uji coba cepat di komputer sendiri**: buka folder ini di terminal, jalankan
   `python3 -m http.server 8080`, lalu buka `http://localhost:8080` di browser.
2. **Produksi/sekolah**: unggah seluruh isi folder ke hosting statis dengan HTTPS
   (mis. GitHub Pages, Netlify, Vercel, cPanel dengan SSL aktif, dsb).

Login admin: buka `admin.html` — kata sandi bawaan **`admin123`**
(segera ganti lewat menu *Pengaturan*).

## Fitur utama
- **Login siswa**: nama lengkap, kelas, mata pelajaran (menu otomatis menyesuaikan
  kelas), dan nama guru (divalidasi harus sesuai jadwal).
- **Timer 60 menit** dengan auto-submit saat waktu habis.
- **Anti-keluar halaman**: mendeteksi pindah tab, jendela kehilangan fokus, dan
  keluar dari mode layar penuh. Setiap pelanggaran memicu peringatan tegas;
  3 kali pelanggaran memicu pengumpulan otomatis.
- **Proctoring**: kamera depan & mikrofon aktif selama ujian, cuplikan foto
  setiap 20 detik dan rekaman audio sesi tersimpan untuk ditinjau admin.
- **Penilaian otomatis**: pilihan ganda dinilai eksak dari kunci jawaban;
  essay diberi **estimasi skor otomatis** berbasis kecocokan kata kunci &
  kelengkapan jawaban (lihat catatan penting di bawah).
- **Dasbor admin**: rekap nilai per kelas/mapel, detail tiap peserta (jawaban,
  cuplikan kamera, rekaman audio), editor bank soal, data siswa/kelas, dan
  ekspor rekap ke file Excel (.xlsx).

## Catatan penting (mohon dibaca)
1. **Penilaian essay otomatis adalah estimasi**, bukan pemeriksaan makna
   sesungguhnya — sistem menghitung kecocokan kata kunci dan panjang jawaban.
   Skor ini ditandai sebagai "estimasi" pada tanda terima siswa maupun dasbor
   admin, dan sebaiknya selalu ditinjau ulang oleh guru sebelum menjadi nilai
   resmi.
2. **Penyimpanan bersifat lokal per-browser** (IndexedDB), bukan basis data
   pusat. Jika siswa mengerjakan di komputer/laptop yang berbeda-beda, hasil
   ujian akan tersebar di masing-masing perangkat, dan admin perlu membuka
   dasbor **di perangkat yang sama** untuk melihat/mengekspor hasilnya —
   atau mengumpulkan file ekspor Excel dari tiap perangkat secara manual.
   Untuk sekolah dengan banyak komputer/laboratorium, sebaiknya sistem ini
   dikembangkan lebih lanjut dengan backend/database terpusat (mis. lewat
   Claude Code) agar semua hasil otomatis terkumpul di satu tempat.
3. **Rekaman kamera/mikrofon** memerlukan izin eksplisit dari siswa saat
   ujian dimulai. Pastikan sekolah menginformasikan kebijakan pengawasan ini
   kepada siswa dan orang tua/wali sebelum ujian berlangsung, dan menyimpan/
   menghapus rekaman sesuai kebijakan privasi sekolah.
4. **Mengedit soal**: menu *Bank Soal* di dasbor admin menyimpan perubahan
   per-perangkat (di browser admin yang sama). Soal bawaan tidak pernah
   hilang — gunakan tombol "Kembalikan ke Soal Bawaan" kapan saja.
5. Untuk mengubah **durasi ujian** (60 menit) atau **batas pelanggaran** (3
   kali), sunting konstanta `EXAM_DURATION_MINUTES` dan `MAX_EXIT_STRIKES`
   di awal berkas `data.js`.

## Palet & identitas visual
- Biru utama `#1171b1`, kuning aksen `#fcc102` — merefleksikan warna
  kompetensi keahlian Manajemen Perkantoran & Layanan Bisnis.
- Elemen khas: kop surat digital, lencana "cap/stempel" untuk status ujian,
  tab folder arsip untuk navigasi soal, dan tabel gaya buku ledger di dasbor
  admin — seluruhnya terinspirasi dari dunia administrasi perkantoran (OTKP).
- Sepenuhnya responsif untuk ponsel, tablet, dan laptop.
