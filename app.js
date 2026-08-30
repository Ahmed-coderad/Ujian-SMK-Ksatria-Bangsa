/* ============================================================
   APP.js — alur siswa: login, pengerjaan ujian, proctoring,
   penilaian otomatis, dan pengiriman hasil.
   ============================================================ */

const root = document.getElementById("app");

let state = {
  screen: "login",       // login | proctor-setup | exam | submitting | done
  student: null,         // {nama, kelas, mapel, guru}
  exam: null,            // object dari EXAMS
  attemptId: null,
  mcAnswers: {},
  essayAnswers: {},
  activeSection: "pg",   // pg | essay
  currentQ: 0,
  timeLeftSec: 0,
  timerHandle: null,
  exitStrikes: 0,
  mediaStream: null,
  audioRecorder: null,
  audioChunks: [],
  snapshotHandle: null,
  submitted: false,
  forcedReason: null      // "waktu" | "pelanggaran" | null (manual)
};

/* ---------------- helpers ---------------- */
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
function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function docNumber() {
  const d = new Date();
  return `UJN/${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,"0")}${d.getDate().toString().padStart(2,"0")}/${Math.floor(Math.random()*9000+1000)}`;
}
function letter(i){ return String.fromCharCode(65+i); }

function render() {
  root.innerHTML = "";
  if (state.screen === "login") root.appendChild(renderLogin());
  else if (state.screen === "proctor-setup") root.appendChild(renderProctorSetup());
  else if (state.screen === "exam") root.appendChild(renderExam());
  else if (state.screen === "done") root.appendChild(renderDone());
}

/* ---------------- LOGIN ---------------- */
function renderLogin() {
  const wrap = el("div", { class: "login-shell" });
  const grid = el("div", { class: "login-grid" });

  const side = el("div", { class: "login-side" }, [
    el("div", {}, [
      el("h2", {}, "Portal Ujian Daring Sumatif Tengah Semester"),
      el("p", {}, `${SCHOOL_NAME} — Kompetensi Keahlian ${SCHOOL_PROGRAM}. Kerjakan ujian dengan jujur, tertib, dan penuh tanggung jawab sebagaimana etika kerja seorang tenaga administrasi profesional.`)
    ]),
    el("div", { class: "stamp-mini" }, [
      el("div", { class: "seal accent", style: "border-color:#fcc102;color:#fcc102;" }, el("div", { class: "seal-label" }, "Resmi • Semester 1"))
    ])
  ]);

  const form = el("div", { class: "login-form-panel" });
  form.appendChild(el("h3", {}, "Formulir Masuk Ujian"));
  form.appendChild(el("p", { class: "sub" }, "Isi data berikut dengan benar sesuai identitas dan jadwal ujian Anda."));

  const errBox = el("div", { class: "hidden" });
  form.appendChild(errBox);

  const nameField = el("input", { type: "text", placeholder: "Contoh: Siti Amelia Putri", autocomplete: "off" });
  const kelasField = el("select", {}, [
    el("option", { value: "" }, "-- Pilih Kelas --"),
    ...Object.keys(CLASS_SUBJECT_MAP).map(k => el("option", { value: k }, k))
  ]);
  const mapelField = el("select", { disabled: "disabled" }, [el("option", { value: "" }, "-- Pilih Kelas dahulu --")]);
  const guruField = el("input", { type: "text", placeholder: "Nama lengkap guru mata pelajaran", autocomplete: "off" });

  kelasField.addEventListener("change", () => {
    const kelas = kelasField.value;
    mapelField.innerHTML = "";
    mapelField.disabled = !kelas;
    if (!kelas) {
      mapelField.appendChild(el("option", { value: "" }, "-- Pilih Kelas dahulu --"));
      return;
    }
    mapelField.appendChild(el("option", { value: "" }, "-- Pilih Mata Pelajaran --"));
    CLASS_SUBJECT_MAP[kelas].forEach(m => mapelField.appendChild(el("option", { value: m }, m)));
  });

  form.appendChild(el("div", { class: "field" }, [el("label", {}, "Nama Lengkap Siswa"), nameField]));
  form.appendChild(el("div", { class: "field" }, [el("label", {}, "Kelas"), kelasField]));
  form.appendChild(el("div", { class: "field" }, [el("label", {}, "Mata Pelajaran"), mapelField]));
  form.appendChild(el("div", { class: "field" }, [
    el("label", {}, "Nama Guru Pengampu"),
    guruField,
    el("div", { class: "field-hint" }, `Ketik nama guru sesuai jadwal, contoh: "${DEFAULT_TEACHER}".`)
  ]));

  const startBtn = el("button", { class: "btn btn-primary btn-block" }, "Masuk & Mulai Verifikasi Perangkat");
  startBtn.addEventListener("click", async () => {
    const nama = nameField.value.trim();
    const kelas = kelasField.value;
    const mapel = mapelField.value;
    const guru = guruField.value.trim();
    const examId = `${kelas}__${mapel}`;
    const exam = examId in EXAMS ? await getEffectiveExam(examId) : null;

    const errors = [];
    if (nama.length < 3) errors.push("Nama lengkap minimal 3 karakter.");
    if (!kelas) errors.push("Kelas wajib dipilih.");
    if (!mapel) errors.push("Mata pelajaran wajib dipilih.");
    if (!exam) errors.push("Kombinasi kelas dan mata pelajaran tidak ditemukan.");
    else if (guru.toLowerCase().replace(/[.,]/g,"").trim() !== exam.guru.toLowerCase().replace(/[.,]/g,"").trim()) {
      errors.push(`Nama guru tidak sesuai. Guru pengampu untuk ${mapel} kelas ${kelas} adalah "${exam.guru}".`);
    }

    if (errors.length) {
      errBox.className = "alert alert-danger";
      errBox.innerHTML = "<b>Periksa kembali data Anda:</b><ul style='margin:6px 0 0;padding-left:18px;'>" + errors.map(e2 => `<li>${e2}</li>`).join("") + "</ul>";
      return;
    }
    errBox.className = "hidden";

    state.student = { nama, kelas, mapel, guru: exam.guru };
    state.exam = exam;
    state.attemptId = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    state.timeLeftSec = EXAM_DURATION_MINUTES * 60;
    state.screen = "proctor-setup";
    render();
  });

  form.appendChild(el("div", { class: "mt-16" }, startBtn));
  form.appendChild(el("p", { class: "field-hint mt-16" }, "Dengan melanjutkan, Anda menyetujui bahwa kamera & mikrofon perangkat akan diaktifkan untuk pengawasan (proctoring) selama ujian berlangsung, dan aktivitas keluar dari halaman ujian akan tercatat."));

  grid.appendChild(side);
  grid.appendChild(form);
  wrap.appendChild(grid);
  return wrap;
}

