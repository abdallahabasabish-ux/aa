// استيراد مكتبة Firebase Admin
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// مسار ملف المفتاح الخاص
const serviceAccount = require('./service-account.json');

// تهيئة التطبيق
initializeApp({
  credential: cert(serviceAccount)
});

// ⚠️ استبدل هذا المعرف بـ UID الخاص بحسابك
// يمكنك إيجاد الـ UID من Firebase Console → Authentication → Users
const uid = '3zyLwUHgIHgUzeU50uxvxkPKvkU2';

// تعيين صلاحية Admin
getAuth()
  .setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('✅ تم تعيين صلاحية Admin بنجاح!');
  })
  .catch((error) => {
    console.error('❌ حدث خطأ:', error);
  });
