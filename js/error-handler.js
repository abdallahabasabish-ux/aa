// js/error-handler.js
export function getSafeAuthErrorMessage(error) {
    // قائمة الأخطاء التي تكشف عن وجود المستخدم
    const sensitiveErrors = [
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/email-already-in-use',
        'auth/invalid-email'
    ];

    // سجل الخطأ الحقيقي في وحدة التحكم للمطور (وليس للمستخدم)
    console.warn('🔐 Auth Error Code:', error.code);

    if (sensitiveErrors.includes(error.code)) {
        // رسالة عامة لا تكشف شيئاً
        return 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.';
    }

    // أخطاء عامة أخرى (ضعف كلمة المرور، المحاولات الكثيرة)
    switch (error.code) {
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة جداً. يجب أن تحتوي على 6 أحرف على الأقل.';
        case 'auth/too-many-requests':
            return 'تم تعطيل الحساب مؤقتاً بسبب كثرة المحاولات الفاشلة. حاول لاحقاً.';
        default:
            return 'حدث خطأ غير متوقع. الرجاء تحديث الصفحة والمحاولة مرة أخرى.';
    }
}