/* ---------------- PROCTOR SETUP ---------------- */
function renderProctorSetup() {
  const wrap = el("div", { class: "login-shell" });
  const card = el("div", { class: "card doc-card", style: "max-width:520px;width:100%;" });
  card.appendChild(el("div", { class: "seal", style: "margin:0 auto 16px;" }, el("div", { class: "seal-label" }, "Verifikasi Perangkat")));
  card.appendChild(el("h3", { style: "text-align:center;font-family:var(--font-display);color:var(--c-primary-dark);" }, "Aktivasi Kamera & Mikrofon"));
  card.appendChild(el("p", { class: "muted text-center" }, "Sistem memerlukan akses kamera depan dan mikrofon untuk memantau pelaksanaan ujian. Pastikan wajah Anda terlihat jelas dan ruangan cukup tenang."));

  const statusBox = el("div", { class: "alert alert-info" }, "Klik tombol di bawah untuk memberikan izin akses.");
  card.appendChild(statusBox);

  const grantBtn = el("button", { class: "btn btn-accent btn-block" }, "Izinkan Kamera & Mikrofon, Mulai Ujian");
  grantBtn.addEventListener("click", async () => {
    grantBtn.disabled = true;
    grantBtn.textContent = "Meminta izin perangkat...";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
        audio: true
      });
      state.mediaStream = stream;
      statusBox.className = "alert alert-success";
      statusBox.textContent = "Akses diberikan. Menyiapkan ruang ujian...";
      setTimeout(() => { state.screen = "exam"; render(); startExam(); }, 500);
    } catch (err) {
      statusBox.className = "alert alert-danger";
      statusBox.textContent = "Izin kamera/mikrofon ditolak atau tidak tersedia. Akses wajib diberikan untuk memulai ujian. Silakan periksa pengaturan browser Anda lalu coba lagi.";
      grantBtn.disabled = false;
      grantBtn.textContent = "Coba Lagi";
    }
  });
  card.appendChild(el("div", { class: "mt-16" }, grantBtn));

  const backBtn = el("button", { class: "btn btn-ghost btn-block mt-8" }, "\u2190 Kembali ke Formulir");
  backBtn.addEventListener("click", () => { state.screen = "login"; render(); });
  card.appendChild(backBtn);

  wrap.appendChild(card);
  return wrap;
}

