/**
 * auth.js
 * منطق المصادقة — تسجيل الدخول، الخروج، إعادة تعيين كلمة المرور.
 *
 * قواعد:
 * 1. لا نعرض Firebase Error Codes للمستخدم.
 * 2. كل error يمر من mapAuthError().
 * 3. لا يُسمح للعميل بتعديل Custom Claims.
 * 4. Audit Events تُسجّل في Firestore (إن وُجدت الدالة).
 */

import { auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdTokenResult,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// -----------------------------------------------
// Audit Logging (اختياري — يحتاج Collection في Firestore)
// -----------------------------------------------

/**
 * تسجيل حدث أمني في مجموعة audit_logs.
 * لن يُكتب إذا لم يكن المستخدم admin أو إذا فشلت العملية.
 *
 * ملاحظة: في إنتاج حقيقي، الأفضل استخدام Cloud Function
 * لتسجيل الأحداث بدل السماح للعميل بالكتابة مباشرة.
 */
async function logAuditEvent(eventType, data = {}) {
  try {
    const { getFirestore, collection, addDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js");
    const db = getFirestore();

    await addDoc(collection(db, "audit_logs"), {
      eventType,
      ...data,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      // لا نسجل: passwords, tokens, secrets
    });
  } catch {
    // فشل التسجيل لا يُعطّل العملية الأساسية
  }
}

// -----------------------------------------------
// Error Mapping
// -----------------------------------------------

/**
 * تحويل Firebase Auth Error إلى رسالة آمنة للمستخدم.
 * يمنع User Enumeration بدمج الأخطاء المتشابهة.
 *
 * @param {Error} error
 * @returns {{ ok: false, userMessage: string, code?: string }}
 */
function mapAuthError(error) {
  const code = error.code || "";

  // مجموعة أخطاء تسجيل الدخول — نفس الرسالة لمنع Enumeration
  const credentialErrors = [
    "auth/user-not-found",
    "auth/wrong-password",
    "auth/invalid-credential",
    "auth/invalid-login-credentials",
  ];

  if (credentialErrors.includes(code)) {
    return {
      ok: false,
      userMessage: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    };
  }

  if (code === "auth/too-many-requests") {
    return {
      ok: false,
      userMessage: "محاولات كثيرة. حاول بعد قليل.",
    };
  }

  if (code === "auth/email-not-verified") {
    return {
      ok: false,
      userMessage: "يرجى تفعيل حسابك عبر البريد الإلكتروني أولًا.",
    };
  }

  if (code === "auth/user-disabled") {
    return {
      ok: false,
      userMessage: "هذا الحساب معطّل. تواصل مع الدعم إذا كان هذا خطأ.",
    };
  }

  if (code === "auth/weak-password") {
    return {
      ok: false,
      userMessage: "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع تنوع.",
    };
  }

  if (code === "auth/email-already-in-use") {
    return {
      ok: false,
      userMessage: "هذا البريد الإلكتروني مسجل بالفعل.",
    };
  }

  if (code === "auth/invalid-email") {
    return {
      ok: false,
      userMessage: "صيغة البريد الإلكتروني غير صحيحة.",
    };
  }

  if (code === "auth/network-request-failed") {
    return {
      ok: false,
      userMessage: "خطأ في الاتصال بالشبكة. تحقق من الإنترنت وحاول مجددًا.",
    };
  }

  // Fallback عام — لا نكشف تفاصيل
  return {
    ok: false,
    userMessage: "حدث خطأ غير متوقع. حاول مجددًا.",
  };
}

// -----------------------------------------------
// Client-Side Validation (لتحسين UX فقط — ليس أمانًا)
// -----------------------------------------------

/**
 * تحقق بسيط من صحة البريد الإلكتروني.
 * @param {string} email
 * @returns {{ valid: boolean, message: string }}
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return { valid: false, message: "البريد الإلكتروني مطلوب." };
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) {
    return { valid: false, message: "صيغة البريد الإلكتروني غير صحيحة." };
  }
  return { valid: true, message: "" };
}

/**
 * تحقق بسيط من كلمة المرور.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, message: "كلمة المرور مطلوبة." };
  }
  if (password.length < 8) {
    return { valid: false, message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." };
  }
  return { valid: true, message: "" };
}

// -----------------------------------------------
// Authentication Functions
// -----------------------------------------------

/**
 * تسجيل الدخول بالبريد وكلمة المرور.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ ok: boolean, user?: object, userMessage?: string, claims?: object }>}
 */
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // الحصول على ID Token مع Custom Claims
    const idTokenResult = await getIdTokenResult(user);

    await logAuditEvent("login_success", {
      uid: user.uid,
      // لا نسجل البريد الكامل في الـ logs — فقط جزء منه
      emailPrefix: email.split("@")[0],
    });

    return {
      ok: true,
      user,
      claims: idTokenResult.claims,
    };
  } catch (error) {
    await logAuditEvent("login_failure", {
      emailPrefix: email ? email.split("@")[0] : "empty",
      errorCode: error.code,
    });

    return mapAuthError(error);
  }
}

