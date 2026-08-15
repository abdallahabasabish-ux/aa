/**
 * auth-guard.js
 * حماية الصفحات — Auth Guard مركزي.
 *
 * لا يعتمد على: localStorage, DOM, متغيرات JS, إخفاء عناصر.
 * يعتمد على: Firebase Auth State + Custom Claims + Security Rules.
 */

import { auth } from "./firebase-init.js";
import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

/**
 * يتطلب مستخدم admin — يُستدعى في كل صفحة إدارية.
 */
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

      if (!user) {
        window.location.replace(loginUrl);
        return reject(new Error("Not authenticated"));
      }

      try {
        const r = await getIdTokenResult(user);
        if (r.claims.admin === true) {
          resolve(user);
        } else {
          if (forbiddenUrl) {
            window.location.replace(forbiddenUrl);
          } else {
            document.body.textContent = "غير مصرح بالوصول.";
            document.body.style.cssText =
              "display:flex;align-items:center;justify-content:center;min-height:100dvh;font-family:Cairo,sans-serif;color:#F4F4F5;background:#09090B;font-size:1.125rem;";
          }
          reject(new Error("Not admin"));
        }
      } catch {
        window.location.replace(loginUrl);
        reject(new Error("Token error"));
      }
    });
  });
}

/**
 * يتطلب مستخدم مسجل — يُستدعى في صفحات الـ dashboard.
 */
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
