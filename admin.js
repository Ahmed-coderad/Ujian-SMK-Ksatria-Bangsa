/* ============================================================
   ADMIN.js — dasbor administrator portal ujian
   ============================================================ */

const root = document.getElementById("app");
const DEFAULT_ADMIN_PASSWORD = "Rad870773!";

let state = {
  authed: false,
  section: "dashboard",
  attempts: [],
  filterKelas: "",
  filterMapel: "",
  filterStatus: "",
  detailAttemptId: null,
  editingExamId: Object.keys(EXAMS)[0],
  editingExamData: null,
  roster: [],
  schedule: {},
  customExams: {},
  importResult: null
};
let _unsubAttempts = null, _unsubRoster = null, _unsubSchedule = null, _unsubCustomExams = null;

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c === null || c === undefined) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}
function fmtSec(sec) {
  const m = Math.floor(sec/60), s = Math.floor(sec%60);
  return `${m}m ${s.toString().padStart(2,"0")}s`;
}
/* Semua mapel yang tersedia = bawaan (data.js) + tambahan (dibuat admin
   manual atau lewat impor dokumen). Dipakai di seluruh dasbor admin
   sehingga mapel baru langsung muncul di setiap menu terkait. */
function getAllExamsMap() { return Object.assign({}, EXAMS, state.customExams); }
function allClassSubjectKeys() { return Object.keys(getAllExamsMap()); }
function getClassSubjectMapMerged() {
  const map = {};
  Object.entries(CLASS_SUBJECT_MAP).forEach(([k, list]) => { map[k] = [...list]; });
  Object.values(state.customExams || {}).forEach(ex => {
    if (!ex || !ex.kelas || !ex.mapel) return;
    if (!map[ex.kelas]) map[ex.kelas] = [];
    if (!map[ex.kelas].includes(ex.mapel)) map[ex.kelas].push(ex.mapel);
  });
  return map;
}

async function ensureAdminPassword() {
  if (Cloud.ready()) { await Cloud.ensureAdminPassword(DEFAULT_ADMIN_PASSWORD); return; }
  const pw = await ExamDB.getSetting("adminPassword");
  if (!pw) await ExamDB.setSetting("adminPassword", DEFAULT_ADMIN_PASSWORD);
}
async function checkAdminPassword(input) {
  if (Cloud.ready()) return Cloud.verifyAdminPassword(input);
  const correct = await ExamDB.getSetting("adminPassword");
  return input === correct;
}

/* Setelah login berhasil, berlangganan data secara real-time (jika
   penyimpanan terpusat aktif) supaya hasil ujian & data siswa dari
   88 peserta yang masuk dari perangkat lain langsung terlihat di
   dasbor ini tanpa perlu memuat ulang halaman. */
function subscribeAdminData() {
  if (Cloud.ready()) {
    _unsubAttempts = Cloud.watchAttempts(list => {
      if (list === null) return; // belum siap
      state.attempts = list.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      if (state.authed) render();
    });
    _unsubRoster = Cloud.watchRoster(list => { state.roster = list; if (state.authed && state.section === "roster") render(); });
    _unsubSchedule = Cloud.watchSchedule(sc => { state.schedule = sc; if (state.authed && state.section === "schedule") render(); });
    _unsubCustomExams = Cloud.watchCustomExams(list => { state.customExams = list || {}; if (state.authed) render(); });
  }
}
async function loadAttempts() {
  if (Cloud.ready()) {
    state.attempts = (await new Promise(resolve => {
      const off = Cloud.watchAttempts(list => { off(); resolve(list || []); });
    }));
  } else {
    state.attempts = await ExamDB.getAllAttempts();
  }
  state.attempts.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}
async function loadRoster() {
  if (Cloud.ready()) { state.roster = (await Cloud.getRoster()) || []; return; }
  state.roster = (await ExamDB.getSetting("roster")) || [];
}
async function loadSchedule() {
  state.schedule = await getScheduleShared();
}
async function loadCustomExams() {
  state.customExams = await getCustomExamsShared();
}

async function render() {
  root.innerHTML = "";
  if (!state.authed) { root.appendChild(await renderLogin()); return; }
  root.appendChild(await renderShell());
}

/* ---------------- LOGIN ---------------- */
async function renderLogin() {
  await ensureAdminPassword();
  const wrap = el("div", { class: "login-shell" });
  const card = el("div", { class: "card doc-card", style: "max-width:420px;width:100%;" });
  card.appendChild(el("div", { class: "seal", style: "margin:0 auto 16px;" }, el("div", { class: "seal-label" }, "Akses Terbatas")));
  card.appendChild(el("h3", { style: "text-align:center;font-family:var(--font-display);color:var(--c-primary-dark);" }, "Portal Administrator"));
  card.appendChild(el("p", { class: "muted text-center" }, "Masuk untuk mengelola soal, memantau ujian, dan mengunduh rekap nilai."));

  const errBox = el("div", { class: "hidden" });
  const pwField = el("input", { type: "password", placeholder: "Kata sandi admin" });
  card.appendChild(errBox);
  card.appendChild(el("div", { class: "field" }, [el("label", {}, "Kata Sandi"), pwField]));

  const btn = el("button", { class: "btn btn-primary btn-block" }, "Masuk");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const ok = await checkAdminPassword(pwField.value);
    btn.disabled = false;
    if (ok) {
      state.authed = true;
      await loadAttempts();
      await loadRoster();
      await loadSchedule();
      await loadCustomExams();
      subscribeAdminData();
      render();
    } else {
      errBox.className = "alert alert-danger";
      errBox.textContent = "Kata sandi salah. Silakan coba lagi.";
    }
  });
  pwField.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); });
  card.appendChild(el("div", { class: "mt-16" }, btn));
  wrap.appendChild(card);
  return wrap;
}

/* ---------------- SHELL ---------------- */
async function renderShell() {
  const shell = el("div", { class: "admin-shell" });
  const nav = el("div", { class: "admin-nav" });
  nav.appendChild(el("div", { class: "brand" }, "Panel Admin"));
  const items = [
    ["dashboard", "\uD83D\uDCCA Dasbor"],
    ["results", "\uD83D\uDCDD Hasil Ujian"],
    ["bank", "\uD83D\uDCDA Bank Soal"],
    ["import", "\uD83D\uDCC4 Impor Soal (Word/PDF)"],
    ["roster", "\uD83D\uDC65 Data Siswa & Kelas"],
    ["schedule", "\uD83D\uDDD3\uFE0F Jadwal Ujian"],
    ["settings", "\u2699\uFE0F Pengaturan"]
  ];
  items.forEach(([key, label]) => {
    const b = el("button", { class: state.section === key ? "active" : "" }, label);
    b.addEventListener("click", () => {
      if (state.section === "import" && key !== "import") state.importResult = null;
      state.section = key; state.detailAttemptId = null; render();
    });
    nav.appendChild(b);
  });
  const logoutBtn = el("button", { style: "margin-top:16px;color:#ffd9d4;" }, "\u2190 Keluar");
  logoutBtn.addEventListener("click", () => {
    if (_unsubAttempts) { _unsubAttempts(); _unsubAttempts = null; }
    if (_unsubRoster) { _unsubRoster(); _unsubRoster = null; }
    if (_unsubSchedule) { _unsubSchedule(); _unsubSchedule = null; }
    if (_unsubCustomExams) { _unsubCustomExams(); _unsubCustomExams = null; }
    state.authed = false; render();
  });
  nav.appendChild(logoutBtn);
  shell.appendChild(nav);

  const main = el("div", { class: "admin-main" });
  if (state.section === "dashboard") main.appendChild(await renderDashboard());
  else if (state.section === "results") main.appendChild(state.detailAttemptId ? await renderResultDetail() : await renderResults());
  else if (state.section === "bank") main.appendChild(await renderBank());
  else if (state.section === "import") main.appendChild(await renderImport());
  else if (state.section === "roster") main.appendChild(await renderRoster());
  else if (state.section === "schedule") main.appendChild(await renderSchedule());
  else if (state.section === "settings") main.appendChild(await renderSettings());
  shell.appendChild(main);
  return shell;
}

