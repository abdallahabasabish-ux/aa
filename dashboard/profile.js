import { requireAuth } from "/js/auth-guard.js";
import { auth, db } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.w3.org/2023/06/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const sidebar = document.getElementById("dashSidebar");
const overlay = document.getElementById("dashOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const profileContent = document.getElementById("profileContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerName = document.getElementById("headerName");

function openSidebar() { sidebar.classList.add("dash-sidebar--open"); overlay.classList.add("dash-overlay--visible"); document.body.style.overflow = "hidden"; }
function closeSidebar() { sidebar.classList.remove("dash-sidebar--open"); overlay.classList.remove("dash-overlay--visible"); document.body.style.overflow = ""; }
hamburger.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);
window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => { if (e.matches) closeSidebar(); });
logoutBtn.addEventListener("click", async () => { const r = await logout(); if (r.ok) window.location.replace("/login.html"); });

function buildProfile(user) {
  const card = document.createElement("div");
  card.className = "dash-profile-card dash-fade-in";

  const avatar = document.createElement("div");
  avatar.className = "dash-profile-avatar-large";
  avatar.textContent = (user.displayName || user.email || "م").trim().charAt(0);

  const name = document.createElement("div");
  name.className = "dash-profile-name";
  name.textContent = user.displayName || "—";

  const email = document.createElement("div");
  email.className = "dash-profile-email";
  email.textContent = user.email;

  // حقل الاسم
  const nameGroup = document.createElement("div");
  nameGroup.className = "dash-form-group";
  const nameLabel = document.createElement("label");
  nameLabel.className = "dash-form-label";
  nameLabel.setAttribute("for", "displayName");
  nameLabel.textContent = "الاسم";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "dash-form-input";
  nameInput.id = "displayName";
  nameInput.value = user.displayName || "";
  nameInput.maxLength = 60;
  nameGroup.append(nameLabel, nameInput);

  // حقل الهاتف
  const phoneGroup = document.createElement("div");
  phoneGroup.className = "dash-form-group";
  const phoneLabel = document.createElement("label");
  phoneLabel.className = "dash-form-label";
  phoneLabel.setAttribute("for", "phone");
  phoneLabel.textContent = "رقم الهاتف";
  const phoneInput = document.createElement("input");
  phoneInput.type = "tel";
  phoneInput.className = "dash-form-input";
  phoneInput.id = "phone";
  phoneInput.placeholder = "+20xxxxxxxxx";
  phoneInput.dir = "ltr";
  phoneGroup.append(phoneLabel, phoneInput);

  // زر الحفظ
  const saveBtn = document.createElement("button");
  saveBtn.className = "dash-btn-primary";
  saveBtn.type = "button";
  saveBtn.innerHTML = `<span class="dash-btn-text">حفظ التعديلات</span><span class="dash-btn-spinner"></span>`;

  const successMsg = document.createElement("div");
  successMsg.className = "dash-form-success";
  successMsg.id = "successMsg";

  card.append(avatar, name, email, nameGroup, phoneGroup, saveBtn, successMsg);

  // تحميل بيانات إضافية من Firestore
  doc(db, "users", user.uid).get().then((snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.phone) phoneInput.value = data.phone;
    }
  }).catch(() => {});

  // حفظ
  saveBtn.addEventListener("click", async () => {
    const newName = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    saveBtn.disabled = true;
    saveBtn.classList.add("dash-btn-primary--loading");
    successMsg.textContent = "";
    successMsg.className = "dash-form-success";

    try {
      // تحديث الاسم في Auth
      if (newName !== user.displayName) {
        await updateProfile(user, { displayName: newName });
      }

      // حفظ في Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: newName,
        email: user.email,
        phone: phone,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // تحديث UI
      headerName.textContent = newName || user.email;
      headerAvatar.textContent = (newName || user.email || "م").trim().charAt(0);
      avatar.textContent = (newName || user.email || "م").trim().charAt(0);
      name.textContent = newName || "—";

      successMsg.textContent = "تم حفظ التعديلات بنجاح.";
      successMsg.classList.add("dash-form-success--visible");
      setTimeout(() => { successMsg.className = "dash-form-success"; }, 4000);
    } catch {
      successMsg.textContent = "حدث خطأ أثناء الحفظ.";
      successMsg.style.color = "var(--dash-error)";
      successMsg.classList.add("dash-form-success--visible");
      setTimeout(() => { successMsg.className = "dash-form-success"; successMsg.style.color = ""; }, 4000);
    }

    saveBtn.disabled = false;
    saveBtn.classList.remove("dash-btn-primary--loading");
  });

  profileContent.appendChild(card);
}

async function init(user) {
  const name = user.displayName || user.email || "مستخدم";
  headerName.textContent = name;
  headerAvatar.textContent = name.trim().charAt(0);
  buildProfile(user);
  pageLoader.style.display = "none";
  profileContent.style.display = "block";
}

requireAuth("/login.html").then((user) => { document.body.style.visibility = "visible"; return init(user); }).catch(() => { document.body.style.visibility = "visible"; });
