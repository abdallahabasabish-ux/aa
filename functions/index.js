// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * HTTP Callable Function لتسجيل مدير جديد.
 * هذه الوظيفة تتطلب أن يكون المستخدم المنفذ مديراً بالفعل.
 */
exports.createAdminUser = functions.https.onCall(async (data, context) => {
    // 1. التحقق من أن المستخدم الحالي مدير
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can create new admins.');
    }

    const { email, password } = data;
    if (!email || !password || password.length < 8) {
        throw new functions.https.HttpsError('invalid-argument', 'Email and strong password required.');
    }

    try {
        // 2. إنشاء المستخدم في Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: true, // أو تركها false لحين التأكيد
        });

        // 3. تعيين صلاحية المدير (Custom Claim)
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });

        // 4. تسجيل العملية في Audit Logs
        await admin.firestore().collection('logs').add({
            action: 'create_admin',
            createdBy: context.auth.uid,
            targetEmail: email,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, uid: userRecord.uid };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});