/* ---------------- DASHBOARD ---------------- */
async function renderDashboard() {
  const wrap = el("div", {});
  wrap.appendChild(el("div", { class: "admin-header" }, el("h2", {}, "Dasbor Ringkasan")));

  if (Cloud.ready()) {
    wrap.appendChild(el("div", { class: "alert alert-success" }, "\u2713 Penyimpanan terpusat aktif — mendukung hingga 88 peserta ujian dan 1 administrator secara bersamaan, dengan hasil dan bank soal tersinkron otomatis ke semua perangkat."));
  } else {
    wrap.appendChild(el("div", { class: "alert alert-danger" }, "Penyimpanan terpusat (Firebase) belum aktif. Data (soal, siswa, hasil) hanya tersimpan di perangkat ini. Isi firebase-config.js sesuai README agar berlaku untuk semua perangkat siswa & guru."));
  }

  const total = state.attempts.length;
  const avg = total ? Math.round(state.attempts.reduce((s,a)=>s+a.finalScore,0)/total) : 0;
  const violations = state.attempts.filter(a => a.reason === "pelanggaran").length;
  const totalStrikes = state.attempts.reduce((s,a)=>s+(a.exitStrikes||0),0);

  const stats = el("div", { class: "stat-grid" });
  [["Total Peserta", total], ["Rata-rata Skor", avg], ["Ujian Dihentikan (Pelanggaran)", violations], ["Total Insiden Keluar Halaman", totalStrikes]]
    .forEach(([lbl, num]) => stats.appendChild(el("div", { class: "stat-card" }, [el("div", { class: "num" }, String(num)), el("div", { class: "lbl" }, lbl)])));
  wrap.appendChild(stats);

  wrap.appendChild(el("h3", { style: "font-family:var(--font-display);color:var(--c-primary-dark);" }, "Rekap per Kelas & Mata Pelajaran"));
  const table = el("table", { class: "ledger" });
  table.appendChild(el("tr", {}, ["Kelas", "Mata Pelajaran", "Peserta", "Rata-rata Skor", "Pelanggaran"].map(h => el("th", {}, h))));
  allClassSubjectKeys().forEach(key => {
    const exam = getAllExamsMap()[key];
    const rows = state.attempts.filter(a => a.examId === key);
    const avgS = rows.length ? Math.round(rows.reduce((s,a)=>s+a.finalScore,0)/rows.length) : "-";
    const viol = rows.filter(a=>a.reason==="pelanggaran").length;
    table.appendChild(el("tr", {}, [
      el("td", {}, exam.kelas), el("td", {}, exam.mapel), el("td", {}, String(rows.length)), el("td", {}, String(avgS)), el("td", {}, String(viol))
    ]));
  });
  wrap.appendChild(table);

  wrap.appendChild(el("h3", { style: "font-family:var(--font-display);color:var(--c-primary-dark);margin-top:24px;" }, "Pengumpulan Terbaru"));
  const recent = state.attempts.slice(0, 6);
  if (!recent.length) wrap.appendChild(el("p", { class: "muted" }, "Belum ada data ujian yang masuk."));
  else {
    const t2 = el("table", { class: "ledger" });
    t2.appendChild(el("tr", {}, ["Nama", "Kelas", "Mapel", "Skor", "Status", "Waktu"].map(h => el("th", {}, h))));
    recent.forEach(a => t2.appendChild(el("tr", {}, [
      el("td", {}, a.nama), el("td", {}, a.kelas), el("td", {}, a.mapel), el("td", {}, String(a.finalScore)),
      el("td", {}, statusTag(a)), el("td", {}, new Date(a.submittedAt).toLocaleString("id-ID"))
    ])));
    wrap.appendChild(t2);
  }
  return wrap;
}

function statusTag(a) {
  const span = document.createElement("span");
  if (a.reason === "pelanggaran") { span.className = "tag tag-danger"; span.textContent = "Pelanggaran"; }
  else if (a.reason === "waktu") { span.className = "tag tag-warn"; span.textContent = "Waktu Habis"; }
  else { span.className = "tag tag-ok"; span.textContent = "Selesai"; }
  return span;
}

/* ---------------- RESULTS ---------------- */
async function renderResults() {
  const wrap = el("div", {});
  const header = el("div", { class: "admin-header" });
  header.appendChild(el("h2", {}, "Hasil Ujian"));
  const exportBtn = el("button", { class: "btn btn-accent btn-sm" }, "\u2b07 Unduh Excel (.xlsx)");
  exportBtn.addEventListener("click", async () => {
    const original = exportBtn.textContent;
    exportBtn.disabled = true; exportBtn.textContent = "Menyiapkan file...";
    try { await exportToExcel(filteredAttempts()); }
    finally { exportBtn.disabled = false; exportBtn.textContent = original; }
  });
  header.appendChild(exportBtn);
  wrap.appendChild(header);

  const filters = el("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;" });
  const kelasSel = el("select", { style: "width:auto;padding:8px 10px;border:1.5px solid #cdd6dd;border-radius:7px;" });
  kelasSel.appendChild(el("option", { value: "" }, "Semua Kelas"));
  Object.keys(getClassSubjectMapMerged()).forEach(k => kelasSel.appendChild(el("option", { value: k, ...(state.filterKelas===k?{selected:"selected"}:{}) }, k)));
  kelasSel.addEventListener("change", () => { state.filterKelas = kelasSel.value; render(); });

  const mapelSel = el("select", { style: "width:auto;padding:8px 10px;border:1.5px solid #cdd6dd;border-radius:7px;" });
  mapelSel.appendChild(el("option", { value: "" }, "Semua Mapel"));
  [...new Set(Object.values(getClassSubjectMapMerged()).flat())].forEach(m => mapelSel.appendChild(el("option", { value: m, ...(state.filterMapel===m?{selected:"selected"}:{}) }, m)));
  mapelSel.addEventListener("change", () => { state.filterMapel = mapelSel.value; render(); });

  filters.appendChild(kelasSel); filters.appendChild(mapelSel);
  wrap.appendChild(filters);

  const rows = filteredAttempts();
  const table = el("table", { class: "ledger" });
  table.appendChild(el("tr", {}, ["Nama", "Kelas", "Mapel", "Skor PG", "Skor Essay", "Skor Akhir", "Pelanggaran", "Status", "Aksi"].map(h => el("th", {}, h))));
  if (!rows.length) {
    table.appendChild(el("tr", {}, el("td", { colspan: "9", class: "muted text-center" }, "Tidak ada data.")));
  }
  rows.forEach(a => {
    const detailBtn = el("button", { class: "btn btn-outline btn-sm" }, "Lihat Detail");
    detailBtn.addEventListener("click", () => { state.detailAttemptId = a.id; render(); });
    const delBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Hapus");
    delBtn.addEventListener("click", async () => {
      if (confirm(`Hapus hasil ujian ${a.nama}?`)) {
        await ExamDB.deleteAttempt(a.id);
        await ExamDB.deleteSnapshotsByAttempt(a.id);
        if (Cloud.ready()) await Cloud.deleteAttempt(a.id);
        await loadAttempts();
        render();
      }
    });
    table.appendChild(el("tr", {}, [
      el("td", {}, a.nama), el("td", {}, a.kelas), el("td", {}, a.mapel),
      el("td", {}, `${a.mcCorrect}/${a.mcTotal}`), el("td", {}, `${a.essayRawScore}/${a.essayRawMax}`),
      el("td", {}, el("b", {}, String(a.finalScore))),
      el("td", {}, a.exitStrikes > 0 ? el("span", { class: "badge-strike" }, String(a.exitStrikes)) : "0"),
      el("td", {}, statusTag(a)),
      el("td", {}, el("div", { style: "display:flex;gap:6px;" }, [detailBtn, delBtn]))
    ]));
  });
  wrap.appendChild(table);
  return wrap;
}
function filteredAttempts() {
  return state.attempts.filter(a => (!state.filterKelas || a.kelas === state.filterKelas) && (!state.filterMapel || a.mapel === state.filterMapel));
}

