/* ============================================================
   SHARED.js — dipakai oleh portal siswa (app.js) dan admin (admin.js)
   Menggabungkan bank soal default (data.js) dengan perubahan yang
   disimpan admin melalui menu "Bank Soal".
   ============================================================ */

async function getEffectiveExam(examId) {
  const base = EXAMS[examId];
  if (!base) return null;
  try {
    const override = await ExamDB.getSetting(`override_${examId}`);
    if (override) {
      return Object.assign({}, base, override, { id: examId });
    }
  } catch (e) { console.warn("Gagal memuat override soal:", e); }
  return base;
}

async function saveExamOverride(examId, examData) {
  return ExamDB.setSetting(`override_${examId}`, examData);
}

async function resetExamOverride(examId) {
  return ExamDB.setSetting(`override_${examId}`, null);
}
