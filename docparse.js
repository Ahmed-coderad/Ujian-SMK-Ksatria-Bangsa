/* ============================================================
   DOCPARSE.js — parser heuristik untuk mengubah teks polos hasil
   ekstraksi dari file Word (.docx) atau PDF menjadi struktur soal
   ujian (pilihan ganda + uraian) siap pakai.
   ============================================================ */

/* ============================================================
   DOCPARSE.js — impor soal dari file Word (.docx) atau PDF
   ------------------------------------------------------------
   Alur: file diambil sebagai ArrayBuffer -> diekstrak jadi teks polos
   (mammoth.js untuk .docx, pdf.js untuk .pdf) -> teks itu diuraikan
   secara heuristik (regex) menjadi soal pilihan ganda (dengan kunci
   jawaban) dan soal uraian/essay siap pakai oleh admin.js.

   KETERBATASAN: ini pengurai heuristik berbasis pola teks umum naskah
   ujian Indonesia (nomor bertitik/berkurung, opsi A-E, bagian "KUNCI
   JAWABAN"), BUKAN pembaca dokumen sempurna. Hasilnya SELALU harus
   ditinjau admin di halaman Bank Soal sebelum dipakai siswa — lihat
   peringatan (`warnings`) yang dikembalikan `parseExamDocument()`.
   ============================================================ */

/* Membaca file .docx menjadi teks polos memakai mammoth.js (dimuat lewat
   CDN di admin.html). Struktur paragraf dipertahankan sebagai baris. */
async function extractTextFromDocx(arrayBuffer) {
  if (typeof mammoth === "undefined") throw new Error("Pustaka pembaca Word (mammoth.js) belum termuat. Periksa koneksi internet Anda.");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/* Membaca file .pdf menjadi teks polos memakai pdf.js (dimuat lewat CDN
   di admin.html). Item teks dikelompokkan ulang jadi baris berdasarkan
   posisi vertikal (koordinat Y) karena pdf.js tidak menyimpan baris
   secara eksplisit — teknik umum untuk merekonstruksi tata letak baris. */
async function extractTextFromPdf(arrayBuffer) {
  if (typeof pdfjsLib === "undefined") throw new Error("Pustaka pembaca PDF (pdf.js) belum termuat. Periksa koneksi internet Anda.");
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let lastY = null, line = "";
    content.items.forEach(item => {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        fullText += line.trim() + "\n";
        line = "";
      }
      line += item.str + " ";
      lastY = y;
    });
    fullText += line.trim() + "\n\n";
  }
  return fullText;
}

/* Titik masuk utama dipakai admin.js: terima File, kembalikan teks polos. */
async function extractTextFromFile(file) {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return extractTextFromDocx(buffer);
  if (name.endsWith(".pdf")) return extractTextFromPdf(buffer);
  throw new Error("Format file tidak didukung. Gunakan file .docx atau .pdf.");
}

const DOC_STOPWORDS = new Set(["yang","dan","atau","adalah","dengan","untuk","dari","pada","dalam","akan","dapat","oleh","sebagai","tersebut","tidak","juga","secara","para","suatu","sebuah","karena","jika","maka","agar","sehingga","bahwa","seperti","harus","atas","antara","setiap","hal","cara","serta","yaitu","berikut","tentang","tanpa","masing","dua","tiga","satu","lima","empat","tuliskan","jelaskan","sebutkan","berikan","buatlah","bagaimana","mengapa","apa","siapa","kapan"]);

const MC_HEADER_RE = /^(soal\s+)?(pilihan\s*ganda|multiple\s*choice|bagian\s*[ivab1]*\s*[:.\-]?\s*pilihan\s*ganda)\b/i;
const ESSAY_HEADER_RE = /^(soal\s+)?(uraian|essay|esai)\b/i;
const KEY_HEADER_RE = /^(kunci\s*jawaban|jawaban\s*benar|answer\s*key|kunci)\b/i;
const QUESTION_RE = /^(\d{1,3})[.)]\s*(.+)$/;
const OPTION_RE = /^([A-Ea-e])[.)]\s*(.+)$/;

function isHeaderLine(line) {
  return MC_HEADER_RE.test(line) || ESSAY_HEADER_RE.test(line) || KEY_HEADER_RE.test(line);
}