/* ---------------- EXAM ---------------- */
function startExam() {
  requestFullscreenSafe();
  startTimer();
  attachAntiCheat();
  startProctorMedia();
}

function requestFullscreenSafe() {
  const d = document.documentElement;
  const fn = d.requestFullscreen || d.webkitRequestFullscreen || d.msRequestFullscreen;
  if (fn) fn.call(d).catch(() => {});
}

function startTimer() {
  clearInterval(state.timerHandle);
  state.timerHandle = setInterval(() => {
    state.timeLeftSec--;
    updateTimerUI();
    if (state.timeLeftSec <= 0) {
      clearInterval(state.timerHandle);
      finishExam("waktu");
    }
  }, 1000);
}

function updateTimerUI() {
  const box = document.getElementById("timerBox");
  if (!box) return;
  box.textContent = fmtTime(Math.max(state.timeLeftSec, 0));
  box.classList.toggle("warn", state.timeLeftSec <= 300);
}

function attachAntiCheat() {
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onWindowBlur);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("contextmenu", preventDefaultIfExam);
  document.addEventListener("copy", preventDefaultIfExam);
  document.addEventListener("paste", preventDefaultIfExam);
}
function detachAntiCheat() {
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("blur", onWindowBlur);
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  window.removeEventListener("beforeunload", onBeforeUnload);
  document.removeEventListener("contextmenu", preventDefaultIfExam);
  document.removeEventListener("copy", preventDefaultIfExam);
  document.removeEventListener("paste", preventDefaultIfExam);
}
function preventDefaultIfExam(e){ if (state.screen === "exam") e.preventDefault(); }
function onBeforeUnload(e){
  if (state.screen === "exam" && !state.submitted) {
    e.preventDefault();
    e.returnValue = "";
  }
}
let lastStrikeAt = 0;
function registerStrike(reason) {
  const now = Date.now();
  if (now - lastStrikeAt < 800) return; // debounce ganda event
  lastStrikeAt = now;
  if (state.screen !== "exam" || state.submitted) return;
  state.exitStrikes++;
  updateStrikeUI();
  if (state.exitStrikes >= MAX_EXIT_STRIKES) {
    showModal({
      sealClass: "danger",
      sealLabel: "Ujian Dihentikan",
      title: "Ujian Dihentikan Otomatis",
      body: `Anda telah keluar dari halaman ujian sebanyak ${state.exitStrikes} kali (batas maksimal ${MAX_EXIT_STRIKES} kali dilampaui: ${reason}). Sesuai tata tertib ujian, jawaban Anda akan dikirim secara otomatis sekarang.`,
      actions: [{ label: "Mengerti", primary: true, onClick: () => finishExam("pelanggaran") }]
    });
  } else {
    showModal({
      sealClass: "danger",
      sealLabel: `Peringatan ${state.exitStrikes}/${MAX_EXIT_STRIKES}`,
      title: "PERINGATAN KERAS — Pelanggaran Tata Tertib Ujian",
      body: `Terdeteksi Anda meninggalkan halaman ujian (${reason}). Ini adalah pelanggaran ke-${state.exitStrikes} dari maksimal ${MAX_EXIT_STRIKES} kali. Jika batas terlampaui, seluruh jawaban akan otomatis dikirim dan ujian dianggap selesai. Tetaplah pada halaman ujian sampai selesai.`,
      actions: [{ label: "Saya Mengerti, Lanjutkan Ujian", primary: true, onClick: () => { closeModal(); requestFullscreenSafe(); } }]
    });
  }
}
function onVisibilityChange() {
  if (document.hidden) registerStrike("berpindah tab / menyembunyikan jendela");
}
function onWindowBlur() {
  if (state.screen === "exam") registerStrike("jendela ujian kehilangan fokus");
}
function onFullscreenChange() {
  if (!document.fullscreenElement && state.screen === "exam" && !state.submitted) {
    registerStrike("keluar dari mode layar penuh");
  }
}
function updateStrikeUI() {
  const box = document.getElementById("strikeBox");
  if (box) box.textContent = `Pelanggaran: ${state.exitStrikes}/${MAX_EXIT_STRIKES}`;
}

