const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

async function makeAdmin() {
  await getAuth().setCustomUserClaims("TDtEyjvwHgZmjxDQYOLPmcIRFHw1", {
    admin: true
  });

  console.log("تم إعطاء صلاحية Admin");
}

makeAdmin();