async function renderResultDetail() {
  const a = state.attempts.find(x => x.id === state.detailAttemptId);
  const wrap = el("div", {});
  if (!a) { wrap.appendChild(el("p", {}, "Data tidak ditemukan.")); return wrap; }

  const header = el("div", { class: "admin-header" });
  header.appendChild(el("h2", {}, `Detail Ujian — ${a.nama}`));
  const backBtn = el("button", { class: "btn btn-outline btn-sm" }, "\u2190 Kembali ke Daftar");
  backBtn.addEventListener("click", () => { state.detailAttemptId = null; render(); });
  header.appendChild(backBtn);
  wrap.appendChild(header);

  const infoCard = el("div", { class: "card doc-card mb-16" });
  const infoGrid = el("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;font-size:.88rem;" });
  [["Kelas", a.kelas], ["Mata Pelajaran", a.mapel], ["Guru", a.guru], ["Nomor Dokumen", a.docNumber],
   ["Waktu Kumpul", new Date(a.submittedAt).toLocaleString("id-ID")], ["Durasi Dipakai", fmtSec(a.timeUsedSec)],
   ["Pelanggaran", `${a.exitStrikes} kali`], ["Status Akhir", a.status]]
    .forEach(([k,v]) => infoGrid.appendChild(el("div", {}, [el("div", { class: "muted", style:"font-size:.72rem;text-transform:uppercase;" }, k), el("div", { style:"font-weight:600;" }, String(v))])));
  infoCard.appendChild(infoGrid);
  wrap.appendChild(infoCard);

  const exam = getAllExamsMap()[a.examId];

  // MC breakdown
  const mcCard = el("div", { class: "card doc-card mb-16" });
  mcCard.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, `Pilihan Ganda — ${a.mcCorrect}/${a.mcTotal} benar (skor ${a.mcScore})`));
  const mcTable = el("table", { class: "ledger" });
  mcTable.appendChild(el("tr", {}, ["No", "Jawaban Siswa", "Kunci", "Hasil"].map(h=>el("th",{},h))));
  exam.mc.forEach((q, i) => {
    const chosen = a.mcAnswers[i];
    const ok = chosen === q.ans;
    mcTable.appendChild(el("tr", {}, [
      el("td", {}, String(i+1)),
      el("td", {}, chosen !== undefined ? `${String.fromCharCode(65+chosen)}. ${q.opts[chosen]}` : "(kosong)"),
      el("td", {}, `${String.fromCharCode(65+q.ans)}. ${q.opts[q.ans]}`),
      el("td", {}, el("span", { class: `tag ${ok?"tag-ok":"tag-danger"}` }, ok ? "Benar" : "Salah"))
    ]));
  });
  mcCard.appendChild(mcTable);
  wrap.appendChild(mcCard);

  // Essay breakdown
  const esCard = el("div", { class: "card doc-card mb-16" });
  esCard.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, `Uraian / Essay \u2014 estimasi otomatis ${a.essayRawScore}/${a.essayRawMax} (skor ${a.essayScore})`));
  esCard.appendChild(el("p", { class: "alert alert-info" }, "Skor essay berikut adalah estimasi otomatis berbasis kesesuaian kata kunci & kelengkapan jawaban. Guru dapat menimbang ulang secara manual berdasarkan pembacaan langsung di bawah ini."));
  exam.essay.forEach((q, i) => {
    const d = a.essayDetail[i];
    const ratio = d.maxScore ? d.score / d.maxScore : 0;
    const pillClass = ratio >= 0.7 ? "ok" : ratio >= 0.4 ? "warn" : "danger";
    const answered = (a.essayAnswers[i] || "").trim();
    const box = el("div", { class: "essay-review" });
    box.appendChild(el("div", { class: "eq-head" }, [
      el("div", { class: "eq-question" }, [el("span", { class: "qnum" }, String(i+1)), q.q]),
      el("span", { class: `score-pill ${pillClass}` }, `${d.score} / ${d.maxScore}`)
    ]));
    box.appendChild(el("div", { class: `essay-answer-box ${answered ? "" : "empty"}` }, answered || "(tidak dijawab)"));
    box.appendChild(el("div", { class: "essay-meta-row" }, [
      el("span", {}, ["Kata kunci cocok: ", el("b", {}, `${d.kwHits}/${d.kwTotal}`)]),
      el("span", {}, ["Jumlah kata: ", el("b", {}, String(d.wordCount))])
    ]));
    esCard.appendChild(box);
  });
  wrap.appendChild(esCard);

  // Proctoring
  const procCard = el("div", { class: "card doc-card mb-16" });
  procCard.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, "Bukti Pengawasan (Proctoring)"));
  // Cuplikan foto (seperti rekaman audio) sengaja hanya tersimpan lokal
  // di perangkat yang dipakai siswa — tidak dikirim ke penyimpanan terpusat.
  const snaps = await ExamDB.getSnapshotsByAttempt(a.id);
  if (!snaps.length) {
    procCard.appendChild(el("p", { class: "muted" }, "Tidak ada cuplikan kamera tersimpan di perangkat ini untuk sesi ini. Catatan: cuplikan foto hanya tersimpan lokal di perangkat/browser yang dipakai siswa mengerjakan ujian (tidak dikirim ke server pusat, sama seperti rekaman audio), jadi hanya terlihat bila dasbor ini dibuka di perangkat yang sama."));
  }
  else {
    const gallery = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;" });
    snaps.forEach(s => {
      const fig = el("figure", { style: "margin:0;text-align:center;" }, [
        el("img", { src: s.image, style: "width:110px;border-radius:6px;border:1px solid #ddd;display:block;" }),
        el("figcaption", { class: "muted", style: "font-size:.65rem;" }, new Date(s.time).toLocaleTimeString("id-ID"))
      ]);
      gallery.appendChild(fig);
    });
    procCard.appendChild(gallery);
  }
  // Rekaman audio HANYA dapat diputar dari dasbor admin (di sini) — peserta
  // tidak pernah diberi kendali putar/unduh selama maupun setelah ujian.
  if (a.audioBlob) {
    const url = URL.createObjectURL(a.audioBlob);
    const audio = el("audio", { controls: "controls", src: url, style: "width:100%;margin-top:6px;" });
    procCard.appendChild(el("div", { class: "muted", style:"font-size:.78rem;margin-top:14px;" }, "\uD83D\uDD10 Rekaman audio sesi ujian (khusus admin — tidak dapat diakses/didengar oleh peserta):"));
    procCard.appendChild(audio);
    const dl = el("a", { href: url, download: `audio_${a.nama}_${a.docNumber || a.id}.webm`.replace(/\s+/g,"_"), class: "btn btn-outline btn-sm mt-8" }, "\u2B07 Unduh Rekaman Audio");
    procCard.appendChild(dl);
  } else {
    procCard.appendChild(el("p", { class: "muted mt-8" }, "Tidak ada rekaman audio tersimpan untuk sesi ini di perangkat ini. Catatan: rekaman audio hanya tersimpan lokal di perangkat/browser yang dipakai siswa mengerjakan ujian dan hanya dapat diputar dari dasbor admin (tidak pernah dari sisi peserta) — jadi hanya terlihat bila dasbor ini dibuka di perangkat yang sama."));
  }
  wrap.appendChild(procCard);

  return wrap;
}

