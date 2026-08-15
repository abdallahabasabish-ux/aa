/**
 * auth-guard.js
 * حماية الصفحات الإدارية وحسابات المستخدمين.
 * 
 * تتحقق من صلاحية Admin عبر:
 * 1. Custom Claims (الأولوية القصوى)
 * 2. حقل role في Firestore (كحل احتياطي)
 */
import { auth, db } from "./firebase-init.js";
import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export function requireAdmin({ loginUrl = "/login.html", forbiddenUrl = null } = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      window.location.replace(loginUrl);
      reject(new Error("Auth timeout"));
    }, 10000);

    const unsub = auth.onAuthStateChanged(async (user) => {
      clearTimeout(timeout);
      unsub();

      // 1️⃣ تأكد من أن المستخدم مسجل
      if (!user) {
        window.location.replace(loginUrl);
        return reject(new Error("Not authenticated"));
      }

      try {
        // 2️⃣ تحقق من Custom Claims أولاً (الأعلى أماناً)
        const tokenResult = await getIdTokenResult(user);
        if (tokenResult.claims.admin === true) {
          resolve(user);
          return;
        }

        // 3️⃣ إذا لم يكن Admin في Custom Claims، تحقق من Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === "admin") {
              // ✅ المستخدم Admin في Firestore → نسمح بالدخول
              // (يمكنك أيضاً تحديث Custom Claims تلقائياً هنا)
              resolve(user);
              return;
            }
          }
        } catch (firestoreError) {
          console.warn("⚠️ فشل التحقق من Firestore:", firestoreError);
        }

        // ❌ غير مصرح
        if (forbiddenUrl) {
          window.location.replace(forbiddenUrl);
        } else {
          document.body.textContent = "غير مصرح بالوصول.";
          document.body.style.cssText =
            "display:flex;align-items:center;justify-content:center;min-height:100dvh;font-family:Cairo,sans-serif;color:#F4F4F5;background:#09090B;font-size:1.125rem;";
        }
        reject(new Error("Not admin"));

      } catch (error) {
        console.error("⚠️ خطأ في التحقق من الصلاحيات:", error);
        window.location.replace(loginUrl);
        reject(new Error("Token error"));
      }
    });
  });
}

export function requireAuth(loginUrl = "/login.html") {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsub();
      window.location.replace(loginUrl);
      reject(new Error("Auth timeout"));
    }, 10000);

    const unsub = auth.onAuthStateChanged((user) => {
      clearTimeout(timeout);
      unsub();
      if (!user) {
        window.location.replace(loginUrl);
        return reject(new Error("Not authenticated"));
      }
      resolve(user);
    });
  });
}
