/* ============================================================
   SHARED.js — dipakai oleh portal siswa (app.js) dan admin (admin.js)
   Menggabungkan bank soal bawaan (data.js) dengan perubahan admin.
   Sumber utama kini penyimpanan TERPUSAT (Firebase, lihat cloud.js)
   sehingga perubahan admin langsung tersedia untuk semua perangkat
   siswa. Jika penyimpanan terpusat belum dikonfigurasi/offline,
   sistem otomatis memakai cadangan lokal (IndexedDB) di perangkat ini.
   ============================================================ */

async function getEffectiveExam(examId) {
  const all = await getAllExamsShared();
  const base = all[examId];
  if (!base) return null;
  if (examId in EXAMS) {
    // Mapel bawaan: gabungkan dengan perubahan admin (override sebagian)
    let override = null;
    try {
      if (Cloud.ready()) override = await Cloud.getExamOverride(examId);
      else override = await ExamDB.getSetting(`override_${examId}`);
    } catch (e) { console.warn("Gagal memuat perubahan soal:", e); }
    if (override) return Object.assign({}, base, override, { id: examId });
    return base;
  }
  // Mapel tambahan (dibuat manual/impor dokumen): dipakai apa adanya
  return Object.assign({}, base, { id: examId });
}

/* Berlangganan perubahan soal secara real-time. Mengembalikan fungsi
   untuk berhenti berlangganan. Dipakai di layar login siswa supaya
   soal terbaru dari admin langsung terpakai tanpa perlu memuat ulang. */
function watchEffectiveExam(examId, cb) {
  if (!(examId in EXAMS)) {
    // Mapel tambahan: belum ada API watch per-item, cukup ambil sekali
    getEffectiveExam(examId).then(cb);
    return () => {};
  }
  const base = EXAMS[examId];
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

/* ---------------- MATA PELAJARAN TAMBAHAN (dibuat manual/impor dokumen) ---------------- */
async function getCustomExamsShared() {
  try {
    if (Cloud.ready()) return (await Cloud.getCustomExams()) || {};
    return (await ExamDB.getSetting("customExams")) || {};
  } catch (e) { console.warn("Gagal memuat mata pelajaran tambahan:", e); return {}; }
}
async function saveCustomExamShared(examId, examData) {
  if (Cloud.ready()) return Cloud.saveCustomExam(examId, examData);
  const all = (await ExamDB.getSetting("customExams")) || {};
  all[cssKeyLocal(examId)] = examData;
  return ExamDB.setSetting("customExams", all);
}
async function deleteCustomExamShared(examId) {
  if (Cloud.ready()) return Cloud.deleteCustomExam(examId);
  const all = (await ExamDB.getSetting("customExams")) || {};
  delete all[cssKeyLocal(examId)];
  return ExamDB.setSetting("customExams", all);
}
function cssKeyLocal(id) { return String(id).replace(/[.#$/\[\]]/g, "_"); }

/* Simpan data soal apa pun (mapel bawaan ATAU mapel tambahan) lewat satu
   fungsi saja — admin.js tidak perlu tahu asal-usul mapelnya. */
async function saveExamData(examId, examData) {
  if (examId in EXAMS) return saveExamOverride(examId, examData);
  return saveCustomExamShared(examId, examData);
}

/* Gabungan mapel bawaan (data.js) + mapel tambahan, dalam bentuk
   { examId: examData }. Dipakai di mana pun daftar SEMUA mapel yang
   tersedia diperlukan (dropdown login, dasbor admin, filter, dsb). */
async function getAllExamsShared() {
  const custom = await getCustomExamsShared();
  const merged = Object.assign({}, EXAMS);
  Object.entries(custom).forEach(([key, data]) => { merged[key] = Object.assign({ id: key }, data); });
  return merged;
}

/* Struktur kelas -> daftar mapel, digabung dari CLASS_SUBJECT_MAP bawaan
   (data.js) dengan kelas/mapel baru yang muncul dari mapel tambahan. */
async function getClassSubjectMapShared() {
  const custom = await getCustomExamsShared();
  const map = {};
  Object.entries(CLASS_SUBJECT_MAP).forEach(([k, list]) => { map[k] = [...list]; });
  Object.values(custom).forEach(ex => {
    if (!ex || !ex.kelas || !ex.mapel) return;
    if (!map[ex.kelas]) map[ex.kelas] = [];
    if (!map[ex.kelas].includes(ex.mapel)) map[ex.kelas].push(ex.mapel);
  });
  return map;
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

/* ---------------- JADWAL UJIAN + DURASI PER MAPEL ---------------- */
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
  sched[scheduleKey(examId)] = Object.assign({}, sched[scheduleKey(examId)], { startAt: isoStartOrNull || null });
  return ExamDB.setSetting("examSchedule", sched);
}

async function setScheduleDurationShared(examId, minutesOrNull) {
  if (Cloud.ready()) return Cloud.setScheduleDuration(examId, minutesOrNull);
  const sched = (await ExamDB.getSetting("examSchedule")) || {};
  sched[scheduleKey(examId)] = Object.assign({}, sched[scheduleKey(examId)], { durationMinutes: minutesOrNull || null });
  return ExamDB.setSetting("examSchedule", sched);
}

/* Durasi efektif (menit) untuk suatu ujian: jadwal (diatur admin di menu
   Jadwal Ujian) > durasi bawaan paket soal (mis. dari impor dokumen) >
   default global EXAM_DURATION_MINUTES di data.js. */
function effectiveDurationMinutes(scheduleEntry, exam) {
  if (scheduleEntry && scheduleEntry.durationMinutes) return scheduleEntry.durationMinutes;
  if (exam && exam.durationMinutes) return exam.durationMinutes;
  return EXAM_DURATION_MINUTES;
}