/* ---------------- BANK SOAL ---------------- */
async function renderBank() {
  const wrap = el("div", {});
  wrap.appendChild(el("div", { class: "admin-header" }, el("h2", {}, "Bank Soal")));

  const sel = el("select", { style: "width:auto;padding:8px 10px;border:1.5px solid #cdd6dd;border-radius:7px;margin-bottom:16px;" });
  allClassSubjectKeys().forEach(key => sel.appendChild(el("option", { value: key, ...(state.editingExamId===key?{selected:"selected"}:{}) }, `${getAllExamsMap()[key].kelas} — ${getAllExamsMap()[key].mapel}`)));
  sel.addEventListener("change", async () => { state.editingExamId = sel.value; state.editingExamData = null; render(); });
  wrap.appendChild(sel);

  if (!state.editingExamData || state.editingExamData.id !== state.editingExamId) {
    state.editingExamData = JSON.parse(JSON.stringify(await getEffectiveExam(state.editingExamId)));
  }
  const exam = state.editingExamData;
  const isBuiltIn = state.editingExamId in EXAMS;

  if (isBuiltIn) {
    const resetBtn = el("button", { class: "btn btn-ghost btn-sm", style:"margin-left:10px;" }, "Kembalikan ke Soal Bawaan");
    resetBtn.addEventListener("click", async () => {
      if (confirm("Kembalikan seluruh soal mapel ini ke versi bawaan (menghapus perubahan admin)?")) {
        await resetExamOverride(state.editingExamId);
        state.editingExamData = null;
        render();
      }
    });
    wrap.appendChild(resetBtn);
  } else {
    const delExamBtn = el("button", { class: "btn btn-ghost btn-sm", style:"margin-left:10px;color:var(--c-danger);" }, "\uD83D\uDDD1 Hapus Mata Pelajaran Ini");
    delExamBtn.addEventListener("click", async () => {
      if (confirm(`Hapus mata pelajaran "${exam.mapel}" untuk kelas ${exam.kelas} beserta seluruh soalnya? Tindakan ini tidak bisa dibatalkan. Hasil ujian yang sudah masuk tidak akan terhapus.`)) {
        await deleteCustomExamShared(state.editingExamId);
        state.customExams = await getCustomExamsShared();
        state.editingExamId = Object.keys(getAllExamsMap())[0];
        state.editingExamData = null;
        render();
      }
    });
    wrap.appendChild(delExamBtn);
    wrap.appendChild(el("span", { class: "tag tag-warn", style:"margin-left:10px;" }, "Mapel Tambahan"));
  }

  const mcSection = el("div", { class: "card doc-card mt-16" });
  mcSection.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, `Soal Pilihan Ganda (${exam.mc.length})`));
  exam.mc.forEach((q, i) => {
    const box = el("div", { class: "qcard" });
    const headRow = el("div", { style:"display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;" });
    headRow.appendChild(el("div", { style:"font-weight:700;" }, `Soal No. ${i+1}${q._needsReview ? " \u26A0\uFE0F perlu ditinjau" : ""}`));
    const delQBtn = el("button", { class: "btn btn-ghost btn-sm" }, "\uD83D\uDDD1 Hapus Soal");
    delQBtn.addEventListener("click", () => {
      if (exam.mc.length <= 1) { alert("Minimal harus ada 1 soal pilihan ganda."); return; }
      if (confirm(`Hapus soal PG No. ${i+1}?`)) { exam.mc.splice(i, 1); render(); }
    });
    headRow.appendChild(delQBtn);
    box.appendChild(headRow);
    const qInput = el("textarea", { style: `width:100%;min-height:50px;margin-bottom:8px;padding:8px;border:1.5px solid ${q._needsReview ? "var(--c-danger)" : "#cdd6dd"};border-radius:6px;` }, q.q);
    qInput.addEventListener("input", () => q.q = qInput.value);
    box.appendChild(qInput);
    q.opts.forEach((opt, oi) => {
      const row = el("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:6px;" });
      const radio = el("input", { type: "radio", name: `ans_${i}`, ...(q.ans===oi?{checked:"checked"}:{}) });
      radio.addEventListener("change", () => { q.ans = oi; q._needsReview = false; });
      const optInput = el("input", { type: "text", value: opt, style: "flex:1;padding:7px 9px;border:1.5px solid #cdd6dd;border-radius:6px;" });
      optInput.addEventListener("input", () => q.opts[oi] = optInput.value);
      row.appendChild(radio); row.appendChild(el("span", { class:"muted", style:"width:16px;" }, String.fromCharCode(65+oi))); row.appendChild(optInput);
      box.appendChild(row);
    });
    mcSection.appendChild(box);
  });
  const addMcBtn = el("button", { class: "btn btn-outline btn-sm mt-8" }, "\u2795 Tambah Soal Pilihan Ganda");
  addMcBtn.addEventListener("click", () => {
    exam.mc.push({ q: "", opts: ["", "", "", "", ""], ans: 0 });
    render();
  });
  mcSection.appendChild(addMcBtn);
  wrap.appendChild(mcSection);

  const esSection = el("div", { class: "card doc-card mt-16" });
  esSection.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, `Soal Uraian / Essay (${exam.essay.length}) \u2014 total bobot ${exam.essay.reduce((s,q)=>s+(q.maxScore||0),0)}/100`));
  exam.essay.forEach((q, i) => {
    const box = el("div", { class: "essay-review" });
    const headRow = el("div", { style:"font-weight:700;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;" });
    headRow.appendChild(el("div", { style:"display:flex;align-items:center;" }, [el("span", { class: "qnum" }, String(i+1)), `Soal No. ${i+1} (bobot ${q.maxScore})`]));
    const delQBtn = el("button", { class: "btn btn-ghost btn-sm" }, "\uD83D\uDDD1 Hapus Soal");
    delQBtn.addEventListener("click", () => {
      if (exam.essay.length <= 1) { alert("Minimal harus ada 1 soal essay."); return; }
      if (confirm(`Hapus soal essay No. ${i+1}?`)) { exam.essay.splice(i, 1); redistributeEssayScores(exam.essay); render(); }
    });
    headRow.appendChild(delQBtn);
    box.appendChild(headRow);
    const qInput = el("textarea", { class: "essay-input", style: "min-height:70px;margin-bottom:10px;" }, q.q);
    qInput.addEventListener("input", () => q.q = qInput.value);
    box.appendChild(qInput);
    box.appendChild(el("div", { class: "essay-label" }, "\uD83D\uDD11 Kata Kunci Penilaian Otomatis"));
    box.appendChild(el("div", { class: "field-hint", style:"margin-top:-4px;" }, "Pisahkan tiap kata kunci dengan koma. Jawaban siswa dinilai otomatis dari jumlah kata kunci berikut yang muncul di jawabannya."));
    const kwInput = el("input", { type: "text", value: q.keywords.join(", "), style:"width:100%;padding:11px 13px;border:1.5px solid #cdd6dd;border-radius:7px;margin-top:8px;font-family:var(--font-body);font-size:.95rem;" });
    kwInput.addEventListener("input", () => q.keywords = kwInput.value.split(",").map(s=>s.trim()).filter(Boolean));
    box.appendChild(kwInput);
    esSection.appendChild(box);
  });
  const addEssayBtn = el("button", { class: "btn btn-outline btn-sm mt-8" }, "\u2795 Tambah Soal Essay");
  addEssayBtn.addEventListener("click", () => {
    exam.essay.push({ q: "", keywords: [], maxScore: 0 });
    redistributeEssayScores(exam.essay);
    render();
  });
  esSection.appendChild(addEssayBtn);
  esSection.appendChild(el("div", { class: "field-hint mt-8" }, "Bobot tiap soal essay otomatis dibagi rata dari total 100 setiap kali soal ditambah/dihapus."));
  wrap.appendChild(esSection);

  const saveBtn = el("button", { class: "btn btn-primary mt-16" }, "Simpan Perubahan Soal");
  saveBtn.addEventListener("click", async () => {
    if (exam.mc.some(q => !q.q.trim() || q.opts.some(o => !o.trim()))) { alert("Ada soal PG dengan pertanyaan/opsi yang masih kosong. Lengkapi dahulu sebelum menyimpan."); return; }
    if (exam.essay.some(q => !q.q.trim())) { alert("Ada soal essay dengan pertanyaan yang masih kosong. Lengkapi dahulu sebelum menyimpan."); return; }
    exam.mc.forEach(q => delete q._needsReview);
    saveBtn.disabled = true; saveBtn.textContent = "Menyimpan...";
    try {
      await saveExamData(state.editingExamId, exam);
      alert("Perubahan soal berhasil disimpan.");
    } finally { saveBtn.disabled = false; saveBtn.textContent = "Simpan Perubahan Soal"; }
  });
  wrap.appendChild(saveBtn);

  return wrap;
}