function extractKeySection(lines) {
  const keyStart = lines.findIndex(l => KEY_HEADER_RE.test(l));
  if (keyStart === -1) return { keyLines: [], remaining: lines };
  let keyEnd = lines.length;
  for (let i = keyStart + 1; i < lines.length; i++) {
    if (MC_HEADER_RE.test(lines[i]) || ESSAY_HEADER_RE.test(lines[i])) { keyEnd = i; break; }
  }
  // Tangkap isi kunci jika berada di baris yang sama dengan judul (mis. "Kunci Jawaban: 1.C 2.B")
  const headerLine = lines[keyStart];
  const trailing = headerLine.replace(KEY_HEADER_RE, "").replace(/^[:\s.\-]+/, "").trim();
  const keyLines = (trailing ? [trailing] : []).concat(lines.slice(keyStart + 1, keyEnd));
  const remaining = lines.slice(0, keyStart).concat(lines.slice(keyEnd));
  return { keyLines, remaining };
}

function parseAnswerKey(keyLines) {
  const text = keyLines.join(" ");
  const re = /(\d{1,3})\s*[.):=\-]?\s*([A-Ea-e])\b/g;
  const map = {};
  let m;
  while ((m = re.exec(text)) !== null) {
    map[parseInt(m[1], 10)] = m[2].toUpperCase();
  }
  return map;
}

function extractKeywords(text, max = 8) {
  const words = (text.toLowerCase().match(/\p{L}+/gu) || []);
  const seen = new Set();
  const out = [];
  for (const w of words) {
    if (w.length >= 4 && !DOC_STOPWORDS.has(w) && !seen.has(w)) {
      seen.add(w);
      out.push(w);
      if (out.length >= max) break;
    }
  }
  return out;
}

function parseQuestions(lines) {
  const questions = [];
  let i = 0;
  while (i < lines.length) {
    const qMatch = lines[i].match(QUESTION_RE);
    if (!qMatch) { i++; continue; }
    const number = parseInt(qMatch[1], 10);
    let textParts = [qMatch[2]];
    i++;
    // Kumpulkan baris lanjutan pertanyaan (bukan opsi, bukan nomor soal baru, bukan header)
    while (i < lines.length && !OPTION_RE.test(lines[i]) && !QUESTION_RE.test(lines[i]) && !isHeaderLine(lines[i])) {
      textParts.push(lines[i]);
      i++;
    }
    const qText = textParts.join(" ").replace(/\s+/g, " ").trim();
    // Kumpulkan opsi berurutan (A-E)
    const opts = [];
    while (i < lines.length) {
      const optMatch = lines[i].match(OPTION_RE);
      if (!optMatch) break;
      opts.push(optMatch[2].trim());
      i++;
    }
    questions.push({ number, text: qText, opts });
  }
  return questions;
}

function parseExamDocument(rawText) {
  const warnings = [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const { keyLines, remaining } = extractKeySection(lines);
  const workingLines = remaining.filter(l => !isHeaderLine(l));
  const rawQuestions = parseQuestions(workingLines);
  const keyMap = parseAnswerKey(keyLines);

  const mcRaw = rawQuestions.filter(q => q.opts.length >= 2);
  const essayRaw = rawQuestions.filter(q => q.opts.length < 2);

  const mc = mcRaw.map(q => {
    const letter = keyMap[q.number];
    const ans = letter ? (letter.charCodeAt(0) - 65) : null;
    if (ans === null || ans >= q.opts.length) {
      warnings.push(`Soal PG nomor ${q.number}: kunci jawaban tidak ditemukan/tidak valid — mohon pilih jawaban benar secara manual di Bank Soal.`);
    }
    return { q: q.text, opts: q.opts, ans: (ans !== null && ans < q.opts.length) ? ans : 0, _needsReview: (ans === null || ans >= q.opts.length) };
  });

  const essayCount = essayRaw.length;
  const base = essayCount ? Math.floor(100 / essayCount) : 0;
  const rem = essayCount ? 100 - base * essayCount : 0;
  const essay = essayRaw.map((q, idx) => ({
    q: q.text,
    keywords: extractKeywords(q.text),
    maxScore: base + (idx < rem ? 1 : 0)
  }));

  if (keyLines.length && Object.keys(keyMap).length === 0) {
    warnings.push("Bagian kunci jawaban terdeteksi tetapi polanya tidak dikenali. Semua jawaban PG perlu ditinjau manual.");
  }
  if (!mc.length && !essay.length) {
    warnings.push("Tidak ada soal yang berhasil terdeteksi dari dokumen. Anda tetap bisa menambahkan soal secara manual di Bank Soal setelah mata pelajaran ini dibuat.");
  }
  essay.forEach(e => { if (e.keywords.length < 3) warnings.push(`Soal essay "${e.q.slice(0,40)}..." — kata kunci penilaian otomatis hanya sedikit ditemukan, sebaiknya ditinjau/ditambah manual.`); });

  return { mc, essay, warnings };
}

if (typeof module !== "undefined") {
  module.exports = { parseExamDocument, extractKeywords, parseAnswerKey, extractKeySection, parseQuestions };
}