/* ---- Proctoring: live preview + periodic snapshot + audio recording ---- */
function startProctorMedia() {
  const video = document.getElementById("proctorVideo");
  if (video && state.mediaStream) {
    video.srcObject = state.mediaStream;
    video.play().catch(()=>{});
  }
  // snapshot tiap 20 detik
  state.snapshotHandle = setInterval(captureSnapshot, 20000);
  captureSnapshot();

  // rekam audio
  try {
    const audioTracks = state.mediaStream.getAudioTracks();
    if (audioTracks.length) {
      const audioOnlyStream = new MediaStream(audioTracks);
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      state.audioRecorder = new MediaRecorder(audioOnlyStream, mime ? { mimeType: mime } : undefined);
      state.audioChunks = [];
      state.audioRecorder.ondataavailable = (e) => { if (e.data && e.data.size) state.audioChunks.push(e.data); };
      state.audioRecorder.start(5000);
    }
  } catch (err) { console.warn("Perekaman audio tidak tersedia:", err); }
}
function stopProctorMedia() {
  clearInterval(state.snapshotHandle);
  if (state.audioRecorder && state.audioRecorder.state !== "inactive") {
    try { state.audioRecorder.stop(); } catch(e){}
  }
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach(t => t.stop());
  }
}
function captureSnapshot() {
  const video = document.getElementById("proctorVideo");
  if (!video || !video.videoWidth) return;
  const canvas = document.createElement("canvas");
  canvas.width = 220; canvas.height = 165;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
  ExamDB.saveSnapshot({
    id: `${state.attemptId}_${Date.now()}`,
    attemptId: state.attemptId,
    time: new Date().toISOString(),
    image: dataUrl
  }).catch(()=>{});
}

/* ---------------- MODAL ---------------- */
function showModal({ sealClass = "danger", sealLabel = "", title, body, actions }) {
  closeModal();
  const overlay = el("div", { id: "modalOverlay", class: "modal-overlay" });
  const box = el("div", { class: "modal-box" });
  box.appendChild(el("div", { class: `seal ${sealClass}` }, el("div", { class: "seal-label" }, sealLabel)));
  box.appendChild(el("h3", {}, title));
  box.appendChild(el("p", {}, body));
  const actionsWrap = el("div", { style: "display:flex;gap:10px;justify-content:center;flex-wrap:wrap;" });
  actions.forEach(a => {
    const btn = el("button", { class: `btn ${a.primary ? "btn-danger" : "btn-outline"}` }, a.label);
    btn.addEventListener("click", a.onClick);
    actionsWrap.appendChild(btn);
  });
  box.appendChild(actionsWrap);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) overlay.remove();
}