/* ---------------- IMPOR SOAL DARI DOKUMEN (Word/PDF) ---------------- */
async function renderImport() {
  const wrap = el("div", {});
  wrap.appendChild(el("div", { class: "admin-header" }, el("h2", {}, "Impor Soal dari Dokumen")));
  wrap.appendChild(el("p", { class: "muted" }, "Unggah naskah soal dalam format Word (.docx) atau PDF. Sistem akan otomatis membaca soal pilihan ganda beserta kunci jawabannya, dan soal uraian/essay beserta kata kunci penilaian otomatis — lalu membuatkan mata pelajaran baru siap pakai untuk kelas yang Anda pilih. Format yang dikenali: soal diberi nomor (\"1.\" atau \"1)\"), opsi pilihan ganda diberi huruf A-E, dan kunci jawaban dikumpulkan di bagian bertajuk \"KUNCI JAWABAN\"."));
  wrap.appendChild(el("div", { class: "alert alert-info" }, "\u2139\uFE0F Pembacaan dokumen bersifat otomatis dan tetap bisa meleset (terutama tata letak yang tidak umum). Selalu tinjau hasilnya di menu Bank Soal sebelum ujian dibuka untuk siswa."));

  const card = el("div", { class: "card doc-card mt-16" });

  const mapelInput = el("input", { type: "text", list: "mapelSuggest", placeholder: "Contoh: Kearsipan" });
  const mapelList = el("datalist", { id: "mapelSuggest" });
  [...new Set(Object.values(getAllExamsMap()).map(e => e.mapel))].forEach(m => mapelList.appendChild(el("option", { value: m })));
  card.appendChild(mapelList);
  card.appendChild(el("div", { class: "field" }, [el("label", {}, "Nama Mata Pelajaran"), mapelInput]));

  const guruInput = el("input", { type: "text", value: DEFAULT_TEACHER });
  card.appendChild(el("div", { class: "field" }, [el("label", {}, "Guru Pengampu"), guruInput]));

  const semesterInput = el("input", { type: "text", value: "Semester 1" });
  const durasiInput = el("input", { type: "number", min: "5", max: "480", step: "5", value: "60" });
  const row2 = el("div", { style: "display:flex;gap:16px;flex-wrap:wrap;" });
  row2.appendChild(el("div", { class: "field", style: "flex:1;min-width:160px;" }, [el("label", {}, "Semester"), semesterInput]));
  row2.appendChild(el("div", { class: "field", style: "flex:1;min-width:160px;" }, [el("label", {}, "Durasi Ujian (menit)"), durasiInput]));
  card.appendChild(row2);

  card.appendChild(el("div", { class: "essay-label" }, "\uD83C\uDFEB Terapkan untuk Kelas"));
  const kelasBox = el("div", { style: "display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;" });
  const kelasChecks = {};
  function addKelasCheckbox(name, checked) {
    if (kelasChecks[name]) { kelasChecks[name].checked = true; return; }
    const cb = el("input", { type: "checkbox", ...(checked ? { checked: "checked" } : {}) });
    kelasChecks[name] = cb;
    kelasBox.appendChild(el("label", { style: "display:flex;align-items:center;gap:6px;background:#f5f9fc;border:1.5px solid #dbe6ee;border-radius:8px;padding:7px 12px;font-size:.88rem;cursor:pointer;" }, [cb, name]));
  }
  Object.keys(getClassSubjectMapMerged()).forEach(k => addKelasCheckbox(k, false));
  card.appendChild(kelasBox);

  const newKelasInput = el("input", { type: "text", placeholder: "Nama kelas baru, mis. XII TKJ", style: "width:220px;display:inline-block;" });
  const addKelasBtn = el("button", { class: "btn btn-outline btn-sm" }, "\u2795 Tambah Kelas Baru");
  addKelasBtn.addEventListener("click", () => {
    const name = newKelasInput.value.trim();
    if (!name) return;
    addKelasCheckbox(name, true);
    newKelasInput.value = "";
  });
  card.appendChild(el("div", { style: "display:flex;gap:8px;align-items:center;margin-bottom:8px;" }, [newKelasInput, addKelasBtn]));
  card.appendChild(el("div", { class: "field-hint" }, "Centang satu atau beberapa kelas. Soal yang sama akan disalin ke tiap kelas yang dipilih sebagai mata pelajaran tersendiri (bisa diedit terpisah per kelas setelah dibuat)."));

  const fileInput = el("input", { type: "file", accept: ".docx,.pdf", class: "mt-8" });
  card.appendChild(el("div", { class: "field" }, [el("label", {}, "Berkas Naskah Soal (.docx atau .pdf)"), fileInput]));

  const resultBox = el("div", { class: "mt-16" });

  const processBtn = el("button", { class: "btn btn-primary mt-8" }, "\uD83D\uDD0D Proses Dokumen");
  processBtn.addEventListener("click", async () => {
    resultBox.innerHTML = "";
    const mapel = mapelInput.value.trim();
    const guru = guruInput.value.trim() || DEFAULT_TEACHER;
    const semester = semesterInput.value.trim() || "Semester 1";
    const durationMinutes = parseInt(durasiInput.value, 10) || 60;
    const selectedKelas = Object.entries(kelasChecks).filter(([,cb]) => cb.checked).map(([name]) => name);
    const file = fileInput.files[0];

    if (!mapel) { alert("Nama mata pelajaran wajib diisi."); return; }
    if (!selectedKelas.length) { alert("Pilih atau tambahkan minimal satu kelas."); return; }
    if (!file) { alert("Pilih berkas .docx atau .pdf terlebih dahulu."); return; }

    processBtn.disabled = true; processBtn.textContent = "Membaca dokumen...";
    try {
      const text = await extractTextFromFile(file);
      const parsed = parseExamDocument(text);
      state.importResult = { mapel, guru, semester, durationMinutes, selectedKelas, parsed };
      renderImportResult(resultBox);
    } catch (e) {
      resultBox.appendChild(el("div", { class: "alert alert-danger" }, `Gagal memproses dokumen: ${e.message}`));
    } finally {
      processBtn.disabled = false; processBtn.textContent = "\uD83D\uDD0D Proses Dokumen";
    }
  });
  card.appendChild(processBtn);
  card.appendChild(resultBox);
  if (state.importResult) renderImportResult(resultBox);

  wrap.appendChild(card);
  return wrap;
}

function renderImportResult(resultBox) {
  resultBox.innerHTML = "";
  const { mapel, guru, semester, durationMinutes, selectedKelas, parsed } = state.importResult;
  resultBox.appendChild(el("div", { class: "divider" }));
  resultBox.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, "Hasil Pembacaan Dokumen"));

  const summary = el("div", { class: "stat-grid" });
  [["Soal Pilihan Ganda", parsed.mc.length], ["Soal Essay", parsed.essay.length], ["Kelas Terpilih", selectedKelas.length]]
    .forEach(([lbl, num]) => summary.appendChild(el("div", { class: "stat-card" }, [el("div", { class: "num" }, String(num)), el("div", { class: "lbl" }, lbl)])));
  resultBox.appendChild(summary);

  if (parsed.warnings.length) {
    const warnBox = el("div", { class: "alert alert-danger" });
    warnBox.appendChild(el("b", {}, "Perlu ditinjau setelah dibuat:"));
    const ul = el("ul", { style: "margin:6px 0 0;padding-left:18px;" });
    parsed.warnings.forEach(w => ul.appendChild(el("li", {}, w)));
    warnBox.appendChild(ul);
    resultBox.appendChild(warnBox);
  }

  if (!parsed.mc.length && !parsed.essay.length) {
    resultBox.appendChild(el("p", { class: "muted" }, "Tidak ada soal terbaca. Anda tetap bisa lanjut membuat mata pelajaran kosong ini lalu menambahkan soal secara manual di Bank Soal."));
  }

  const conflicts = selectedKelas.map(k => `${k}__${mapel}`).filter(id => id in getAllExamsMap());
  if (conflicts.length) {
    resultBox.appendChild(el("div", { class: "alert alert-danger" }, `Perhatian: mata pelajaran "${mapel}" SUDAH ADA untuk kelas ${conflicts.map(id=>id.split("__")[0]).join(", ")}. Melanjutkan akan MENIMPA soal yang sudah ada di kelas tersebut.`));
  }

  const confirmBtn = el("button", { class: "btn btn-primary mt-8" }, `\u2713 Buat Mata Pelajaran untuk ${selectedKelas.length} Kelas Terpilih`);
  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true; confirmBtn.textContent = "Menyimpan...";
    try {
      for (const kelas of selectedKelas) {
        const examId = `${kelas}__${mapel}`;
        const examData = {
          id: examId, kelas, mapel, guru, semester, kisiKisi: "",
          durationMinutes,
          mc: JSON.parse(JSON.stringify(parsed.mc)).map(q => ({ q: q.q, opts: q.opts, ans: q.ans, ...(q._needsReview ? { _needsReview: true } : {}) })),
          essay: JSON.parse(JSON.stringify(parsed.essay)).map(q => ({ q: q.q, keywords: q.keywords, maxScore: q.maxScore }))
        };
        await saveExamData(examId, examData);
      }
      state.customExams = await getCustomExamsShared();
      state.importResult = null;
      alert(`Berhasil membuat mata pelajaran "${mapel}" untuk ${selectedKelas.length} kelas. Anda akan diarahkan ke Bank Soal untuk meninjau hasilnya.`);
      state.editingExamId = `${selectedKelas[0]}__${mapel}`;
      state.editingExamData = null;
      state.section = "bank";
      render();
    } catch (e) {
      alert(`Gagal menyimpan: ${e.message}`);
    } finally {
      confirmBtn.disabled = false; confirmBtn.textContent = `\u2713 Buat Mata Pelajaran untuk ${selectedKelas.length} Kelas Terpilih`;
    }
  });
  resultBox.appendChild(confirmBtn);
}

