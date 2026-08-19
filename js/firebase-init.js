/**
 * firebase-init.js
 * تهيئة Firebase — الملف الوحيد الذي يحتوي على إعدادات المشروع.
 *
 * ملاحظة أمنية:
 * Firebase Web API Key ليست secret بحد ذاتها.
 * الأمان الحقيقي يتحقق عبر Security Rules + App Check + Custom Claims.
 * لا تضع هنا: Service Account, Private Keys, Admin SDK secrets.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDg-oSbA_UdlzMS8HZGE0pHtr_zWg5rrXY",
  authDomain: "abdallahsst.firebaseapp.com",
  projectId: "abdallahsst",
  storageBucket: "abdallahsst.firebasestorage.app",
  messagingSenderId: "1011946194938",
  appId: "1:1011946194938:web:9bee94362711431368c643",
  measurementId: "G-ZP5BJH98CS",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// -----------------------------------------------
// Emulator — فعّل فقط أثناء التطوير المحلي
// -----------------------------------------------
// Uncomment الأسطر التالية عند التطوير مع Firebase Emulator:
//
// if (location.hostname === "localhost") {
//   connectAuthEmulator(auth, "http://localhost:9099");
//   connectFirestoreEmulator(db, "localhost", 8080);
//   connectStorageEmulator(storage, "localhost", 9199);
// }

export { app, auth, db, storage };
