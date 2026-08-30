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
  schedule: {}
};
let _unsubAttempts = null, _unsubRoster = null, _unsubSchedule = null;

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
function allClassSubjectKeys() { return Object.keys(EXAMS); }

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
    ["roster", "\uD83D\uDC65 Data Siswa & Kelas"],
    ["schedule", "\uD83D\uDDD3\uFE0F Jadwal Ujian"],
    ["settings", "\u2699\uFE0F Pengaturan"]
  ];
  items.forEach(([key, label]) => {
    const b = el("button", { class: state.section === key ? "active" : "" }, label);
    b.addEventListener("click", () => { state.section = key; state.detailAttemptId = null; render(); });
    nav.appendChild(b);
  });
  const logoutBtn = el("button", { style: "margin-top:16px;color:#ffd9d4;" }, "\u2190 Keluar");
  logoutBtn.addEventListener("click", () => {
    if (_unsubAttempts) { _unsubAttempts(); _unsubAttempts = null; }
    if (_unsubRoster) { _unsubRoster(); _unsubRoster = null; }
    if (_unsubSchedule) { _unsubSchedule(); _unsubSchedule = null; }
    state.authed = false; render();
  });
  nav.appendChild(logoutBtn);
  shell.appendChild(nav);

  const main = el("div", { class: "admin-main" });
  if (state.section === "dashboard") main.appendChild(await renderDashboard());
  else if (state.section === "results") main.appendChild(state.detailAttemptId ? await renderResultDetail() : await renderResults());
  else if (state.section === "bank") main.appendChild(await renderBank());
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
    const exam = EXAMS[key];
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
  exportBtn.addEventListener("click", () => exportToExcel(filteredAttempts()));
  header.appendChild(exportBtn);
  wrap.appendChild(header);

  const filters = el("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;" });
  const kelasSel = el("select", { style: "width:auto;padding:8px 10px;border:1.5px solid #cdd6dd;border-radius:7px;" });
  kelasSel.appendChild(el("option", { value: "" }, "Semua Kelas"));
  Object.keys(CLASS_SUBJECT_MAP).forEach(k => kelasSel.appendChild(el("option", { value: k, ...(state.filterKelas===k?{selected:"selected"}:{}) }, k)));
  kelasSel.addEventListener("change", () => { state.filterKelas = kelasSel.value; render(); });

  const mapelSel = el("select", { style: "width:auto;padding:8px 10px;border:1.5px solid #cdd6dd;border-radius:7px;" });
  mapelSel.appendChild(el("option", { value: "" }, "Semua Mapel"));
  [...new Set(Object.values(CLASS_SUBJECT_MAP).flat())].forEach(m => mapelSel.appendChild(el("option", { value: m, ...(state.filterMapel===m?{selected:"selected"}:{}) }, m)));
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
      el("td", {}, `${a.mcCorrect}/${a.mcTotal}`), el("td", {}, `${a.essayScore}/${a.essayMaxScore}`),
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

  const exam = EXAMS[a.examId];

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
  esCard.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, `Uraian / Essay — estimasi otomatis ${a.essayScore}/${a.essayMaxScore}`));
  esCard.appendChild(el("p", { class: "alert alert-info" }, "Skor essay berikut adalah estimasi otomatis berbasis kesesuaian kata kunci & kelengkapan jawaban. Guru dapat menimbang ulang secara manual berdasarkan pembacaan langsung di bawah ini."));
  exam.essay.forEach((q, i) => {
    const d = a.essayDetail[i];
    const box = el("div", { class: "qcard" });
    box.appendChild(el("div", { style: "font-weight:700;margin-bottom:4px;" }, `${i+1}. ${q.q}`));
    box.appendChild(el("div", { style: "background:#faf8f1;border:1px solid #eee6d6;border-radius:8px;padding:10px 12px;white-space:pre-wrap;font-size:.9rem;margin-bottom:6px;" }, a.essayAnswers[i] || "(tidak dijawab)"));
    box.appendChild(el("div", { class: "muted", style: "font-size:.78rem;" }, `Estimasi skor: ${d.score}/${d.maxScore} • Kata kunci cocok: ${d.kwHits}/${d.kwTotal} • Jumlah kata: ${d.wordCount}`));
    esCard.appendChild(box);
  });
  wrap.appendChild(esCard);

  // Proctoring
  const procCard = el("div", { class: "card doc-card mb-16" });
  procCard.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, "Bukti Pengawasan (Proctoring)"));
  const snaps = Cloud.ready() ? await Cloud.getSnapshotsByAttempt(a.id) : await ExamDB.getSnapshotsByAttempt(a.id);
  if (!snaps.length) procCard.appendChild(el("p", { class: "muted" }, "Tidak ada cuplikan kamera tersimpan untuk sesi ini."));
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
  if (a.audioBlob) {
    const url = URL.createObjectURL(a.audioBlob);
    const audio = el("audio", { controls: "controls", src: url, style: "width:100%;margin-top:12px;" });
    procCard.appendChild(el("div", { class: "muted", style:"font-size:.78rem;margin-top:10px;" }, "Rekaman audio sesi ujian:"));
    procCard.appendChild(audio);
  } else {
    procCard.appendChild(el("p", { class: "muted mt-8" }, "Tidak ada rekaman audio tersimpan untuk sesi ini di perangkat ini. Catatan: rekaman audio hanya tersimpan lokal di perangkat/browser yang dipakai siswa mengerjakan ujian (tidak dikirim ke server pusat karena ukuran berkas), jadi hanya terlihat bila dasbor ini dibuka di perangkat yang sama."));
  }
  wrap.appendChild(procCard);

  return wrap;
}

