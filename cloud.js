/* ============================================================
   CLOUD.js — lapisan penyimpanan TERPUSAT (Firebase Realtime Database)
   ------------------------------------------------------------
   Semua data penting portal (daftar nama siswa/roster, bank soal,
   jadwal ujian, kata sandi admin, hasil ujian & cuplikan proctoring)
   disimpan di sini, bukan lagi hanya di satu perangkat.

   Jika FIREBASE_CONFIG (lihat firebase-config.js) belum diisi atau
   perangkat sedang offline, setiap fungsi di bawah akan gagal dengan
   rapi dan kode pemanggil (shared.js / app.js / admin.js) otomatis
   memakai cadangan lokal (IndexedDB, lewat db.js) supaya portal tetap
   bisa dipakai untuk uji coba satu perangkat.
   ============================================================ */

let _fbApp = null, _fbDb = null, _fbReady = false, _fbError = null;

function initCloud() {
  if (_fbReady) return true;
  if (_fbError) return false;
  try {
    if (typeof firebase === "undefined") {
      throw new Error("Pustaka Firebase belum termuat (periksa koneksi internet).");
    }
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.databaseURL || cfg.databaseURL.includes("ISI_DI_SINI")) {
      throw new Error("FIREBASE_CONFIG belum diisi. Lihat firebase-config.js & README.md.");
    }
    _fbApp = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    _fbDb = firebase.database();
    _fbReady = true;
  } catch (e) {
    _fbError = e;
    console.warn("Penyimpanan terpusat (Firebase) tidak aktif:", e.message);
  }
  return _fbReady;
}

function cssKey(id) { return String(id).replace(/[.#$/\[\]]/g, "_"); }

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const Cloud = {
  ready() { return initCloud(); },
  lastError() { return _fbError; },

  /* ---------------- ROSTER (nama siswa yang boleh login) ---------------- */
  async getRoster() {
    if (!this.ready()) return null;
    const snap = await _fbDb.ref("roster").get();
    const val = snap.val() || {};
    return Object.entries(val).map(([id, r]) => ({ id, ...r }));
  },
  watchRoster(cb) {
    if (!this.ready()) return () => {};
    const ref = _fbDb.ref("roster");
    const handler = snap => {
      const val = snap.val() || {};
      cb(Object.entries(val).map(([id, r]) => ({ id, ...r })));
    };
    ref.on("value", handler);
    return () => ref.off("value", handler);
  },
  async addRosterEntry(entry) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    const ref = _fbDb.ref("roster").push();
    await ref.set(entry);
    return ref.key;
  },
  async deleteRosterEntry(id) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await _fbDb.ref(`roster/${id}`).remove();
  },

  /* ---------------- BANK SOAL (real-time ke semua perangkat siswa) ---------------- */
  async getExamOverride(examId) {
    if (!this.ready()) return undefined;
    const snap = await _fbDb.ref(`examOverrides/${cssKey(examId)}`).get();
    return snap.val();
  },
  watchExamOverride(examId, cb) {
    if (!this.ready()) return () => {};
    const ref = _fbDb.ref(`examOverrides/${cssKey(examId)}`);
    const handler = snap => cb(snap.val());
    ref.on("value", handler);
    return () => ref.off("value", handler);
  },
  async saveExamOverride(examId, data) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await _fbDb.ref(`examOverrides/${cssKey(examId)}`).set(data);
  },
  async resetExamOverride(examId) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await _fbDb.ref(`examOverrides/${cssKey(examId)}`).remove();
  },

  /* ---------------- JADWAL MULAI UJIAN ---------------- */
  async getSchedule() {
    if (!this.ready()) return {};
    const snap = await _fbDb.ref("examSchedule").get();
    return snap.val() || {};
  },
  watchSchedule(cb) {
    if (!this.ready()) { cb({}); return () => {}; }
    const ref = _fbDb.ref("examSchedule");
    const handler = snap => cb(snap.val() || {});
    ref.on("value", handler);
    return () => ref.off("value", handler);
  },
  async setScheduleStart(examId, isoStartOrNull) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await _fbDb.ref(`examSchedule/${cssKey(examId)}/startAt`).set(isoStartOrNull || null);
  },

  /* ---------------- KATA SANDI ADMIN (terpusat) ---------------- */
  async getAdminPasswordHash() {
    if (!this.ready()) return null;
    const snap = await _fbDb.ref("config/adminPasswordHash").get();
    return snap.val() || null;
  },
  async setAdminPassword(plain) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await _fbDb.ref("config/adminPasswordHash").set(await sha256Hex(plain));
  },
  async verifyAdminPassword(plain) {
    const hash = await this.getAdminPasswordHash();
    if (!hash) return false;
    return (await sha256Hex(plain)) === hash;
  },
  async ensureAdminPassword(defaultPlain) {
    if (!this.ready()) return;
    const hash = await this.getAdminPasswordHash();
    if (!hash) await this.setAdminPassword(defaultPlain);
  },

  /* ---------------- HASIL UJIAN (attempts) — mendukung banyak peserta serentak ---------------- */
  async saveAttempt(attempt) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    const { audioBlob, ...rest } = attempt; // audio tetap lokal saja (lihat README)
    await _fbDb.ref(`attempts/${rest.id}`).set(rest);
  },
  watchAttempts(cb) {
    if (!this.ready()) { cb(null); return () => {}; }
    const ref = _fbDb.ref("attempts");
    const handler = snap => cb(Object.values(snap.val() || {}));
    ref.on("value", handler);
    return () => ref.off("value", handler);
  },
  async deleteAttempt(id) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await _fbDb.ref(`attempts/${id}`).remove();
    await _fbDb.ref(`snapshots/${id}`).remove();
  },
  async clearAllAttempts() {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await _fbDb.ref("attempts").remove();
    await _fbDb.ref("snapshots").remove();
  },

  /* ---------------- CUPLIKAN PROCTORING ---------------- */
  async saveSnapshot(attemptId, snap) {
    if (!this.ready()) return;
    await _fbDb.ref(`snapshots/${attemptId}`).push(snap);
  },
  async getSnapshotsByAttempt(attemptId) {
    if (!this.ready()) return [];
    const snap = await _fbDb.ref(`snapshots/${attemptId}`).get();
    return Object.values(snap.val() || {});
  }
};

if (typeof module !== "undefined") module.exports = { Cloud };
