// site/js/modules/auth.js
// ================================================================
// نظام المصادقة للموقع الرئيسي (المستخدمين العاديين)
// يشمل: تسجيل الدخول، إنشاء حساب، Google، الرابط السحري
// ================================================================

import { auth, db } from '../firebase-init.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===== المتغيرات العامة =====
const provider = new GoogleAuthProvider();
let currentUser = null;

// ===== تهيئة المصادقة =====
export function initAuth() {
    // مراقبة حالة المصادقة
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateUI(user);

        if (user) {
            // تخزين/تحديث بيانات المستخدم في Firestore
            try {
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
            } catch (e) {
                console.warn('⚠️ فشل في حفظ بيانات المستخدم:', e);
            }
        }
    });

    // ربط أحداث النموذج
    setupAuthEvents();

    // التحقق من الرابط السحري عند تحميل الصفحة
    handleMagicLinkOnLoad();
}

// ===== تحديث الواجهة حسب حالة المستخدم =====
function updateUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const authButtons = document.getElementById('authButtons');

    if (!authButtons) return;

    if (user) {
        const name = user.displayName || user.email?.split('@')[0] || 'مستخدم';
        const photo = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF6600&color=fff&size=32`;

        authButtons.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <img src="${photo}" style="width:32px;height:32px;border-radius:50%;border:2px solid var(--primary);" />
                <span style="font-weight:600;font-size:0.85rem;color:var(--gray-700);">${name}</span>
                <button id="logoutBtn" class="btn btn-outline" style="padding:0.15rem 0.8rem;font-size:0.75rem;color:#EF4444;border-color:#EF4444;">خروج</button>
            </div>
        `;

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            signOut(auth);
            window.location.reload();
        });
    } else {
        authButtons.innerHTML = `
            <a href="#" class="btn btn-outline" id="loginBtn">دخول</a>
            <a href="#" class="btn btn-primary" id="registerBtn">حساب جديد</a>
        `;

        document.getElementById('loginBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('login');
        });

        document.getElementById('registerBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('register');
        });
    }
}

// ===== إعداد أحداث نموذج المصادقة =====
function setupAuthEvents() {
    // تبديل التبويب (تسجيل دخول / حساب جديد)
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

    // تقديم النموذج (تسجيل دخول / إنشاء حساب)
    document.getElementById('authForm')?.addEventListener('submit', async (e) => {
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
            window.location.reload();
        } catch (err) {
            document.getElementById('authError').textContent = err.message;
        }
    });

    // تسجيل الدخول بـ Google
    document.getElementById('googleAuthBtn')?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
            closeAuthModal();
            window.location.reload();
        } catch (err) {
            document.getElementById('authError').textContent = err.message;
        }
    });

    // الرابط السحري
    document.getElementById('sendMagicLinkBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value;
        if (!email) {
            document.getElementById('authError').textContent = 'أدخل بريدك الإلكتروني أولاً.';
            return;
        }

        const actionCodeSettings = {
            url: window.location.origin,
            handleCodeInApp: true,
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            document.getElementById('authError').style.color = '#22C55E';
            document.getElementById('authError').textContent = '✅ تم الإرسال! تفقد بريدك.';
        } catch (err) {
            document.getElementById('authError').textContent = '❌ ' + err.message;
        }
    });
}

// ===== فتح وإغلاق نافذة المصادقة =====
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // تنشيط التبويب المناسب
    document.querySelectorAll('.auth-tab').forEach(t => {
        if (t.dataset.tab === tab) t.click();
    });
}

window.closeAuthModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
};

// ===== معالجة الرابط السحري عند تحميل الصفحة =====
async function handleMagicLinkOnLoad() {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('أدخل بريدك الإلكتروني لتأكيد تسجيل الدخول:');
        }
        if (email) {
            try {
                await signInWithEmailLink(auth, email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                window.location.href = '/';
            } catch (err) {
                alert('❌ فشل تسجيل الدخول: ' + err.message);
            }
        }
    }
}

// ===== دوال مساعدة للاستخدام في صفحات أخرى =====
export function getCurrentUser() {
    return currentUser;
}

export function isUserLoggedIn() {
    return currentUser !== null;
}

export { auth };
