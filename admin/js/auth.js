import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../site/js/firebase-init.js"; // أو استخدم window.__admin.db

const auth = getAuth();

// التحقق من صلاحية المشرف
export async function checkAdminAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const adminRef = doc(db, "admins", user.uid);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            document.getElementById('adminName').textContent = `مرحباً، ${adminSnap.data().displayName || 'Admin'}`;
            resolve(user);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      // غير مصرح: توجيه إلى صفحة تسجيل الدخول
      window.location.href = '/login.html'; // أو عرض نموذج تسجيل دخول
      resolve(null);
    });
  });
}

// تسجيل الخروج
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  signOut(auth);
  window.location.reload();
});

// تنفيذ التحقق
checkAdminAuth();
