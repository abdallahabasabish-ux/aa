import { auth, db } from "./firebase-init.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdTokenResult,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

/* =========================================================
   CONFIGURATION
========================================================= */

const USERS_COLLECTION = "users";
const AUDIT_COLLECTION = "audit_logs";

const DEFAULT_ROLE = "user";

/* =========================================================
   NORMALIZATION
========================================================= */

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getEmailPrefix(email) {
  const value = normalizeEmail(email);

  if (!value.includes("@")) {
    return "";
  }

  return value
    .split("@")[0]
    .slice(0, 80);
}

/* =========================================================
   AUDIT LOG
========================================================= */

async function logAuditEvent(eventType, data = {}) {
  try {
    await addDoc(
      collection(db, AUDIT_COLLECTION),
      {
        eventType,
        ...data,
        timestamp: serverTimestamp(),
        userAgent:
          typeof navigator !== "undefined"
            ? navigator.userAgent.slice(0, 200)
            : "unknown"
      }
    );
  } catch (error) {
    /*
     * فشل Audit Log لا يجب أن يمنع
     * تسجيل الدخول أو التسجيل.
     */
    console.error(
      "Audit log error:",
      error
    );
  }
}

/* =========================================================
   AUTH ERROR HANDLER
========================================================= */

function mapAuthError(error) {
  const code = error?.code || "";

  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return {
        ok: false,
        userMessage:
          "البريد الإلكتروني أو كلمة المرور غير صحيحة."
      };

    case "auth/too-many-requests":
      return {
        ok: false,
        userMessage:
          "تم تجاوز عدد المحاولات المسموح بها. حاول لاحقًا."
      };

    case "auth/user-disabled":
      return {
        ok: false,
        userMessage:
          "هذا الحساب معطل. تواصل مع الدعم."
      };

    case "auth/email-already-in-use":
      return {
        ok: false,
        userMessage:
          "هذا البريد الإلكتروني مسجل بالفعل."
      };

    case "auth/invalid-email":
      return {
        ok: false,
        userMessage:
          "صيغة البريد الإلكتروني غير صحيحة."
      };

    case "auth/weak-password":
      return {
        ok: false,
        userMessage:
          "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل."
      };

    case "auth/network-request-failed":
      return {
        ok: false,
        userMessage:
          "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت."
      };

    case "auth/email-not-verified":
      return {
        ok: false,
        userMessage:
          "يرجى تفعيل البريد الإلكتروني أولًا."
      };

    default:
      console.error(
        "Unhandled Firebase Auth error:",
        error
      );

      return {
        ok: false,
        userMessage:
          "حدث خطأ غير متوقع. حاول مرة أخرى."
      };
  }
}

/* =========================================================
   VALIDATION
========================================================= */

export function validateName(name) {
  const value = normalizeName(name);

  if (!value) {
    return {
      valid: false,
      message: "الاسم مطلوب."
    };
  }

  if (value.length < 2) {
    return {
      valid: false,
      message: "الاسم قصير جدًا."
    };
  }

  if (value.length > 60) {
    return {
      valid: false,message: "الاسم طويل جدًا."
    };
  }

  return {
    valid: true,
    message: ""
  };
}

export function validateEmail(email) {
  const value = normalizeEmail(email);

  if (!value) {
    return {
      valid: false,
      message:
        "البريد الإلكتروني مطلوب."
    };
  }

  if (value.length > 254) {
    return {
      valid: false,
      message:
        "البريد الإلكتروني طويل جدًا."
    };
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!emailRegex.test(value)) {
    return {
      valid: false,
      message:
        "صيغة البريد الإلكتروني غير صحيحة."
    };
  }

  return {
    valid: true,
    message: ""
  };
}

export function validatePassword(password) {
  if (!password) {
    return {
      valid: false,
      message:
        "كلمة المرور مطلوبة."
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message:
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل."
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message:
        "كلمة المرور طويلة جدًا."
    };
  }

  return {
    valid: true,
    message: ""
  };
}

