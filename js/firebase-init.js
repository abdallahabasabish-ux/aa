// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyDg-oSbA_UdlzMS8HZGE0pHtr_zWg5rrXY",
    authDomain: "abdallahsst.firebaseapp.com",
    projectId: "abdallahsst",
    storageBucket: "abdallahsst.firebasestorage.app",
    messagingSenderId: "1011946194938",
    appId: "1:1011946194938:web:9bee94362711431368c643",
    measurementId: "G-ZP5BJH98CS"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

console.log("🔥 Firebase initialized successfully!");