/* ---------------- ROSTER ---------------- */
async function renderRoster() {
  const wrap = el("div", {});
  wrap.appendChild(el("div", { class: "admin-header" }, el("h2", {}, "Data Siswa & Kelas")));
  wrap.appendChild(el("p", { class: "muted" }, "Siswa WAJIB terdaftar di sini sebelum dapat login mengerjakan ujian. Nama yang diketik siswa saat login akan dicocokkan persis (tanpa membedakan besar/kecil huruf) dengan daftar ini."));
  if (!Cloud.ready()) {
    wrap.appendChild(el("div", { class: "alert alert-danger" }, "Penyimpanan terpusat (Firebase) belum aktif — data siswa hanya tersimpan di perangkat/browser ini. Lihat README.md untuk mengaktifkan penyimpanan terpusat agar berlaku untuk semua perangkat siswa."));
  }

  const formRow = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;" });
  const nameI = el("input", { type: "text", placeholder: "Nama siswa", style: "flex:2;padding:8px;border:1.5px solid #cdd6dd;border-radius:6px;" });
  const kelasI = el("select", { style: "padding:8px;border:1.5px solid #cdd6dd;border-radius:6px;" });
  Object.keys(getClassSubjectMapMerged()).forEach(k => kelasI.appendChild(el("option", { value: k }, k)));
  const mapelI = el("select", { style: "padding:8px;border:1.5px solid #cdd6dd;border-radius:6px;" });
  function refreshMapelOptions() {
    mapelI.innerHTML = "";
    getClassSubjectMapMerged()[kelasI.value].forEach(m => mapelI.appendChild(el("option", { value: m }, m)));
  }
  kelasI.addEventListener("change", refreshMapelOptions);
  refreshMapelOptions();
  const addBtn = el("button", { class: "btn btn-primary btn-sm" }, "+ Tambah");
  addBtn.addEventListener("click", async () => {
    if (!nameI.value.trim()) return;
    const entry = { nama: nameI.value.trim(), kelas: kelasI.value, mapel: mapelI.value };
    if (Cloud.ready()) {
      await Cloud.addRosterEntry(entry);
    } else {
      state.roster.push(entry);
      await ExamDB.setSetting("roster", state.roster);
    }
    nameI.value = "";
    if (!Cloud.ready()) render();
  });
  formRow.appendChild(nameI); formRow.appendChild(kelasI); formRow.appendChild(mapelI); formRow.appendChild(addBtn);
  wrap.appendChild(formRow);

  const table = el("table", { class: "ledger" });
  table.appendChild(el("tr", {}, ["Nama", "Kelas", "Mata Pelajaran", ""].map(h => el("th", {}, h))));
  if (!state.roster.length) table.appendChild(el("tr", {}, el("td", { colspan: "4", class: "muted text-center" }, "Belum ada data siswa ditambahkan.")));
  state.roster.forEach((r, i) => {
    const delBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Hapus");
    delBtn.addEventListener("click", async () => {
      if (Cloud.ready() && r.id) {
        await Cloud.deleteRosterEntry(r.id);
      } else {
        state.roster.splice(i, 1);
        await ExamDB.setSetting("roster", state.roster);
        render();
      }
    });
    table.appendChild(el("tr", {}, [el("td", {}, r.nama), el("td", {}, r.kelas), el("td", {}, r.mapel), el("td", {}, delBtn)]));
  });
  wrap.appendChild(table);
  return wrap;
}