/* ---------------- BANK SOAL ---------------- */
async function renderBank() {
  const wrap = el("div", {});
  wrap.appendChild(el("div", { class: "admin-header" }, el("h2", {}, "Bank Soal")));

  const sel = el("select", { style: "width:auto;padding:8px 10px;border:1.5px solid #cdd6dd;border-radius:7px;margin-bottom:16px;" });
  allClassSubjectKeys().forEach(key => sel.appendChild(el("option", { value: key, ...(state.editingExamId===key?{selected:"selected"}:{}) }, `${EXAMS[key].kelas} — ${EXAMS[key].mapel}`)));
  sel.addEventListener("change", async () => { state.editingExamId = sel.value; state.editingExamData = null; render(); });
  wrap.appendChild(sel);

  if (!state.editingExamData || state.editingExamData.id !== state.editingExamId) {
    state.editingExamData = JSON.parse(JSON.stringify(await getEffectiveExam(state.editingExamId)));
  }
  const exam = state.editingExamData;

  const resetBtn = el("button", { class: "btn btn-ghost btn-sm", style:"margin-left:10px;" }, "Kembalikan ke Soal Bawaan");
  resetBtn.addEventListener("click", async () => {
    if (confirm("Kembalikan seluruh soal mapel ini ke versi bawaan (menghapus perubahan admin)?")) {
      await resetExamOverride(state.editingExamId);
      state.editingExamData = null;
      render();
    }
  });
  wrap.appendChild(resetBtn);

  const mcSection = el("div", { class: "card doc-card mt-16" });
  mcSection.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, "Soal Pilihan Ganda"));
  exam.mc.forEach((q, i) => {
    const box = el("div", { class: "qcard" });
    box.appendChild(el("div", { style:"font-weight:700;margin-bottom:6px;" }, `Soal No. ${i+1}`));
    const qInput = el("textarea", { style: "width:100%;min-height:50px;margin-bottom:8px;padding:8px;border:1.5px solid #cdd6dd;border-radius:6px;" }, q.q);
    qInput.addEventListener("input", () => q.q = qInput.value);
    box.appendChild(qInput);
    q.opts.forEach((opt, oi) => {
      const row = el("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:6px;" });
      const radio = el("input", { type: "radio", name: `ans_${i}`, ...(q.ans===oi?{checked:"checked"}:{}) });
      radio.addEventListener("change", () => q.ans = oi);
      const optInput = el("input", { type: "text", value: opt, style: "flex:1;padding:7px 9px;border:1.5px solid #cdd6dd;border-radius:6px;" });
      optInput.addEventListener("input", () => q.opts[oi] = optInput.value);
      row.appendChild(radio); row.appendChild(el("span", { class:"muted", style:"width:16px;" }, String.fromCharCode(65+oi))); row.appendChild(optInput);
      box.appendChild(row);
    });
    mcSection.appendChild(box);
  });
  wrap.appendChild(mcSection);

  const esSection = el("div", { class: "card doc-card mt-16" });
  esSection.appendChild(el("h3", { style: "font-family:var(--font-display);margin-top:0;" }, "Soal Uraian / Essay"));
  exam.essay.forEach((q, i) => {
    const box = el("div", { class: "qcard" });
    box.appendChild(el("div", { style:"font-weight:700;margin-bottom:6px;" }, `Soal No. ${i+1}`));
    const qInput = el("textarea", { style: "width:100%;min-height:50px;margin-bottom:8px;padding:8px;border:1.5px solid #cdd6dd;border-radius:6px;" }, q.q);
    qInput.addEventListener("input", () => q.q = qInput.value);
    box.appendChild(qInput);
    const kwInput = el("input", { type: "text", value: q.keywords.join(", "), style:"width:100%;padding:8px;border:1.5px solid #cdd6dd;border-radius:6px;" });
    kwInput.addEventListener("input", () => q.keywords = kwInput.value.split(",").map(s=>s.trim()).filter(Boolean));
    box.appendChild(el("div", { class: "field-hint mt-8" }, "Kata kunci penilaian otomatis (pisahkan dengan koma):"));
    box.appendChild(kwInput);
    esSection.appendChild(box);
  });
  wrap.appendChild(esSection);

  const saveBtn = el("button", { class: "btn btn-primary mt-16" }, "Simpan Perubahan Soal");
  saveBtn.addEventListener("click", async () => {
    await saveExamOverride(state.editingExamId, exam);
    alert("Perubahan soal berhasil disimpan.");
  });
  wrap.appendChild(saveBtn);

  return wrap;
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
  Object.keys(CLASS_SUBJECT_MAP).forEach(k => kelasI.appendChild(el("option", { value: k }, k)));
  const mapelI = el("select", { style: "padding:8px;border:1.5px solid #cdd6dd;border-radius:6px;" });
  function refreshMapelOptions() {
    mapelI.innerHTML = "";
    CLASS_SUBJECT_MAP[kelasI.value].forEach(m => mapelI.appendChild(el("option", { value: m }, m)));
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
  wrap.appendChild(el("p", { class: "muted" }, "Tentukan tanggal, bulan, tahun, dan jam pembukaan tiap paket ujian. Peserta tidak dapat masuk sebelum waktu ini tiba. Kosongkan agar ujian dapat diakses kapan saja."));
  if (!Cloud.ready()) {
    wrap.appendChild(el("div", { class: "alert alert-danger" }, "Penyimpanan terpusat (Firebase) belum aktif — jadwal hanya tersimpan di perangkat/browser ini."));
  }

  const table = el("table", { class: "ledger" });
  table.appendChild(el("tr", {}, ["Kelas", "Mata Pelajaran", "Waktu Mulai Ujian", ""].map(h => el("th", {}, h))));

  allClassSubjectKeys().forEach(key => {
    const exam = EXAMS[key];
    const current = state.schedule[key.replace(/[.#$/\[\]]/g, "_")] || {};
    const dtInput = el("input", { type: "datetime-local" });
    if (current.startAt) {
      const d = new Date(current.startAt);
      const pad = n => String(n).padStart(2, "0");
      dtInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const saveBtn = el("button", { class: "btn btn-primary btn-sm" }, "Simpan");
    saveBtn.addEventListener("click", async () => {
      const iso = dtInput.value ? new Date(dtInput.value).toISOString() : null;
      await setScheduleStartShared(key, iso);
      if (!Cloud.ready()) { state.schedule = await getScheduleShared(); render(); }
    });
    const clearBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Buka Kapan Saja");
    clearBtn.addEventListener("click", async () => {
      dtInput.value = "";
      await setScheduleStartShared(key, null);
      if (!Cloud.ready()) { state.schedule = await getScheduleShared(); render(); }
    });
    table.appendChild(el("tr", {}, [
      el("td", {}, exam.kelas), el("td", {}, exam.mapel),
      el("td", {}, dtInput),
      el("td", {}, el("div", { style: "display:flex;gap:6px;" }, [saveBtn, clearBtn]))
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
function exportToExcel(rows) {
  if (typeof XLSX === "undefined") { alert("Pustaka Excel belum termuat. Periksa koneksi internet Anda lalu coba lagi."); return; }
  const data = rows.map(a => ({
    "Nama Siswa": a.nama,
    "Kelas": a.kelas,
    "Mata Pelajaran": a.mapel,
    "Guru": a.guru,
    "Skor PG": a.mcScore,
    "Benar/Total PG": `${a.mcCorrect}/${a.mcTotal}`,
    "Skor Essay (estimasi)": a.essayScore,
    "Skor Akhir": a.finalScore,
    "Jumlah Pelanggaran": a.exitStrikes,
    "Status": a.status,
    "Durasi Dipakai": fmtSec(a.timeUsedSec),
    "Nomor Dokumen": a.docNumber,
    "Waktu Kumpul": new Date(a.submittedAt).toLocaleString("id-ID")
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
  const filename = `Rekap_Nilai_${state.filterKelas || "SemuaKelas"}_${state.filterMapel || "SemuaMapel"}.xlsx`.replace(/\s+/g, "_");
  XLSX.writeFile(wb, filename);
}

ensureAdminPassword().then(render);
