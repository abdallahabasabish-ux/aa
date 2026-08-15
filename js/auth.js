import { auth, db } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdTokenResult,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

async function logAuditEvent(eventType, data = {}) {
  try {
    const { collection, addDoc, serverTimestamp } = await import(
      "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"
    );
    await addDoc(collection(db, "audit_logs"), {
      eventType,
      ...data,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 200),
    });
  } catch {}
}

function mapAuthError(error) {
  const code = error.code || "";
  const credentialErrors = ["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"];
  if (credentialErrors.includes(code)) return { ok: false, userMessage: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  if (code === "auth/too-many-requests") return { ok: false, userMessage: "محاولات كثيرة. حاول بعد قليل." };
  if (code === "auth/email-not-verified") return { ok: false, userMessage: "يرجى تفعيل حسابك عبر البريد الإلكتروني أولًا." };
  if (code === "auth/user-disabled") return { ok: false, userMessage: "هذا الحساب معطّل. تواصل مع الدعم." };
  if (code === "auth/weak-password") return { ok: false, userMessage: "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع تنوع." };
  if (code === "auth/email-already-in-use") return { ok: false, userMessage: "هذا البريد الإلكتروني مسجل بالفعل." };
  if (code === "auth/invalid-email") return { ok: false, userMessage: "صيغة البريد الإلكتروني غير صحيحة." };
  if (code === "auth/network-request-failed") return { ok: false, userMessage: "خطأ في الاتصال. تحقق من الإنترنت وحاول مجددًا." };
  return { ok: false, userMessage: "حدث خطأ غير متوقع. حاول مجددًا." };
}

export function validateName(name) {
  if (!name || !name.trim()) return { valid: false, message: "الاسم مطلوب." };
  if (name.trim().length < 2) return { valid: false, message: "الاسم قصير جدًا." };
  if (name.trim().length > 60) return { valid: false, message: "الاسم طويل جدًا." };
  return { valid: true, message: "" };
}

export function validateEmail(email) {
  if (!email || !email.trim()) return { valid: false, message: "البريد الإلكتروني مطلوب." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { valid: false, message: "صيغة البريد الإلكتروني غير صحيحة." };
  return { valid: true, message: "" };
}

export function validatePassword(password) {
  if (!password) return { valid: false, message: "كلمة المرور مطلوبة." };
  if (password.length < 8) return { valid: false, message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." };
  if (password.length > 128) return { valid: false, message: "كلمة المرور طويلة جدًا." };
  return { valid: true, message: "" };
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return { valid: false, message: "تأكيد كلمة المرور مطلوب." };
  if (password !== confirm) return { valid: false, message: "كلمتا المرور غير متطابقتين." };
  return { valid: true, message: "" };
}

export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const tokenResult = await getIdTokenResult(cred.user);
    await logAuditEvent("login_success", { uid: cred.user.uid, emailPrefix: email.split("@")[0] });
    return { ok: true, user: cred.user, claims: tokenResult.claims };
  } catch (error) {
    await logAuditEvent("login_failure", { emailPrefix: email ? email.split("@")[0] : "empty", errorCode: error.code });
    return mapAuthError(error);
  }
}

export async function register(email, password, displayName) {
  try {
    // 1. إنشاء الحساب في Authentication
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // 2. تحديث الاسم (displayName)
    if (displayName && displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }

    // 3. ✅ إضافة المستخدم إلى Firestore في مجموعة "users"
    try {
      const { doc, setDoc, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"
      );
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName?.trim() || "",
        phone: "",
        photoURL: "",
        role: "user",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("✅ تم حفظ المستخدم في Firestore بنجاح!");
    } catch (firestoreError) {
      console.warn("⚠️ فشل إضافة المستخدم إلى Firestore:", firestoreError);
    }

    // 4. تسجيل حدث نجاح
    await logAuditEvent("register_success", {
      uid: cred.user.uid,
      emailPrefix: email.split("@")[0],
    });

    return { ok: true, user: cred.user };
  } catch (error) {
    await logAuditEvent("register_failure", {
      emailPrefix: email ? email.split("@")[0] : "empty",
      errorCode: error.code,
    });
    return mapAuthError(error);
  }
}

export async function logout() {
  try {
    const user = auth.currentUser;
    if (user) await logAuditEvent("logout", { uid: user.uid });
    await signOut(auth);
    return { ok: true };
  } catch {
    return { ok: false, userMessage: "حدث خطأ أثناء تسجيل الخروج." };
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    await logAuditEvent("password_reset_requested", { emailPrefix: email ? email.split("@")[0] : "empty" });
    return { ok: true, userMessage: "إذا كان البريد مسجلًا، ستصلك رسالة لإعادة تعيين كلمة المرور." };
  } catch (error) {
    await logAuditEvent("password_reset_failure", { emailPrefix: email ? email.split("@")[0] : "empty", errorCode: error.code });
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-email") {
      return { ok: true, userMessage: "إذا كان البريد مسجلًا، ستصلك رسالة لإعادة تعيين كلمة المرور." };
    }
    return mapAuthError(error);
  }
}

export async function isAdmin(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const r = await getIdTokenResult(user, forceRefresh);
    return r.claims.admin === true;
  } catch {
    return false;
  }
}