/* ---------------- JADWAL UJIAN (waktu mulai) ---------------- */
async function renderSchedule() {
  const wrap = el("div", {});
  wrap.appendChild(el("div", { class: "admin-header" }, el("h2", {}, "Jadwal Ujian")));
  wrap.appendChild(el("p", { class: "muted" }, "Tentukan tanggal, bulan, tahun, dan jam pembukaan tiap paket ujian, serta durasi pengerjaannya. WAJIB diisi jadwal mulainya: selama jadwal belum ditentukan di sini, peserta TIDAK DAPAT login untuk paket ujian tersebut sama sekali. Setelah waktu yang ditentukan tiba, peserta dapat login dan mengerjakan ujian selama durasi yang ditetapkan."));
  if (!Cloud.ready()) {
    wrap.appendChild(el("div", { class: "alert alert-danger" }, "Penyimpanan terpusat belum aktif — jadwal hanya tersimpan di perangkat/browser ini."));
  }

  const table = el("table", { class: "ledger" });
  table.appendChild(el("tr", {}, ["Kelas", "Mata Pelajaran", "Waktu Mulai Ujian", "Durasi (menit)", "Status", ""].map(h => el("th", {}, h))));

  allClassSubjectKeys().forEach(key => {
    const exam = getAllExamsMap()[key];
    const current = state.schedule[key.replace(/[.#$/\[\]]/g, "_")] || {};
    const dtInput = el("input", { type: "datetime-local" });
    if (current.startAt) {
      const d = new Date(current.startAt);
      const pad = n => String(n).padStart(2, "0");
      dtInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const durInput = el("input", { type: "number", min: "5", max: "480", step: "5", style: "width:80px;", value: String(effectiveDurationMinutes(current, exam)) });
    let statusTag;
    if (!current.startAt) statusTag = el("span", { class: "tag tag-danger" }, "\uD83D\uDD12 Belum dijadwalkan — login terkunci");
    else if (new Date() < new Date(current.startAt)) statusTag = el("span", { class: "tag tag-warn" }, "\u23F3 Menunggu waktu mulai");
    else statusTag = el("span", { class: "tag tag-ok" }, "\u2713 Dibuka");

    const saveBtn = el("button", { class: "btn btn-primary btn-sm" }, "Simpan Jadwal");
    saveBtn.addEventListener("click", async () => {
      if (!dtInput.value) { alert("Pilih tanggal, bulan, tahun, dan jam mulai ujian terlebih dahulu. Jadwal wajib diisi agar peserta dapat login."); return; }
      const durVal = parseInt(durInput.value, 10);
      if (!durVal || durVal < 5) { alert("Durasi ujian minimal 5 menit."); return; }
      const iso = new Date(dtInput.value).toISOString();
      await setScheduleStartShared(key, iso);
      await setScheduleDurationShared(key, durVal);
      state.schedule = await getScheduleShared(); render();
    });
    const clearBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Hapus Jadwal (Kunci Login)");
    clearBtn.addEventListener("click", async () => {
      if (!confirm(`Hapus jadwal untuk ${exam.kelas} — ${exam.mapel}? Peserta TIDAK AKAN BISA login untuk ujian ini sampai jadwal baru diatur.`)) return;
      dtInput.value = "";
      await setScheduleStartShared(key, null);
      state.schedule = await getScheduleShared(); render();
    });
    table.appendChild(el("tr", {}, [
      el("td", {}, exam.kelas), el("td", {}, exam.mapel),
      el("td", {}, dtInput),
      el("td", {}, durInput),
      el("td", {}, statusTag),
      el("td", {}, el("div", { style: "display:flex;gap:6px;flex-wrap:wrap;" }, [saveBtn, clearBtn]))
    ]));
  });
  wrap.appendChild(table);
  return wrap;
}

/* ---------------- SETTINGS ---------------- */
async function renderSettings() {
  const wrap = el("div", {});
  wrap.appendChild(el("div", { class: "admin-header" }, el("h2", {}, "Pengaturan")));

  const pwCard = el("div", { class: "card doc-card mb-16" });
  pwCard.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, "Ubah Kata Sandi Admin"));
  const oldPw = el("input", { type: "password", placeholder: "Kata sandi saat ini" });
  const newPw = el("input", { type: "password", placeholder: "Kata sandi baru" });
  const msg = el("div", { class: "hidden" });
  pwCard.appendChild(el("div", { class: "field" }, [el("label", {}, "Kata Sandi Saat Ini"), oldPw]));
  pwCard.appendChild(el("div", { class: "field" }, [el("label", {}, "Kata Sandi Baru"), newPw]));
  pwCard.appendChild(msg);
  const saveBtn = el("button", { class: "btn btn-primary" }, "Simpan Kata Sandi");
  saveBtn.addEventListener("click", async () => {
    const ok = await checkAdminPassword(oldPw.value);
    if (!ok) { msg.className = "alert alert-danger"; msg.textContent = "Kata sandi saat ini salah."; return; }
    if (newPw.value.length < 4) { msg.className = "alert alert-danger"; msg.textContent = "Kata sandi baru minimal 4 karakter."; return; }
    if (Cloud.ready()) await Cloud.setAdminPassword(newPw.value);
    else await ExamDB.setSetting("adminPassword", newPw.value);
    msg.className = "alert alert-success"; msg.textContent = "Kata sandi berhasil diperbarui.";
    oldPw.value = ""; newPw.value = "";
  });
  pwCard.appendChild(saveBtn);
  wrap.appendChild(pwCard);

  const infoCard = el("div", { class: "card doc-card mb-16" });
  infoCard.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, "Parameter Ujian"));
  infoCard.appendChild(el("p", { class: "muted" }, `Durasi ujian: ${EXAM_DURATION_MINUTES} menit. Batas maksimal keluar halaman sebelum ujian dihentikan otomatis: ${MAX_EXIT_STRIKES} kali. Untuk mengubah nilai ini, sesuaikan konstanta EXAM_DURATION_MINUTES dan MAX_EXIT_STRIKES pada berkas data.js.`));
  wrap.appendChild(infoCard);

  const dangerCard = el("div", { class: "card doc-card" });
  dangerCard.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;color:var(--c-danger);" }, "Zona Berbahaya"));
  dangerCard.appendChild(el("p", { class: "muted" }, "Menghapus seluruh data hasil ujian & cuplikan proctoring secara permanen dari perangkat ini."));
  const wipeBtn = el("button", { class: "btn btn-danger" }, "Hapus Semua Data Hasil Ujian");
  wipeBtn.addEventListener("click", async () => {
    if (confirm("Yakin ingin menghapus SELURUH data hasil ujian (termasuk di server pusat)? Tindakan ini tidak dapat dibatalkan.")) {
      await ExamDB.clearAll();
      if (Cloud.ready()) await Cloud.clearAllAttempts();
      await loadAttempts();
      render();
    }
  });
  dangerCard.appendChild(wipeBtn);
  wrap.appendChild(dangerCard);

  return wrap;
}

