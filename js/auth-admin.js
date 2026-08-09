import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const auth = getAuth();
const db = window.__admin.db;

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
            window.location.href = '/login.html';
            resolve(null);
        });
    });
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    signOut(auth);
    window.location.reload();
});

checkAdminAuth();
