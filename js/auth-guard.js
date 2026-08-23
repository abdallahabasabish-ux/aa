/**
 * auth-guard.js — بدون requireVerifiedEmail
 */

import { auth } from "./firebase-init.js";
import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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

// ❌ مهملة — تحتفظ بها للتوافق
export function requireVerifiedEmail(loginUrl = "/login.html") {
  return requireAuth(loginUrl);
}