/* ---------------- EXCEL EXPORT ---------------- */
function fmtDateExcel(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function avgOf(list, key) { return list.length ? Math.round(list.reduce((s,a)=>s+(a[key]||0),0)/list.length) : 0; }

/* Palet warna mengikuti identitas visual portal (lihat :root di style.css)
   agar berkas Excel yang diunduh terasa senada dengan tampilan web —
   rapi, berwarna secukupnya, dan mudah dipindai mata oleh guru. */
const XC = {
  primary: "FF1171B1", primaryDark: "FF0B5586", primaryLight: "FFE7F2FA",
  accentDark: "FFC99000",
  ink: "FF10293C", muted: "FF5C6B78",
  success: "FF1E7E45", successBg: "FFE5F4EA",
  warn: "FF8A6600", warnBg: "FFFFF3D6",
  danger: "FFC0392B", dangerBg: "FFFBE9E7",
  white: "FFFFFFFF", border: "FFD7E1E8", band: "FFF5F9FC"
};
function fill(argb) { return { type: "pattern", pattern: "solid", fgColor: { argb } }; }
function thinBorder(color = XC.border) {
  const b = { style: "thin", color: { argb: color } };
  return { top: b, left: b, bottom: b, right: b };
}
/* Warna nilai: hijau (baik) / kuning (cukup) / merah (perlu perhatian) —
   sama seperti badge skor pada dasbor web (score-pill di style.css). */
function scoreTone(score) {
  if (score >= 75) return { font: XC.success, bg: XC.successBg };
  if (score >= 60) return { font: XC.warn, bg: XC.warnBg };
  return { font: XC.danger, bg: XC.dangerBg };
}
function statusTone(a) {
  if (a.reason === "pelanggaran") return { font: XC.danger, bg: XC.dangerBg };
  if (a.reason === "waktu") return { font: XC.warn, bg: XC.warnBg };
  return { font: XC.success, bg: XC.successBg };
}
/* Judul kop surat bergaya letterhead di baris paling atas sheet. */
function addLetterhead(ws, lastCol, lines) {
  lines.forEach((line, i) => {
    const rowNum = i + 1;
    ws.mergeCells(rowNum, 1, rowNum, lastCol);
    const cell = ws.getCell(rowNum, 1);
    cell.value = line.text;
    cell.font = { bold: !!line.bold, size: line.size || 10.5, color: { argb: line.color || XC.ink }, italic: !!line.italic };
    cell.alignment = { horizontal: "left", vertical: "middle" };
    if (line.bg) cell.fill = fill(line.bg);
    ws.getRow(rowNum).height = line.height || 18;
  });
  return lines.length;
}
function styleHeaderRow(row, lastCol) {
  row.height = 22;
  for (let c = 1; c <= lastCol; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: XC.white }, size: 10.5 };
    cell.fill = fill(XC.primaryDark);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder(XC.primaryDark);
  }
}
async function downloadWorkbook(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function exportToExcel(rows) {
  if (typeof ExcelJS === "undefined") { alert("Pustaka Excel belum termuat. Periksa koneksi internet Anda lalu coba lagi."); return; }
  if (!rows.length) { alert("Tidak ada data untuk diekspor pada filter saat ini."); return; }

  const generatedAt = fmtDateExcel(new Date().toISOString());
  const filterLabel = `Kelas: ${state.filterKelas || "Semua"}  |  Mata Pelajaran: ${state.filterMapel || "Semua"}`;
  const sorted = [...rows].sort((a,b) => a.kelas.localeCompare(b.kelas) || a.mapel.localeCompare(b.mapel) || a.nama.localeCompare(b.nama));

  const wb = new ExcelJS.Workbook();
  wb.creator = SCHOOL_NAME;
  wb.created = new Date();

  /* ========== SHEET 1: RINGKASAN ========== */
  const wsS = wb.addWorksheet("Ringkasan", { views: [{ showGridLines: false }] });
  const sCols = 8;
  wsS.columns = [{width:26},{width:20},{width:24},{width:14},{width:16},{width:18},{width:16},{width:14}];
  addLetterhead(wsS, sCols, [
    { text: `${SCHOOL_NAME.toUpperCase()}`, bold: true, size: 16, color: XC.white, bg: XC.primaryDark, height: 30 },
    { text: `${SCHOOL_PROGRAM} \u2014 Rekap Hasil Ujian`, bold: true, size: 11, color: XC.white, bg: XC.primary, height: 22 },
    { text: `${filterLabel}   \u2022   Digenerate otomatis pada ${generatedAt}`, italic: true, size: 9, color: XC.muted, height: 18 }
  ]);
  wsS.addRow([]);

  // Statistik umum
  const totalPeserta = sorted.length;
  const finalScores = sorted.map(a => a.finalScore);
  const rataAkhir = avgOf(sorted, "finalScore");
  const tertinggi = Math.max(...finalScores);
  const terendah = Math.min(...finalScores);
  const dihentikan = sorted.filter(a => a.reason === "pelanggaran").length;
  const totalInsiden = sorted.reduce((s,a) => s + (a.exitStrikes||0), 0);

  let r = wsS.rowCount + 1;
  wsS.mergeCells(r, 1, r, sCols);
  Object.assign(wsS.getCell(r,1), {});
  wsS.getCell(r,1).value = "STATISTIK UMUM";
  wsS.getCell(r,1).font = { bold: true, color: { argb: XC.white } };
  wsS.getCell(r,1).fill = fill(XC.accentDark);
  wsS.getCell(r,1).alignment = { vertical: "middle" };
  wsS.getRow(r).height = 20;
  r++;

  const stats = [
    ["Total Peserta", totalPeserta, null],
    ["Rata-rata Nilai Akhir", rataAkhir, scoreTone(rataAkhir)],
    ["Nilai Akhir Tertinggi", tertinggi, scoreTone(tertinggi)],
    ["Nilai Akhir Terendah", terendah, scoreTone(terendah)],
    ["Ujian Dihentikan Otomatis (Pelanggaran)", dihentikan, dihentikan > 0 ? { font: XC.danger, bg: XC.dangerBg } : null],
    ["Total Insiden Pelanggaran Tercatat", totalInsiden, totalInsiden > 0 ? { font: XC.warn, bg: XC.warnBg } : null],
  ];
  stats.forEach(([label, val, tone], i) => {
    const row = r + i;
    wsS.mergeCells(row, 1, row, 5);
    const labelCell = wsS.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = { color: { argb: XC.ink } };
    labelCell.alignment = { indent: 1, vertical: "middle" };
    wsS.mergeCells(row, 6, row, sCols);
    const valCell = wsS.getCell(row, 6);
    valCell.value = val;
    valCell.alignment = { horizontal: "center", vertical: "middle" };
    valCell.font = { bold: true, color: { argb: tone ? tone.font : XC.ink } };
    if (tone) valCell.fill = fill(tone.bg);
    [labelCell, valCell].forEach(c => { c.border = thinBorder(); if (i % 2 === 1 && !tone) c.fill = fill(XC.band); });
    wsS.getRow(row).height = 19;
  });
  r += stats.length + 1;

  // Rekap per kelas & mata pelajaran
  const perExamRows = allClassSubjectKeys()
    .map(key => ({ key, exam: getAllExamsMap()[key], list: sorted.filter(a => a.examId === key) }))
    .filter(g => g.list.length);

  wsS.mergeCells(r, 1, r, sCols);
  wsS.getCell(r,1).value = "REKAP PER KELAS & MATA PELAJARAN";
  wsS.getCell(r,1).font = { bold: true, color: { argb: XC.white } };
  wsS.getCell(r,1).fill = fill(XC.accentDark);
  wsS.getCell(r,1).alignment = { vertical: "middle" };
  wsS.getRow(r).height = 20;
  r++;

  const examHeader = ["Kelas", "Mata Pelajaran", "Guru", "Jumlah Peserta", "Rata-rata Skor PG", "Rata-rata Skor Essay", "Rata-rata Nilai Akhir", "Pelanggaran"];
  const examHeaderRow = wsS.getRow(r);
  examHeaderRow.values = examHeader;
  styleHeaderRow(examHeaderRow, sCols);
  const examTableStart = r;
  r++;
  perExamRows.forEach((g, i) => {
    const avgFinal = avgOf(g.list, "finalScore");
    const tone = scoreTone(avgFinal);
    const rowVals = [g.exam.kelas, g.exam.mapel, g.exam.guru, g.list.length, avgOf(g.list, "mcScore"), avgOf(g.list, "essayScore"), avgFinal, g.list.filter(a=>a.reason==="pelanggaran").length];
    const row = wsS.getRow(r + i);
    row.values = rowVals;
    for (let c = 1; c <= sCols; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder();
      cell.alignment = { horizontal: c <= 3 ? "left" : "center", vertical: "middle" };
      if (i % 2 === 1) cell.fill = fill(XC.band);
      if (c === 7) { cell.font = { bold: true, color: { argb: tone.font } }; cell.fill = fill(tone.bg); }
    }
  });
  if (perExamRows.length) {
    wsS.autoFilter = { from: { row: examTableStart, column: 1 }, to: { row: examTableStart + perExamRows.length, column: sCols } };
  }
  wsS.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left:0.4,right:0.4,top:0.5,bottom:0.5,header:0.2,footer:0.2 } };

  /* ========== SHEET 2: REKAP NILAI (detail) ========== */
  const wsD = wb.addWorksheet("Rekap Nilai", { views: [{ state: "frozen", ySplit: 3, showGridLines: false }] });
  const detailHeader = ["No", "Nama Siswa", "Kelas", "Mata Pelajaran", "Guru", "Skor PG", "Benar/Total PG", "Skor Essay", "Nilai Akhir", "Pelanggaran", "Status Akhir", "Durasi Dipakai", "Waktu Kumpul", "Nomor Dokumen"];
  wsD.columns = [
    {width:5},{width:26},{width:10},{width:22},{width:24},
    {width:9},{width:13},{width:11},{width:11},{width:11},
    {width:20},{width:13},{width:17},{width:16}
  ];
  addLetterhead(wsD, detailHeader.length, [
    { text: `${SCHOOL_NAME} \u2014 Rekap Nilai Detail`, bold: true, size: 13, color: XC.white, bg: XC.primaryDark, height: 24 },
    { text: filterLabel, italic: true, size: 9, color: XC.muted, height: 16 }
  ]);
  const headerRow = wsD.getRow(3);
  headerRow.values = detailHeader;
  styleHeaderRow(headerRow, detailHeader.length);

  sorted.forEach((a, i) => {
    const rowIdx = 4 + i;
    const row = wsD.getRow(rowIdx);
    row.values = [i+1, a.nama, a.kelas, a.mapel, a.guru, a.mcScore, `${a.mcCorrect}/${a.mcTotal}`, a.essayScore, a.finalScore, a.exitStrikes, a.status, fmtSec(a.timeUsedSec), fmtDateExcel(a.submittedAt), a.docNumber];
    const banded = i % 2 === 1;
    for (let c = 1; c <= detailHeader.length; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", horizontal: [1,6,7,8,9,10].includes(c) ? "center" : "left" };
      if (banded) cell.fill = fill(XC.band);
    }
    // Kolom skor: warnai teks sesuai capaian (hijau/kuning/merah)
    [6, 8, 9].forEach(c => {
      const cell = row.getCell(c);
      cell.numFmt = "0";
      const tone = scoreTone(cell.value);
      cell.font = { bold: c === 9, color: { argb: tone.font } };
    });
    // Status akhir: badge warna seperti tag di dasbor web
    const stCell = row.getCell(11);
    const tone = statusTone(a);
    stCell.font = { bold: true, color: { argb: tone.font } };
    stCell.fill = fill(tone.bg);
    // Pelanggaran: tandai merah bila pernah tercatat
    const violCell = row.getCell(10);
    if (a.exitStrikes > 0) violCell.font = { bold: true, color: { argb: XC.danger } };
  });
  wsD.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + sorted.length, column: detailHeader.length } };
  wsD.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left:0.4,right:0.4,top:0.5,bottom:0.5,header:0.2,footer:0.2 } };

  const filename = `Rekap_Nilai_${state.filterKelas || "SemuaKelas"}_${state.filterMapel || "SemuaMapel"}.xlsx`.replace(/\s+/g, "_");
  await downloadWorkbook(wb, filename);
}

ensureAdminPassword().then(render);
