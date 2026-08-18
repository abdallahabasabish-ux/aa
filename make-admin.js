const fs = require("fs");
const path = require("path");
const { initializeApp, applicationDefault, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const uid = process.env.FIREBASE_ADMIN_UID || "JYMcojxYIgMaNyuppvHygwhiIdt2";
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || path.join(__dirname, "serviceAccountKey.json");

async function main() {
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ لم يتم العثور على ملف serviceAccountKey.json.");
    console.error(`الملف المتوقع: ${serviceAccountPath}`);
    console.error("1) اذهب إلى Firebase Console > Project Settings > Service accounts");
    console.error("2) اضغط Generate new private key");
    console.error("3) احفظ الملف كـ serviceAccountKey.json داخل مجلد المشروع.");
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  initializeApp({
    credential: cert(serviceAccount),
  });

  try {
    await getAuth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ تم تعيين صلاحية Admin للمستخدم: ${uid}`);
    console.log("🔄 لا تنسَ تسجيل الخروج ثم تسجيل الدخول مجددًا حتى يتحدث التوكن الجديد.");
  } catch (error) {
    console.error("❌ فشل تعيين صلاحية Admin:", error.message || error);
    process.exit(1);
  }
}

main();