export function validateConfirmPassword(
  password,
  confirm
) {
  if (!confirm) {
    return {
      valid: false,
      message:
        "تأكيد كلمة المرور مطلوب."
    };
  }

  if (password !== confirm) {
    return {
      valid: false,
      message:
        "كلمتا المرور غير متطابقتين."
    };
  }

  return {
    valid: true,
    message: ""
  };
}

/* =========================================================
   CREATE USER PROFILE
========================================================= */

async function createUserProfile(
  user,
  name
) {
  const userRef = doc(
    db,
    USERS_COLLECTION,
    user.uid
  );

  const profile = {
    uid: user.uid,

    email: normalizeEmail(
      user.email
    ),

    name: normalizeName(name),

    /*
     * الدور الافتراضي للمستخدم.
     *
     * لا يتم استخدامه كصلاحية Admin.
     */
    role: DEFAULT_ROLE,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp()
  };

  await setDoc(
    userRef,
    profile
  );

  return profile;
}

/* =========================================================
   GET USER PROFILE
========================================================= */

export async function getUserProfile(
  uid = null
) {
  const currentUser =
    auth.currentUser;

  const userId =
    uid || currentUser?.uid;

  if (!userId) {
    return null;
  }

  try {
    const snapshot =
      await getDoc(
        doc(
          db,
          USERS_COLLECTION,
          userId
        )
      );

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    };

  } catch (error) {
    console.error(
      "Failed to load user profile:",
      error
    );

    return null;
  }
}

/* =========================================================
   REGISTER
========================================================= */

export async function register(
  email,
  password,
  displayName
) {
  const normalizedEmail =
    normalizeEmail(email);

  const normalizedName =
    normalizeName(displayName);

  /* Validate name */
  const nameValidation =
    validateName(normalizedName);

  if (!nameValidation.valid) {
    return {
      ok: false,
      userMessage:
        nameValidation.message
    };
  }

  /* Validate email */
  const emailValidation =
    validateEmail(
      normalizedEmail
    );

  if (!emailValidation.valid) {
    return {
      ok: false,
      userMessage:
        emailValidation.message
    };
  }

  /* Validate password */
  const passwordValidation =
    validatePassword(password);

  if (!passwordValidation.valid) {
    return {
      ok: false,
      userMessage:
        passwordValidation.message
    };
  }

  try {
    /*
     * Firebase Authentication
     */
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

    const user =
      credential.user;

    /*
     * Save display name* inside Firebase Authentication.
     */
    await updateProfile(
      user,
      {
        displayName:
          normalizedName
      }
    );

    /*
     * Create Firestore profile.
     */
    const profile =
      await createUserProfile(
        user,
        normalizedName
      );

    await logAuditEvent(
      "register_success",
      {
        uid: user.uid,

        emailPrefix:
          getEmailPrefix(
            user.email
          )
      }
    );

    return {
      ok: true,
      user,
      profile
    };

  } catch (error) {
    console.error(
      "Registration failed:",
      error
    );

    await logAuditEvent(
      "register_failure",
      {
        emailPrefix:
          getEmailPrefix(
            normalizedEmail
          ),

        errorCode:
          error?.code ||
          "unknown"
      }
    );

    return mapAuthError(error);
  }
}

/* =========================================================
   LOGIN
========================================================= */