/* ---------------- EXAM RENDER ---------------- */
function renderExam() {
  const wrap = el("div", {});

  const bar = el("div", { class: "exam-bar" });
  const barInner = el("div", { class: "exam-bar-inner" });
  barInner.appendChild(el("div", { class: "exam-meta" }, [
    el("b", {}, `${state.exam.mapel} — ${state.exam.kelas}`), el("br"),
    `${state.student.nama} • Guru: ${state.exam.guru}`
  ]));
  const rightBar = el("div", { style: "display:flex;align-items:center;gap:12px;" });
  rightBar.appendChild(el("div", { id: "strikeBox", class: "strike-box" }, `Pelanggaran: ${state.exitStrikes}/${MAX_EXIT_STRIKES}`));
  rightBar.appendChild(el("div", { id: "timerBox", class: "timer-box" }, fmtTime(state.timeLeftSec)));
  barInner.appendChild(rightBar);
  bar.appendChild(barInner);
  wrap.appendChild(bar);

  const container = el("div", { class: "container", style: "padding-top:22px;padding-bottom:60px;" });

  // folder tabs
  const tabs = el("div", { class: "folder-tabs" });
  const tabPG = el("button", { class: `folder-tab ${state.activeSection === "pg" ? "active" : ""}` }, `A. Pilihan Ganda (${state.exam.mc.length})`);
  const tabEssay = el("button", { class: `folder-tab ${state.activeSection === "essay" ? "active" : ""}` }, `B. Uraian / Essay (${state.exam.essay.length})`);
  tabPG.addEventListener("click", () => { state.activeSection = "pg"; state.currentQ = 0; render(); });
  tabEssay.addEventListener("click", () => { state.activeSection = "essay"; state.currentQ = 0; render(); });
  tabs.appendChild(tabPG); tabs.appendChild(tabEssay);
  container.appendChild(tabs);

  const bodyCard = el("div", { class: "card doc-card", style: "border-radius:0 10px 10px 10px;" });

  if (state.activeSection === "pg") {
    const qnav = el("div", { class: "qnav" });
    state.exam.mc.forEach((_, i) => {
      const b = el("button", { class: `${state.mcAnswers[i] !== undefined ? "answered" : ""} ${state.currentQ === i ? "current" : ""}` }, String(i+1));
      b.addEventListener("click", () => { state.currentQ = i; render(); });
      qnav.appendChild(b);
    });
    bodyCard.appendChild(qnav);

    const i = state.currentQ;
    const item = state.exam.mc[i];
    const qcard = el("div", { class: "qcard" });
    qcard.appendChild(el("div", {}, [el("span", { class: "qnum" }, String(i+1)), el("span", { class: "muted", style:"font-size:.8rem;" }, "Pilihan Ganda")]));
    qcard.appendChild(el("div", { class: "qtext" }, item.q));
    item.opts.forEach((opt, oi) => {
      const selected = state.mcAnswers[i] === oi;
      const row = el("label", { class: `opt ${selected ? "selected" : ""}` }, [
        el("input", { type: "radio", name: `mc${i}`, ...(selected ? { checked: "checked" } : {}) }),
        el("span", { class: "opt-letter" }, letter(oi) + "."),
        el("span", {}, opt)
      ]);
      row.addEventListener("click", () => { state.mcAnswers[i] = oi; render(); });
      qcard.appendChild(row);
    });
    bodyCard.appendChild(qcard);

    const nav = el("div", { class: "flex-between mt-16" });
    const prev = el("button", { class: "btn btn-outline" }, "\u2190 Sebelumnya");
    prev.disabled = i === 0;
    prev.addEventListener("click", () => { state.currentQ = Math.max(0, i-1); render(); });
    const next = el("button", { class: "btn btn-primary" }, i === state.exam.mc.length - 1 ? "Lanjut ke Essay \u2192" : "Selanjutnya \u2192");
    next.addEventListener("click", () => {
      if (i === state.exam.mc.length - 1) { state.activeSection = "essay"; state.currentQ = 0; }
      else state.currentQ = i + 1;
      render();
    });
    nav.appendChild(prev); nav.appendChild(next);
    bodyCard.appendChild(nav);

  } else {
    const qnav = el("div", { class: "qnav" });
    state.exam.essay.forEach((_, i) => {
      const b = el("button", { class: `${(state.essayAnswers[i]||"").trim() ? "answered" : ""} ${state.currentQ === i ? "current" : ""}` }, String(i+1));
      b.addEventListener("click", () => { state.currentQ = i; render(); });
      qnav.appendChild(b);
    });
    bodyCard.appendChild(qnav);

    const i = state.currentQ;
    const item = state.exam.essay[i];
    const qcard = el("div", { class: "qcard" });
    qcard.appendChild(el("div", {}, [el("span", { class: "qnum" }, String(i+1)), el("span", { class: "muted", style:"font-size:.8rem;" }, "Uraian / Essay")]));
    qcard.appendChild(el("div", { class: "qtext" }, item.q));
    const ta = el("textarea", { class: "essay-input", placeholder: "Tulis jawaban Anda di sini..." }, state.essayAnswers[i] || "");
    const wc = el("div", { class: "word-count" }, `${(state.essayAnswers[i]||"").trim() ? state.essayAnswers[i].trim().split(/\s+/).length : 0} kata`);
    ta.addEventListener("input", () => {
      state.essayAnswers[i] = ta.value;
      wc.textContent = `${ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0} kata`;
      document.querySelectorAll(".qnav button")[i]?.classList.toggle("answered", !!ta.value.trim());
    });
    qcard.appendChild(ta);
    qcard.appendChild(wc);
    bodyCard.appendChild(qcard);

    const nav = el("div", { class: "flex-between mt-16" });
    const prev = el("button", { class: "btn btn-outline" }, i === 0 ? "\u2190 Kembali ke PG" : "\u2190 Sebelumnya");
    prev.addEventListener("click", () => {
      if (i === 0) { state.activeSection = "pg"; state.currentQ = state.exam.mc.length - 1; }
      else state.currentQ = i - 1;
      render();
    });
    nav.appendChild(prev);
    if (i === state.exam.essay.length - 1) {
      const submitBtn = el("button", { class: "btn btn-accent" }, "Kumpulkan Ujian \u2713");
      submitBtn.addEventListener("click", confirmSubmit);
      nav.appendChild(submitBtn);
    } else {
      const next = el("button", { class: "btn btn-primary" }, "Selanjutnya \u2192");
      next.addEventListener("click", () => { state.currentQ = i + 1; render(); });
      nav.appendChild(next);
    }
    bodyCard.appendChild(nav);
  }

  container.appendChild(bodyCard);

  const submitAllWrap = el("div", { class: "text-center mt-24" });
  const submitAllBtn = el("button", { class: "btn btn-danger" }, "Selesai & Kumpulkan Seluruh Jawaban");
  submitAllBtn.addEventListener("click", confirmSubmit);
  submitAllWrap.appendChild(submitAllBtn);
  container.appendChild(submitAllWrap);

  wrap.appendChild(container);

  // proctor cam widget
  const camWrap = el("div", { class: "proctor-cam" });
  camWrap.appendChild(el("div", { class: "rec-badge" }, [el("span", { class: "rec-dot" }), "REC"]));
  const video = el("video", { id: "proctorVideo", autoplay: "autoplay", muted: "muted", playsinline: "playsinline" });
  camWrap.appendChild(video);
  wrap.appendChild(camWrap);

  setTimeout(() => {
    const v = document.getElementById("proctorVideo");
    if (v && state.mediaStream) { v.srcObject = state.mediaStream; v.play().catch(()=>{}); }
  }, 0);

  return wrap;
}

