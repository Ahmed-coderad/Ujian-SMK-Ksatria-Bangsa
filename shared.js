/* ============================================================
   SHARED.js — dipakai oleh portal siswa (app.js) dan admin (admin.js)
   Menggabungkan bank soal bawaan (data.js) dengan perubahan admin.
   Sumber utama kini penyimpanan TERPUSAT (Firebase, lihat cloud.js)
   sehingga perubahan admin langsung tersedia untuk semua perangkat
   siswa. Jika penyimpanan terpusat belum dikonfigurasi/offline,
   sistem otomatis memakai cadangan lokal (IndexedDB) di perangkat ini.
   ============================================================ */

async function getEffectiveExam(examId) {
  const base = EXAMS[examId];
  if (!base) return null;
  let override = null;
  try {
    if (Cloud.ready()) override = await Cloud.getExamOverride(examId);
    else override = await ExamDB.getSetting(`override_${examId}`);
  } catch (e) { console.warn("Gagal memuat perubahan soal:", e); }
  if (override) return Object.assign({}, base, override, { id: examId });
  return base;
}

/* Berlangganan perubahan soal secara real-time. Mengembalikan fungsi
   untuk berhenti berlangganan. Dipakai di layar login siswa supaya
   soal terbaru dari admin langsung terpakai tanpa perlu memuat ulang. */
function watchEffectiveExam(examId, cb) {
  const base = EXAMS[examId];
  if (!base) { cb(null); return () => {}; }
  if (Cloud.ready()) {
    return Cloud.watchExamOverride(examId, override => {
      cb(override ? Object.assign({}, base, override, { id: examId }) : Object.assign({}, base));
    });
  }
  getEffectiveExam(examId).then(cb);
  return () => {};
}

async function saveExamOverride(examId, examData) {
  if (Cloud.ready()) return Cloud.saveExamOverride(examId, examData);
  return ExamDB.setSetting(`override_${examId}`, examData);
}

async function resetExamOverride(examId) {
  if (Cloud.ready()) return Cloud.resetExamOverride(examId);
  return ExamDB.setSetting(`override_${examId}`, null);
}

/* ---------------- ROSTER (daftar nama terdaftar) ---------------- */
async function getRosterShared() {
  try {
    if (Cloud.ready()) return (await Cloud.getRoster()) || [];
    return (await ExamDB.getSetting("roster")) || [];
  } catch (e) { console.warn("Gagal memuat data siswa:", e); return []; }
}

function normalizeName(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,]/g, "");
}

/* ---------------- JADWAL UJIAN ---------------- */
function scheduleKey(examId) { return String(examId).replace(/[.#$/\[\]]/g, "_"); }

async function getScheduleShared() {
  try {
    if (Cloud.ready()) return await Cloud.getSchedule();
    return (await ExamDB.getSetting("examSchedule")) || {};
  } catch (e) { console.warn("Gagal memuat jadwal ujian:", e); return {}; }
}

async function setScheduleStartShared(examId, isoStartOrNull) {
  if (Cloud.ready()) return Cloud.setScheduleStart(examId, isoStartOrNull);
  const sched = (await ExamDB.getSetting("examSchedule")) || {};
  sched[scheduleKey(examId)] = { startAt: isoStartOrNull || null };
  return ExamDB.setSetting("examSchedule", sched);
}