export async function login(
  email,
  password
) {
  const normalizedEmail =
    normalizeEmail(email);

  const emailValidation =
    validateEmail(
      normalizedEmail
    );

  if (!emailValidation.valid) {
    return {
      ok: false,
      userMessage:
        emailValidation.message
    };
  }

  if (!password) {
    return {
      ok: false,
      userMessage:
        "كلمة المرور مطلوبة."
    };
  }

  try {
    const credential =
      await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

    const user =
      credential.user;

    /*
     * Force refresh للحصول على
     * أحدث Custom Claims.
     */
    const tokenResult =
      await getIdTokenResult(
        user,
        true
      );

    const claims =
      tokenResult.claims;

    /*
     * Load Firestore profile.
     */
    const profile =
      await getUserProfile(
        user.uid
      );

    await logAuditEvent(
      "login_success",
      {
        uid: user.uid,

        emailPrefix:
          getEmailPrefix(
            user.email
          )
      }
    );

    return {
      ok: true,
      user,
      profile,
      claims
    };

  } catch (error) {
    console.error(
      "Login failed:",
      error
    );

    await logAuditEvent(
      "login_failure",
      {
        emailPrefix:
          getEmailPrefix(
            normalizedEmail
          ),

        errorCode:
          error?.code ||
          "unknown"
      }
    );

    return mapAuthError(error);
  }
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logout() {
  try {
    const user =
      auth.currentUser;

    if (user) {
      await logAuditEvent(
        "logout",
        {
          uid: user.uid
        }
      );
    }

    await signOut(auth);

    return {
      ok: true
    };

  } catch (error) {
    console.error(
      "Logout failed:",
      error
    );

    return {
      ok: false,
      userMessage:
        "حدث خطأ أثناء تسجيل الخروج."
    };
  }
}

/* =========================================================
   PASSWORD RESET
========================================================= */

export async function resetPassword(
  email
) {
  const normalizedEmail =
    normalizeEmail(email);

  const validation =
    validateEmail(
      normalizedEmail
    );

  if (!validation.valid) {
    return {
      ok: false,
      userMessage:
        validation.message
    };
  }

  try {
    await sendPasswordResetEmail(
      auth,
      normalizedEmail
    );

    await logAuditEvent(
      "password_reset_requested",
      {
        emailPrefix:
          getEmailPrefix(
            normalizedEmail
          )
      }
    );

    /*
     * لا نكشف هل البريد
     * موجود أم لا.
     */
    return {
      ok: true,
      userMessage:
        "إذا كان البريد مسجلًا، ستصلك رسالة لإعادة تعيين كلمة المرور."
    };

  } catch (error) {
    console.error(
      "Password reset error:",
      error);

    if (
      error?.code ===
        "auth/user-not-found" ||
      error?.code ===
        "auth/invalid-email"
    ) {
      return {
        ok: true,
        userMessage:
          "إذا كان البريد مسجلًا، ستصلك رسالة لإعادة تعيين كلمة المرور."
      };
    }

    return mapAuthError(error);
  }
}

/* =========================================================
   ADMIN
========================================================= */

/*
 * صلاحية Admin الحقيقية تأتي من:
 *
 * Firebase Custom Claims
 *
 * {
 *   admin: true
 * }
 *
 * وليس من users/{uid}.role
 */

export async function isAdmin(
  forceRefresh = false
) {
  const user =
    auth.currentUser;

  if (!user) {
    return false;
  }

  try {
    const tokenResult =
      await getIdTokenResult(
        user,
        forceRefresh
      );

    return (
      tokenResult.claims.admin ===
      true
    );

  } catch (error) {
    console.error(
      "Admin check failed:",
      error
    );

    return false;
  }
}

/* =========================================================
   CURRENT USER
========================================================= */

export async function getCurrentUser() {
  const user =
    auth.currentUser;

  if (!user) {
    return null;
  }

  const profile =
    await getUserProfile(
      user.uid
    );

  const tokenResult =
    await getIdTokenResult(
      user
    );

  return {
    user,
    profile,
    claims:
      tokenResult.claims
  };
}

/* =========================================================
   AUTH STATE
========================================================= */

export function watchAuthState(
  callback
) {
  return onAuthStateChanged(
    auth,
    async (user) => {

      if (!user) {
        callback(null);
        return;
      }

      const profile =
        await getUserProfile(
          user.uid
        );

      const tokenResult =
        await getIdTokenResult(
          user
        );

      callback({
        user,
        profile,
        claims:
          tokenResult.claims
      });
    }
  );
}