function confirmSubmit() {
  const answeredMC = Object.keys(state.mcAnswers).length;
  const answeredEssay = Object.values(state.essayAnswers).filter(v => (v||"").trim()).length;
  showModal({
    sealClass: "accent",
    sealLabel: "Konfirmasi",
    title: "Kumpulkan Jawaban Ujian?",
    body: `Anda telah menjawab ${answeredMC}/${state.exam.mc.length} soal pilihan ganda dan ${answeredEssay}/${state.exam.essay.length} soal essay. Jawaban tidak dapat diubah setelah dikumpulkan. Lanjutkan?`,
    actions: [
      { label: "Batal", primary: false, onClick: closeModal },
      { label: "Ya, Kumpulkan", primary: true, onClick: () => { closeModal(); finishExam("manual"); } }
    ]
  });
}

/* ---------------- FINISH / GRADE / SAVE ---------------- */
async function finishExam(reason) {
  if (state.submitted) return;
  state.submitted = true;
  state.forcedReason = reason;
  clearInterval(state.timerHandle);
  detachAntiCheat();
  closeModal();

  const mc = gradeMultipleChoice(state.exam.id, state.mcAnswers);
  const essay = gradeEssay(state.exam.id, state.essayAnswers);
  const finalScore = Math.round((mc.score + essay.score) / 2);

  let audioBlob = null;
  try {
    if (state.audioRecorder && state.audioRecorder.state !== "inactive") {
      await new Promise(resolve => {
        state.audioRecorder.addEventListener("stop", resolve, { once: true });
        state.audioRecorder.stop();
      });
    }
    if (state.audioChunks.length) audioBlob = new Blob(state.audioChunks, { type: "audio/webm" });
  } catch (e) { console.warn(e); }

  stopProctorMedia();
  if (document.fullscreenElement) { try { document.exitFullscreen(); } catch(e){} }

  const statusLabel = reason === "waktu" ? "Waktu Habis" : reason === "pelanggaran" ? "Dihentikan (Pelanggaran)" : "Selesai";

  const attempt = {
    id: state.attemptId,
    classSubject: `${state.student.kelas}__${state.student.mapel}`,
    nama: state.student.nama,
    kelas: state.student.kelas,
    mapel: state.student.mapel,
    guru: state.exam.guru,
    examId: state.exam.id,
    submittedAt: new Date().toISOString(),
    docNumber: docNumber(),
    status: statusLabel,
    reason,
    exitStrikes: state.exitStrikes,
    timeUsedSec: (EXAM_DURATION_MINUTES*60) - Math.max(state.timeLeftSec,0),
    mcAnswers: state.mcAnswers,
    essayAnswers: state.essayAnswers,
    mcScore: mc.score,
    mcCorrect: mc.correct,
    mcTotal: mc.total,
    mcDetail: mc.detail,
    essayScore: essay.score,
    essayMaxScore: essay.maxScore,
    essayDetail: essay.detail,
    finalScore,
    reviewed: false,
    audioBlob: audioBlob || null
  };

  try { await ExamDB.saveAttempt(attempt); } catch (e) { console.error("Gagal menyimpan hasil:", e); }

  state.lastAttempt = attempt;
  state.screen = "done";
  render();
}

