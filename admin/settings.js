import { requireAdmin } from "/js/auth-guard.js";
import { auth, db } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import { isSafeUrl } from "/js/security.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ===============================
// DOM
// ===============================
const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("adminOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const settingsContent = document.getElementById("settingsContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const form = document.getElementById("settingsForm");
const saveBtn = document.getElementById("saveSettingsBtn");
const resetBtn = document.getElementById("resetSettingsBtn");
const messageEl = document.getElementById("settingsMessage");

// ===============================
// Sidebar
// ===============================
function openSidebar() {
  sidebar.classList.add("admin-sidebar--open");
  overlay.classList.add("admin-overlay--visible");
  document.body.style.overflow = "hidden";
}
function closeSidebar() {
  sidebar.classList.remove("admin-sidebar--open");
  overlay.classList.remove("admin-overlay--visible");
  document.body.style.overflow = "";
}
hamburger.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);
window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
  if (e.matches) closeSidebar();
});

logoutBtn.addEventListener("click", async () => {
  const r = await logout();
  if (r.ok) window.location.replace("/login.html");
});

// ===============================
// Helpers
// ===============================
const DEFAULT_SETTINGS = {
  siteName: "عبدالله عباس",
  siteTagline: "حلول رقمية متكاملة",
  siteDescription: "بناء حلول رقمية متكاملة تتميز بالجودة والاحترافية والالتزام بالنتائج.",
  siteLogo: "/assets/logo.png",
  socialFacebook: "",
  socialTwitter: "",
  socialLinkedin: "",
  socialInstagram: "",
  socialYoutube: "",
  contactEmail: "contact@abdallahsst.com",
  contactPhone: "",
  contactAddress: "مصر",
};

function showMessage(text, type = "success") {
  messageEl.textContent = text;
  messageEl.className = type;
  messageEl.style.display = "block";
  setTimeout(() => {
    messageEl.style.display = "none";
  }, 5000);
}

function setLoading(loading) {
  const btnText = saveBtn.querySelector(".btn-text");
  const btnLoader = saveBtn.querySelector(".btn-loader");
  if (loading) {
    btnText.style.display = "none";
    btnLoader.style.display = "block";
    saveBtn.disabled = true;
  } else {
    btnText.style.display = "";
    btnLoader.style.display = "none";
    saveBtn.disabled = false;
  }
}

function fillForm(data) {
  const fields = {
    siteName: data.siteName || "",
    siteTagline: data.siteTagline || "",
    siteDescription: data.siteDescription || "",
    siteLogo: data.siteLogo || "",
    socialFacebook: data.socialFacebook || "",
    socialTwitter: data.socialTwitter || "",
    socialLinkedin: data.socialLinkedin || "",
    socialInstagram: data.socialInstagram || "",
    socialYoutube: data.socialYoutube || "",
    contactEmail: data.contactEmail || "",
    contactPhone: data.contactPhone || "",
    contactAddress: data.contactAddress || "",
  };
  for (const [key, value] of Object.entries(fields)) {
    const el = document.getElementById(key);
    if (el) el.value = value;
  }
}

function getFormData() {
  return {
    siteName: document.getElementById("siteName").value.trim(),
    siteTagline: document.getElementById("siteTagline").value.trim(),
    siteDescription: document.getElementById("siteDescription").value.trim(),
    siteLogo: document.getElementById("siteLogo").value.trim(),
    socialFacebook: document.getElementById("socialFacebook").value.trim(),
    socialTwitter: document.getElementById("socialTwitter").value.trim(),
    socialLinkedin: document.getElementById("socialLinkedin").value.trim(),
    socialInstagram: document.getElementById("socialInstagram").value.trim(),
    socialYoutube: document.getElementById("socialYoutube").value.trim(),
    contactEmail: document.getElementById("contactEmail").value.trim(),
    contactPhone: document.getElementById("contactPhone").value.trim(),
    contactAddress: document.getElementById("contactAddress").value.trim(),
  };
}

// ===============================
// Save & Load
// ===============================
async function loadSettings() {
  try {
    const docRef = doc(db, "settings", "site");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      fillForm(snap.data());
    } else {
      fillForm(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error("خطأ في تحميل الإعدادات:", error);
    fillForm(DEFAULT_SETTINGS);
    showMessage("حدث خطأ أثناء تحميل الإعدادات، تم استخدام القيم الافتراضية.", "error");
  }
}

async function saveSettings(data) {
  try {
    await setDoc(doc(db, "settings", "site"), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    showMessage("✅ تم حفظ الإعدادات بنجاح!", "success");
  } catch (error) {
    console.error("خطأ في حفظ الإعدادات:", error);
    showMessage("❌ فشل حفظ الإعدادات: " + (error.message || "خطأ غير معروف"), "error");
    throw error;
  }
}

// ===============================
// Events
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = getFormData();
  setLoading(true);
  try {
    await saveSettings(data);
  } finally {
    setLoading(false);
  }
});

resetBtn.addEventListener("click", () => {
  if (confirm("هل تريد استعادة الإعدادات الافتراضية؟")) {
    fillForm(DEFAULT_SETTINGS);
    showMessage("تم استعادة القيم الافتراضية، اضغط 'حفظ' لتطبيقها.", "success");
  }
});

// ===============================
// User Info
// ===============================
function setUserInfo(user) {
  const name = user.displayName || user.email || "مدير";
  headerUserName.textContent = name;
  headerAvatar.textContent = name.trim().charAt(0);
}

// ===============================
// Init
// ===============================
async function init(user) {
  setUserInfo(user);
  await loadSettings();
  pageLoader.style.display = "none";
  settingsContent.style.display = "block";
}

requireAdmin({ loginUrl: "/login.html" })
  .then((user) => {
    document.body.style.visibility = "visible";
    return init(user);
  })
  .catch(() => {
    document.body.style.visibility = "visible";
  });
