/* ============================================================
   CLOUD.js — lapisan penyimpanan TERPUSAT
   ------------------------------------------------------------
   Semua data TEKS penting portal (daftar nama siswa/roster, bank
   soal, jadwal ujian, kata sandi admin, jawaban & hasil ujian)
   disimpan di Firebase Realtime Database lewat REST API murni +
   koneksi streaming (Server-Sent Events) bawaan browser — TANPA
   memuat pustaka Firebase SDK sama sekali, sehingga cukup diisi
   satu alamat database saja (lihat firebase-config.js / EXAM_DB_URL).

   PENTING (privasi & ukuran berkas): cuplikan foto webcam dan
   rekaman audio proctoring SENGAJA TIDAK PERNAH dikirim lewat
   modul ini. Keduanya tetap tersimpan lokal (IndexedDB) di
   perangkat siswa masing-masing — lihat db.js (ExamDB.saveSnapshot
   dan attempt.audioBlob). Modul ini hanya menangani data teks:
   roster, soal, jadwal, kata sandi admin, jawaban, dan nilai.

   Jika EXAM_DB_URL (lihat firebase-config.js) belum diisi atau
   perangkat sedang offline, setiap fungsi di bawah akan gagal
   dengan rapi dan kode pemanggil (shared.js / app.js / admin.js)
   otomatis memakai cadangan lokal (IndexedDB, lewat db.js) supaya
   portal tetap bisa dipakai untuk uji coba satu perangkat.
   ============================================================ */

let _cloudReady = null; // null = belum dicek, true/false = hasil cek

function initCloud() {
  if (_cloudReady !== null) return _cloudReady;
  const url = window.EXAM_DB_URL;
  _cloudReady = !!(url && /^https:\/\/.+\.firebasedatabase\.app$/.test(url.trim()));
  if (!_cloudReady) console.warn("Penyimpanan terpusat tidak aktif: EXAM_DB_URL belum diisi dengan benar (lihat firebase-config.js).");
  return _cloudReady;
}

