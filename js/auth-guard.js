// js/auth-guard.js
import { auth, onAuthStateChanged } from './firebase-init.js';

/**
 * دالة مركزية للتحقق من صلاحية المدير.
 * تُستخدم في login.html و admin.html
 */
export function requireAdmin(redirectTo = '/login.html') {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // إلغاء الاستماع بعد أول استجابة
            
            if (!user) {
                window.location.href = redirectTo;
                reject(new Error('No user'));
                return;
            }

            try {
                const tokenResult = await user.getIdTokenResult(true); // force refresh
                if (tokenResult.claims.admin === true) {
                    resolve(user);
                } else {
                    // مستخدم عادي يحاول الدخول إلى صفحة مدير
                    console.warn('⛔ Access Denied: Not an admin.');
                    await auth.signOut();
                    window.location.href = redirectTo;
                    reject(new Error('Not admin'));
                }
            } catch (error) {
                console.error('Auth Guard Error:', error);
                window.location.href = redirectTo;
                reject(error);
            }
        });
    });
}
