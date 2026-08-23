/**
 * auth-guard.js
 * حماية الصفحات — Auth Guard مركزي.
 *
 * لا يعتمد على:
 * - localStorage
 * - DOM attributes
 * - متغيرات JavaScript
 * - إخفاء عناصر
 *
 * يعتمد على:
 * - Firebase Auth State
 * - Firebase Custom Claims (admin)
 * - Firestore Security Rules (خط الدفاع النهائي)
 */

import { auth } from "./firebase-init.js";
import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

/**
 * ينتظر المستخدم الحالي ويتحقق من صلاحية admin.
 * يُستدعى في بداية كل صفحة إدارية.
 *
 * @param {object} options
 * @param {string} options.loginUrl — صفحة تسجيل الدخول
 * @param {string} options.forbiddenUrl — صفحة "محظور" (403)
 * @returns {Promise<object|null>} — user object أو null
 */
export async function requireAdmin({
  loginUrl = "/login.html",
  forbiddenUrl = null,
} = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      window.location.href = loginUrl;
      reject(new Error("Auth state timeout"));
    }, 10000);

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      clearTimeout(timeout);
      unsubscribe();

      if (!user) {
        window.location.href = loginUrl;
        reject(new Error("Not authenticated"));
        return;
      }

      try {
        const idTokenResult = await getIdTokenResult(user);

        if (idTokenResult.claims.admin === true) {
          resolve(user);
        } else {
          if (forbiddenUrl) {
            window.location.href = forbiddenUrl;
          } else {
            document.body.textContent = "غير مصرح بالوصول.";
            document.body.style.cssText =
              "display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Cairo,sans-serif;color:#F4F4F5;background:#09090B;font-size:1.125rem;";
          }
          reject(new Error("Not admin"));
        }
      } catch (error) {
        window.location.href = loginUrl;
        reject(error);
      }
    });
  });
}

/**
 * ينتظر المستخدم الحالي فقط (بدون تحقق admin).
 * يُستدعى في صفحات Dashboard الخاصة بالمستخدم.
 *
 * @param {string} loginUrl
 * @returns {Promise<object|null>}
 */
export function requireAuth(loginUrl = "/login.html") {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      window.location.href = loginUrl;
      reject(new Error("Auth state timeout"));
    }, 10000);

    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timeout);
      unsubscribe();

      if (!user) {
        window.location.href = loginUrl;
        reject(new Error("Not authenticated"));
        return;
      }

      resolve(user);
    });
  });
}

/**
 * ينتظر المستخدم الحالي ويتحقق من تفعيل البريد الإلكتروني.
 * يستخدم في الصفحات التي تتطلب حساباً مفعّلاً.
 *
 * @param {string} loginUrl
 * @param {string} verifyUrl
 * @returns {Promise<object|null>}
 */
export function requireVerifiedEmail(loginUrl = "/login.html", verifyUrl = "/verify-email.html") {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      window.location.href = loginUrl;
      reject(new Error("Auth state timeout"));
    }, 10000);

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      clearTimeout(timeout);
      unsubscribe();

      if (!user) {
        window.location.href = loginUrl;
        reject(new Error("Not authenticated"));
        return;
      }

      // إعادة تحميل بيانات المستخدم للتأكد من أحدث حالة
      try {
        await user.reload();

        if (!user.emailVerified) {
          window.location.href = verifyUrl;
          reject(new Error("Email not verified"));
          return;
        }

        resolve(user);
      } catch (error) {
        window.location.href = loginUrl;
        reject(error);
      }
    });
  });
}