/**
 * تسجيل الخروج.
 *
 * @returns {Promise<{ ok: boolean, userMessage?: string }>}
 */
export async function logout() {
  try {
    const user = auth.currentUser;
    if (user) {
      await logAuditEvent("logout", { uid: user.uid });
    }
    await signOut(auth);
    return { ok: true };
  } catch {
    return { ok: false, userMessage: "حدث خطأ أثناء تسجيل الخروج." };
  }
}

/**
 * إرسال رابط إعادة تعيين كلمة المرور.
 *
 * @param {string} email
 * @returns {Promise<{ ok: boolean, userMessage?: string }>}
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);

    await logAuditEvent("password_reset_requested", {
      emailPrefix: email ? email.split("@")[0] : "empty",
    });

    return {
      ok: true,
      userMessage: "إذا كان البريد مسجلًا، ستصلك رسالة لإعادة تعيين كلمة المرور.",
    };
  } catch (error) {
    await logAuditEvent("password_reset_failure", {
      emailPrefix: email ? email.split("@")[0] : "empty",
      errorCode: error.code,
    });

    // رسالة عامة لمنع User Enumeration
    // حتى لو كان البريد غير مسجل، لا نخبر المستخدم
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-email"
    ) {
      return {
        ok: true,
        userMessage: "إذا كان البريد مسجلًا، ستصلك رسالة لإعادة تعيين كلمة المرور.",
      };
    }

    return mapAuthError(error);
  }
}


/**
 * التحقق مما إذا كان المستخدم الحالي لديه صلاحية admin.
 *
 * @param {boolean} forceRefresh — إجبار تحديث Token
 * @returns {Promise<boolean>}
 */
export async function isAdmin(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const idTokenResult = await getIdTokenResult(user, forceRefresh);
    return idTokenResult.claims.admin === true;
  } catch {
    return false;
  }
}
// ============================================
// دوال تسجيل الدخول عبر مقدمي الخدمات (Google, GitHub)
// ============================================

import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

/**
 * تسجيل الدخول عبر Google
 */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await logAuditEvent("login_google_success", {
      uid: user.uid,
      emailPrefix: user.email ? user.email.split("@")[0] : "unknown",
    });

    return {
      ok: true,
      user,
      isNewUser: result._tokenResponse?.isNewUser || false,
    };
  } catch (error) {
    await logAuditEvent("login_google_failure", {
      errorCode: error.code,
    });
    return mapAuthError(error);
  }
}

/**
 * تسجيل الدخول عبر GitHub
 */
export async function loginWithGithub() {
  try {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await logAuditEvent("login_github_success", {
      uid: user.uid,
      emailPrefix: user.email ? user.email.split("@")[0] : "unknown",
    });

    return {
      ok: true,
      user,
      isNewUser: result._tokenResponse?.isNewUser || false,
    };
  } catch (error) {
    await logAuditEvent("login_github_failure", {
      errorCode: error.code,
    });
    return mapAuthError(error);
  }
}

/**
 * إرسال رابط تفعيل البريد الإلكتروني
 */
export async function sendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, userMessage: "يجب تسجيل الدخول أولاً." };
  }

  try {
    await sendEmailVerification(user);
    return {
      ok: true,
      userMessage: "تم إرسال رابط التفعيل إلى بريدك الإلكتروني.",
    };
  } catch (error) {
    return mapAuthError(error);
  }
}

/**
 * التحقق من أن البريد الإلكتروني مفعّل
 */
export async function isEmailVerified() {
  const user = auth.currentUser;
  if (!user) return false;

  // إعادة تحميل بيانات المستخدم للتأكد من أحدث حالة
  await user.reload();
  return user.emailVerified;
}
