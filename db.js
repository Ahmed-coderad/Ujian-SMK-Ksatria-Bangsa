/* ============================================================
   DB.js — lapisan penyimpanan lokal (IndexedDB) untuk portal ujian
   Catatan penting (lihat README): penyimpanan ini bersifat LOKAL
   per-perangkat/browser. Untuk penggunaan lintas perangkat dengan
   banyak siswa & komputer berbeda, arahkan write function di sini
   ke sebuah backend/API sungguhan.
   ============================================================ */

const DB_NAME = "smk_kb_exam_db";
const DB_VERSION = 1;
const STORE_ATTEMPTS = "attempts";     // hasil ujian siswa
const STORE_SNAPSHOTS = "snapshots";   // foto webcam berkala (bukti proctoring)
const STORE_SETTINGS = "settings";     // override soal & konfigurasi admin

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_ATTEMPTS)) {
        const s = db.createObjectStore(STORE_ATTEMPTS, { keyPath: "id" });
        s.createIndex("byClassSubject", "classSubject");
        s.createIndex("byDate", "submittedAt");
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        const s2 = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "id" });
        s2.createIndex("byAttempt", "attemptId");
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

const ExamDB = {
  async saveAttempt(attempt) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = tx(db, STORE_ATTEMPTS, "readwrite");
      const req = store.put(attempt);
      req.onsuccess = () => resolve(attempt);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllAttempts() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = tx(db, STORE_ATTEMPTS, "readonly");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteAttempt(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = tx(db, STORE_ATTEMPTS, "readwrite");
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async saveSnapshot(snap) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = tx(db, STORE_SNAPSHOTS, "readwrite");
      const req = store.put(snap);
      req.onsuccess = () => resolve(snap);
      req.onerror = () => reject(req.error);
    });
  },

  async getSnapshotsByAttempt(attemptId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = tx(db, STORE_SNAPSHOTS, "readonly");
      const idx = store.index("byAttempt");
      const req = idx.getAll(IDBKeyRange.only(attemptId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteSnapshotsByAttempt(attemptId) {
    const snaps = await this.getSnapshotsByAttempt(attemptId);
    const db = await openDB();
    const store = tx(db, STORE_SNAPSHOTS, "readwrite");
    snaps.forEach(s => store.delete(s.id));
    return true;
  },

  async setSetting(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = tx(db, STORE_SETTINGS, "readwrite");
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async getSetting(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = tx(db, STORE_SETTINGS, "readonly");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
      req.onerror = () => reject(req.error);
    });
  },

  async clearAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction([STORE_ATTEMPTS, STORE_SNAPSHOTS], "readwrite");
      t.objectStore(STORE_ATTEMPTS).clear();
      t.objectStore(STORE_SNAPSHOTS).clear();
      t.oncomplete = () => resolve(true);
      t.onerror = () => reject(t.error);
    });
  }
};