/* ---------------- DONE / RECEIPT ---------------- */
function renderDone() {
  const wrap = el("div", { class: "login-shell" });
  const card = el("div", { class: "card doc-card", style: "max-width:560px;width:100%;" });
  const a = state.lastAttempt;
  const sealClass = a.reason === "pelanggaran" ? "danger" : "success";
  card.appendChild(el("div", { class: `seal ${sealClass}`, style: "margin:0 auto 16px;" }, el("div", { class: "seal-label" }, a.status)));
  card.appendChild(el("h3", { style: "text-align:center;font-family:var(--font-display);color:var(--c-primary-dark);" }, "Tanda Terima Pengumpulan Ujian"));
  card.appendChild(el("p", { class: "muted text-center" }, "Jawaban Anda telah tersimpan. Hasil akhir akan diverifikasi oleh guru pengampu sebelum diumumkan resmi."));
  card.appendChild(el("div", { class: "divider" }));

  const rows = [
    ["Nomor Dokumen", a.docNumber],
    ["Nama Siswa", a.nama],
    ["Kelas", a.kelas],
    ["Mata Pelajaran", a.mapel],
    ["Guru Pengampu", a.guru],
    ["Waktu Pengumpulan", new Date(a.submittedAt).toLocaleString("id-ID")],
    ["Status", a.status],
    ["Jumlah Pelanggaran Tercatat", `${a.exitStrikes} kali`],
    ["Skor PG (sementara)", `${a.mcCorrect}/${a.mcTotal} (${a.mcScore})`],
    ["Skor Essay (estimasi otomatis)", `${a.essayScore}/${a.essayMaxScore}`],
  ];
  const table = el("table", { style: "width:100%;font-size:.88rem;" });
  rows.forEach(([k,v]) => {
    table.appendChild(el("tr", {}, [
      el("td", { style: "padding:6px 0;color:var(--c-muted);width:52%;" }, k),
      el("td", { style: "padding:6px 0;font-weight:600;text-align:right;" }, String(v))
    ]));
  });
  card.appendChild(table);
  card.appendChild(el("div", { class: "alert alert-info mt-16" }, "Skor essay dihitung otomatis berdasarkan kesesuaian kata kunci sebagai estimasi awal, dan tetap akan ditinjau ulang oleh guru pengampu."));

  const closeBtn = el("button", { class: "btn btn-primary btn-block mt-16" }, "Selesai");
  closeBtn.addEventListener("click", () => { window.location.reload(); });
  card.appendChild(closeBtn);

  wrap.appendChild(card);
  return wrap;
}

render();