function baseUrl() { return window.EXAM_DB_URL.replace(/\/+$/, ""); }
function jsonUrl(path) { return `${baseUrl()}/${path}.json`; }
function cssKey(id) { return String(id).replace(/[.#$/\[\]]/g, "_"); }

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- REST primitives ---------------- */
async function restGet(path) {
  const res = await fetch(jsonUrl(path));
  if (!res.ok) throw new Error(`Gagal membaca ${path} (${res.status})`);
  return res.json();
}
async function restPut(path, value) {
  const res = await fetch(jsonUrl(path), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
  if (!res.ok) throw new Error(`Gagal menyimpan ${path} (${res.status})`);
  return res.json();
}
async function restPost(path, value) {
  const res = await fetch(jsonUrl(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
  if (!res.ok) throw new Error(`Gagal menambah ${path} (${res.status})`);
  return res.json(); // { name: "<key baru>" }
}
async function restDelete(path) {
  const res = await fetch(jsonUrl(path), { method: "DELETE" });
  if (!res.ok) throw new Error(`Gagal menghapus ${path} (${res.status})`);
  return res.json();
}

/* ---------------- Streaming (realtime) primitives ----------------
   Firebase Realtime Database mendukung streaming lewat HTTP biasa:
   permintaan GET ke "<path>.json" dengan header "Accept:
   text/event-stream" akan dikirimi event "put" (data awal & setiap
   penggantian penuh) dan "patch" (penggabungan sebagian). Objek
   EventSource bawaan browser SELALU mengirim header Accept tersebut
   secara otomatis, sehingga bisa dipakai langsung tanpa pustaka
   tambahan apa pun. */
function applyAtPath(obj, path, value) {
  if (path === "/" || path === "") return value;
  const segs = path.split("/").filter(Boolean);
  const root = (obj && typeof obj === "object") ? obj : {};
  let cur = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i];
    if (typeof cur[s] !== "object" || cur[s] === null) cur[s] = {};
    cur = cur[s];
  }
  const last = segs[segs.length - 1];
  if (value === null || value === undefined) delete cur[last];
  else cur[last] = value;
  return root;
}
function applyPatch(obj, path, data) {
  const segs = path === "/" ? [] : path.split("/").filter(Boolean);
  const root = (obj && typeof obj === "object") ? obj : {};
  let cur = root;
  for (const s of segs) {
    if (typeof cur[s] !== "object" || cur[s] === null) cur[s] = {};
    cur = cur[s];
  }
  Object.entries(data || {}).forEach(([k, v]) => { if (v === null) delete cur[k]; else cur[k] = v; });
  return root;
}

/* Berlangganan path tertentu secara realtime. cb dipanggil dengan
   nilai objek terbaru pada path tsb (bisa null jika kosong).
   Mengembalikan fungsi untuk berhenti berlangganan. */
function watchPath(path, cb) {
  if (!initCloud()) { cb(null); return () => {}; }
  let cache;
  let es;
  try {
    es = new EventSource(jsonUrl(path));
  } catch (e) {
    console.warn("Gagal membuka koneksi realtime:", e.message);
    cb(null);
    return () => {};
  }
  es.addEventListener("put", ev => {
    try {
      const { path: p, data } = JSON.parse(ev.data);
      cache = applyAtPath(cache, p, data);
      cb(cache === undefined ? null : cache);
    } catch (e) { console.warn("Gagal memproses data realtime:", e); }
  });
  es.addEventListener("patch", ev => {
    try {
      const { path: p, data } = JSON.parse(ev.data);
      cache = applyPatch(cache, p, data);
      cb(cache === undefined ? null : cache);
    } catch (e) { console.warn("Gagal memproses data realtime:", e); }
  });
  es.onerror = () => { /* EventSource mencoba menyambung ulang otomatis */ };
  return () => { try { es.close(); } catch (e) {} };
}

function toArrayWithIds(obj) {
  return Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));
}

const Cloud = {
  ready() { return initCloud(); },
  lastError() { return initCloud() ? null : new Error("EXAM_DB_URL belum diisi dengan benar."); },

  /* ---------------- ROSTER (nama siswa yang boleh login) ---------------- */
  async getRoster() {
    if (!this.ready()) return null;
    return toArrayWithIds(await restGet("roster"));
  },
  watchRoster(cb) { return watchPath("roster", val => cb(toArrayWithIds(val))); },
  async addRosterEntry(entry) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    const res = await restPost("roster", entry);
    return res.name;
  },
  async deleteRosterEntry(id) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await restDelete(`roster/${id}`);
  },

  /* ---------------- BANK SOAL (real-time ke semua perangkat siswa) ---------------- */
  async getExamOverride(examId) {
    if (!this.ready()) return undefined;
    return restGet(`examOverrides/${cssKey(examId)}`);
  },
  watchExamOverride(examId, cb) { return watchPath(`examOverrides/${cssKey(examId)}`, cb); },
  async saveExamOverride(examId, data) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await restPut(`examOverrides/${cssKey(examId)}`, data);
  },
  async resetExamOverride(examId) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await restDelete(`examOverrides/${cssKey(examId)}`);
  },

  /* ---------------- JADWAL MULAI UJIAN (wajib diisi admin) ---------------- */
  async getSchedule() {
    if (!this.ready()) return {};
    return (await restGet("examSchedule")) || {};
  },
  watchSchedule(cb) { return watchPath("examSchedule", val => cb(val || {})); },
  async setScheduleStart(examId, isoStartOrNull) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await restPut(`examSchedule/${cssKey(examId)}/startAt`, isoStartOrNull || null);
  },

  /* ---------------- KATA SANDI ADMIN (terpusat) ---------------- */
  async getAdminPasswordHash() {
    if (!this.ready()) return null;
    return (await restGet("config/adminPasswordHash")) || null;
  },
  async setAdminPassword(plain) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await restPut("config/adminPasswordHash", await sha256Hex(plain));
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

  /* ---------------- HASIL UJIAN (attempts) — jawaban & nilai, teks saja ---------------- */
  async saveAttempt(attempt) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    // audioBlob (rekaman audio) sengaja TIDAK dikirim — tetap lokal saja (lihat README & catatan di atas)
    const { audioBlob, ...rest } = attempt;
    await restPut(`attempts/${rest.id}`, rest);
  },
  watchAttempts(cb) {
    return watchPath("attempts", val => cb(val === null ? null : Object.values(val || {})));
  },
  async deleteAttempt(id) {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await restDelete(`attempts/${id}`);
  },
  async clearAllAttempts() {
    if (!this.ready()) throw new Error("Penyimpanan terpusat belum aktif.");
    await restDelete("attempts");
  }
};

if (typeof module !== "undefined") module.exports = { Cloud };
