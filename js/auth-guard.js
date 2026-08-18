/**
 * auth-guard.js
 * حماية الصفحات بناءً على حالة المصادقة وCustom Claims.
 *
 * يضمن أن المستخدم:
 * - مسجّل الدخول قبل الوصول إلى الصفحات المحمية
 * - لديه claim admin=true عند الوصول إلى صفحات الإدارة
 */

import { auth } from "./firebase-init.js";
import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const DEFAULT_LOGIN_URL = "/login.html";
const DEFAULT_DASHBOARD_URL = "/dashboard/dashboard.html";
const DEFAULT_ADMIN_URL = "/admin/admin.html";

function normalizeOptions(optionsOrUrl) {
  if (typeof optionsOrUrl === "string") {
    return {
      loginUrl: optionsOrUrl || DEFAULT_LOGIN_URL,
      dashboardUrl: DEFAULT_DASHBOARD_URL,
      adminUrl: DEFAULT_ADMIN_URL,
    };
  }

  const options = optionsOrUrl || {};
  return {
    loginUrl: options.loginUrl || DEFAULT_LOGIN_URL,
    dashboardUrl: options.dashboardUrl || DEFAULT_DASHBOARD_URL,
    adminUrl: options.adminUrl || DEFAULT_ADMIN_URL,
  };
}

function revealPage() {
  if (typeof document !== "undefined" && document.body) {
    document.body.style.visibility = "visible";
  }
}

function redirectTo(url) {
  if (!url || typeof window === "undefined") return;
  revealPage();
  const safeUrl = /^\//.test(url) ? url : `/${url}`;
  window.location.replace(safeUrl);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function requireAuth(optionsOrUrl = DEFAULT_LOGIN_URL) {
  const options = normalizeOptions(optionsOrUrl);

  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();

      if (!user) {
        redirectTo(options.loginUrl);
        reject(new Error("User not authenticated"));
        return;
      }

      try {
        // فرض تحديث التوكن لضمان أن Claims الحالية محدثة
        await getIdTokenResult(user, true);
        resolve(user);
      } catch (error) {
        redirectTo(options.loginUrl);
        reject(error);
      }
    });
  });
}

export async function requireAdmin(optionsOrUrl = { loginUrl: DEFAULT_LOGIN_URL }) {
  const options = normalizeOptions(optionsOrUrl);

  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();

      if (!user) {
        redirectTo(options.loginUrl);
        reject(new Error("User not authenticated"));
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(user, true);

        if (!tokenResult.claims?.admin) {
          redirectTo(options.dashboardUrl);
          reject(new Error("User is not an admin"));
          return;
        }

        resolve(user);
      } catch (error) {
        redirectTo(options.loginUrl);
        reject(error);
      }
    });
  });
}

export function isAdminClaim(claims = {}) {
  return Boolean(claims?.admin === true);
}
