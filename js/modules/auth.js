import { auth, db } from '../firebase-init.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const provider = new GoogleAuthProvider();

// حالة المستخدم
let currentUser = null;

export function initAuth() {
    // مراقبة حالة المصادقة
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateUI(user);
        if (user) {
            // تخزين/تحديث بيانات المستخدم في Firestore
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    createdAt: new Date()
                });
            }
        }
    });

    // أحداث النموذج
    const modal = document.getElementById('authModal');
    const form = document.getElementById('authForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const closeBtn = modal?.querySelector('.auth-box button');

    loginBtn?.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('login'); });
    registerBtn?.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('register'); });
    closeBtn?.addEventListener('click', closeAuthModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeAuthModal(); });

    // تبديل التبويب
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            document.querySelectorAll('.auth-tab').forEach(t => {
                t.style.color = 'var(--gray-500)';
                t.style.borderBottom = '2px solid transparent';
            });
            this.style.color = 'var(--primary)';
            this.style.borderBottom = '3px solid var(--primary)';
            document.getElementById('authTitle').textContent = tabName === 'login' ? 'تسجيل الدخول' : 'حساب جديد';
            document.getElementById('authSubmitBtn').textContent = tabName === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب';
            document.getElementById('nameField').style.display = tabName === 'login' ? 'none' : 'block';
            document.getElementById('authError').textContent = '';
        });
    });

    // تقديم النموذج
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const name = document.getElementById('authName').value;
        const isLogin = document.getElementById('nameField').style.display === 'none';

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if (name) {
                    await setDoc(doc(db, "users", cred.user.uid), {
                        uid: cred.user.uid,
                        email: email,
                        displayName: name,
                        createdAt: new Date()
                    });
                }
            }
            closeAuthModal();
            window.location.reload(); // تحديث الواجهة
        } catch (err) {
            document.getElementById('authError').textContent = err.message;
        }
    });

    // Google Auth
    document.getElementById('googleAuthBtn')?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
            closeAuthModal();
            window.location.reload();
        } catch (err) {
            document.getElementById('authError').textContent = err.message;
        }
    });
}

function openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    // تنشيط التبويب المناسب
    document.querySelectorAll('.auth-tab').forEach(t => {
        if (t.dataset.tab === tab) t.click();
    });
}

window.closeAuthModal = function() {
    document.getElementById('authModal').style.display = 'none';
};

function updateUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const authButtons = document.getElementById('authButtons');

    if (user) {
        // عرض اسم المستخدم وصورة
        const name = user.displayName || user.email?.split('@')[0] || 'مستخدم';
        const photo = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF6600&color=fff&size=32`;
        authButtons.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <img src="${photo}" style="width:32px;height:32px;border-radius:50%;border:2px solid var(--primary);" />
                <span style="font-weight:600;font-size:0.9rem;">${name}</span>
                <button id="logoutBtn" class="btn btn-outline" style="padding:0.2rem 0.8rem;font-size:0.8rem;color:var(--danger);border-color:var(--danger);">خروج</button>
            </div>
        `;
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            signOut(auth);
            window.location.reload();
        });
    } else {
        authButtons.innerHTML = `
            <a href="#" class="btn btn-outline" id="loginBtn" data-i18n="nav.login">دخول</a>
            <a href="#" class="btn btn-primary" id="registerBtn" data-i18n="nav.register">حساب جديد</a>
        `;
        // إعادة ربط الأحداث بعد إعادة إنشاء الأزرار
        document.getElementById('loginBtn')?.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('login'); });
        document.getElementById('registerBtn')?.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('register'); });
    }
}

// تهيئة المصادقة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initAuth);
