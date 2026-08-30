/* ============================================================
   ADMIN.js — dasbor administrator portal ujian
   ============================================================ */

const root = document.getElementById("app");
const DEFAULT_ADMIN_PASSWORD = "admin123";

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
  roster: []
};

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
  const pw = await ExamDB.getSetting("adminPassword");
  if (!pw) await ExamDB.setSetting("adminPassword", DEFAULT_ADMIN_PASSWORD);
}

async function loadAttempts() {
  state.attempts = await ExamDB.getAllAttempts();
  state.attempts.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}
async function loadRoster() {
  state.roster = (await ExamDB.getSetting("roster")) || [];
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
    const correct = await ExamDB.getSetting("adminPassword");
    if (pwField.value === correct) {
      state.authed = true;
      await loadAttempts();
      await loadRoster();
      render();
    } else {
      errBox.className = "alert alert-danger";
      errBox.textContent = "Kata sandi salah. Silakan coba lagi.";
    }
  });
  pwField.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); });
  card.appendChild(el("div", { class: "mt-16" }, btn));
  card.appendChild(el("p", { class: "field-hint mt-16 text-center" }, `Kata sandi bawaan: "${DEFAULT_ADMIN_PASSWORD}" (ubah segera di menu Pengaturan).`));
  wrap.appendChild(card);
  return wrap;
}

/* ---------------- SHELL ---------------- */
async function renderShell() {
  const shell = el("div", { class: "admin-shell" });
  const nav = el("div", { class: "admin-nav" });
  nav.appendChild(el("div", { class: "brand" }, "Panel Admin"));
  const items = [
    ["dashboard", "Dasbor"],
    ["results", "Hasil Ujian"],
    ["bank", "Bank Soal"],
    ["roster", "Data Siswa & Kelas"],
    ["settings", "Pengaturan"]
  ];
  items.forEach(([key, label]) => {
    const b = el("button", { class: state.section === key ? "active" : "" }, label);
    b.addEventListener("click", () => { state.section = key; state.detailAttemptId = null; render(); });
    nav.appendChild(b);
  });
  const logoutBtn = el("button", { style: "margin-top:16px;color:#ffd9d4;" }, "\u2190 Keluar");
  logoutBtn.addEventListener("click", () => { state.authed = false; render(); });
  nav.appendChild(logoutBtn);
  shell.appendChild(nav);

  const main = el("div", { class: "admin-main" });
  if (state.section === "dashboard") main.appendChild(await renderDashboard());
  else if (state.section === "results") main.appendChild(state.detailAttemptId ? await renderResultDetail() : await renderResults());
  else if (state.section === "bank") main.appendChild(await renderBank());
  else if (state.section === "roster") main.appendChild(await renderRoster());
  else if (state.section === "settings") main.appendChild(await renderSettings());
  shell.appendChild(main);
  return shell;
}

/* ---------------- DASHBOARD ---------------- */
async function renderDashboard() {
  const wrap = el("div", {});
  wrap.appendChild(el("div", { class: "admin-header" }, el("h2", {}, "Dasbor Ringkasan")));

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
  const snaps = await ExamDB.getSnapshotsByAttempt(a.id);
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
    procCard.appendChild(el("p", { class: "muted mt-8" }, "Tidak ada rekaman audio tersimpan untuk sesi ini."));
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
  wrap.appendChild(el("p", { class: "muted" }, "Daftar referensi siswa terdaftar per kelas & mata pelajaran (opsional, untuk pencocokan data)."));

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
    state.roster.push({ nama: nameI.value.trim(), kelas: kelasI.value, mapel: mapelI.value });
    await ExamDB.setSetting("roster", state.roster);
    nameI.value = "";
    render();
  });
  formRow.appendChild(nameI); formRow.appendChild(kelasI); formRow.appendChild(mapelI); formRow.appendChild(addBtn);
  wrap.appendChild(formRow);

  const table = el("table", { class: "ledger" });
  table.appendChild(el("tr", {}, ["Nama", "Kelas", "Mata Pelajaran", ""].map(h => el("th", {}, h))));
  if (!state.roster.length) table.appendChild(el("tr", {}, el("td", { colspan: "4", class: "muted text-center" }, "Belum ada data siswa ditambahkan.")));
  state.roster.forEach((r, i) => {
    const delBtn = el("button", { class: "btn btn-ghost btn-sm" }, "Hapus");
    delBtn.addEventListener("click", async () => {
      state.roster.splice(i, 1);
      await ExamDB.setSetting("roster", state.roster);
      render();
    });
    table.appendChild(el("tr", {}, [el("td", {}, r.nama), el("td", {}, r.kelas), el("td", {}, r.mapel), el("td", {}, delBtn)]));
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
    const current = await ExamDB.getSetting("adminPassword");
    if (oldPw.value !== current) { msg.className = "alert alert-danger"; msg.textContent = "Kata sandi saat ini salah."; return; }
    if (newPw.value.length < 4) { msg.className = "alert alert-danger"; msg.textContent = "Kata sandi baru minimal 4 karakter."; return; }
    await ExamDB.setSetting("adminPassword", newPw.value);
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
    if (confirm("Yakin ingin menghapus SELURUH data hasil ujian? Tindakan ini tidak dapat dibatalkan.")) {
      await ExamDB.clearAll();
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
