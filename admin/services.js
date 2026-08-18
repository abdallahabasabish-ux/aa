import { requireAdmin } from "/js/auth-guard.js";
import { auth, db } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// -----------------------------------------------
// DOM
// -----------------------------------------------
const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("adminOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const servicesContent = document.getElementById("servicesContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const searchInput = document.getElementById("searchInput");
const addServiceBtn = document.getElementById("addServiceBtn");
const tableWrapper = document.getElementById("servicesTableWrapper");

// Modal
const modalOverlay = document.getElementById("modalOverlay");
const serviceModal = document.getElementById("serviceModal");
const modalTitleText = document.getElementById("modalTitleText");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const serviceForm = document.getElementById("serviceForm");

// Confirm
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmDialog = document.getElementById("confirmDialog");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// -----------------------------------------------
// State
// -----------------------------------------------
let allServices = [];
let deleteTargetId = null;

// -----------------------------------------------
// Sidebar
// -----------------------------------------------
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
window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => { if (e.matches) closeSidebar(); });

logoutBtn.addEventListener("click", async () => {
  const r = await logout();
  if (r.ok) window.location.replace("/login.html");
});

// -----------------------------------------------
// Slug Generator
// -----------------------------------------------
function generateSlug(text) {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0621-\u064Aa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

// توليد slug تلقائي من العنوان العربي
document.getElementById("svcTitle").addEventListener("input", (e) => {
  const slugInput = document.getElementById("svcSlug");
  // لا نُعدّل slug إذا كان المستخدم قد عدّله يدويًا
  if (!slugInput.dataset.manual) {
    slugInput.value = generateSlug(e.target.value);
  }
});

document.getElementById("svcSlug").addEventListener("input", (e) => {
  // وضع يدوي
  if (e.target.value !== generateSlug(document.getElementById("svcTitle").value)) {
    e.target.dataset.manual = "1";
  } else {
    delete e.target.dataset.manual;
  }
});

// -----------------------------------------------
// Modal
// -----------------------------------------------
function openModal(isEdit = false) {
  modalTitleText.textContent = isEdit ? "تعديل الخدمة" : "إضافة خدمة";
  document.getElementById("modalSaveBtn").querySelector(".btn-text").textContent = isEdit ? "تحديث الخدمة" : "حفظ الخدمة";
  modalOverlay.style.display = "block";
  requestAnimationFrame(() => {
    modalOverlay.classList.add("admin-modal-overlay--visible");
    serviceModal.classList.add("admin-modal--open");
  });
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.classList.remove("admin-modal-overlay--visible");
  serviceModal.classList.remove("admin-modal--open");
  setTimeout(() => {
    modalOverlay.style.display = "none";
    document.body.style.overflow = "";
  }, 220);
  resetForm();
}

modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

// إغلاق بـ Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (confirmDialog.style.display !== "none") closeConfirm();
    else if (serviceModal.classList.contains("admin-modal--open")) closeModal();
  }
});

// -----------------------------------------------
// Confirm Dialog
// -----------------------------------------------
function openConfirm(id, name) {
  deleteTargetId = id;
  const desc = document.getElementById("confirmDesc");
  desc.textContent = `هل أنت متأكد من حذف الخدمة "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`;
  confirmOverlay.style.display = "block";
  confirmDialog.style.display = "block";
  requestAnimationFrame(() => confirmOverlay.classList.add("admin-modal-overlay--visible"));
}

function closeConfirm() {
  confirmOverlay.classList.remove("admin-modal-overlay--visible");
  setTimeout(() => {
    confirmOverlay.style.display = "none";
    confirmDialog.style.display = "none";
    deleteTargetId = null;
  }, 220);
}

confirmCancelBtn.addEventListener("click", closeConfirm);
confirmOverlay.addEventListener("click", closeConfirm);

confirmDeleteBtn.addEventListener("click", async () => {
  if (!deleteTargetId) return;
  confirmDeleteBtn.disabled = true;
  try {
    await deleteDoc(doc(db, "services", deleteTargetId));
    allServices = allServices.filter((s) => s.id !== deleteTargetId);
    renderServices(allServices);
    closeConfirm();
  } catch {
    alert("حدث خطأ أثناء حذف الخدمة.");
  }
  confirmDeleteBtn.disabled = false;
});

// -----------------------------------------------
// Form Helpers
// -----------------------------------------------
function resetForm() {
  serviceForm.reset();
  document.getElementById("serviceId").value = "";
  document.getElementById("svcSlug").removeAttribute("data-manual");
  document.getElementById("svcActive").checked = true;
  document.getElementById("svcSortOrder").value = "0";
  // مسح الأخطاء
  serviceForm.querySelectorAll(".admin-form-error").forEach((el) => { el.textContent = ""; });
  serviceForm.querySelectorAll(".admin-form-input--error, .admin-form-textarea--error").forEach((el) => {
    el.classList.remove("admin-form-input--error", "admin-form-textarea--error");
  });
}

function getFormData() {
  const featuresAr = document.getElementById("svcFeatures").value
    .split("\n").map((l) => l.trim()).filter(Boolean);
  const featuresEn = document.getElementById("svcFeaturesEn").value
    .split("\n").map((l) => l.trim()).filter(Boolean);

  return {
    title: document.getElementById("svcTitle").value.trim(),
    titleEn: document.getElementById("svcTitleEn").value.trim(),
    slug: document.getElementById("svcSlug").value.trim(),
    shortDescription: document.getElementById("svcShortDesc").value.trim(),
    shortDescriptionEn: document.getElementById("svcShortDescEn").value.trim(),
    description: document.getElementById("svcDescription").value.trim(),
    descriptionEn: document.getElementById("svcDescriptionEn").value.trim(),
    features: featuresAr,
    featuresEn: featuresEn,
    price: parseFloat(document.getElementById("svcPrice").value) || 0,
    currency: document.getElementById("svcCurrency").value,
    category: document.getElementById("svcCategory").value,
    deliveryTime: document.getElementById("svcDelivery").value.trim(),
    sortOrder: parseInt(document.getElementById("svcSortOrder").value, 10) || 0,
    featured: document.getElementById("svcFeatured").checked,
    active: document.getElementById("svcActive").checked,
    seoTitle: document.getElementById("svcSeoTitle").value.trim(),
    seoTitleEn: document.getElementById("svcSeoTitleEn").value.trim(),
    metaDescription: document.getElementById("svcMetaDesc").value.trim(),
    metaDescriptionEn: document.getElementById("svcMetaDescEn").value.trim(),
  };
}

function setFormErrors(errors) {
  // مسح الكل أولًا
  serviceForm.querySelectorAll(".admin-form-error").forEach((el) => { el.textContent = ""; });
  serviceForm.querySelectorAll(".admin-form-input--error, .admin-form-textarea--error").forEach((el) => {
    el.classList.remove("admin-form-input--error", "admin-form-textarea--error");
  });

  for (const [field, msg] of Object.entries(errors)) {
    const errEl = document.getElementById(field + "Err");
    const inputEl = document.getElementById(field);
    if (errEl) errEl.textContent = msg;
    if (inputEl) inputEl.classList.add("admin-form-input--error");
    // للـ textarea
    const taEl = document.getElementById(field);
    if (taEl && taEl.tagName === "TEXTAREA") {
      taEl.classList.remove("admin-form-input--error");
      taEl.classList.add("admin-form-textarea--error");
    }
  }
}

function validateForm() {
  const errors = {};
  const d = getFormData();

  if (!d.title) errors.svcTitle = "عنوان الخدمة مطلوب.";
  if (!d.slug) errors.svcSlug = "الرابط الثابت مطلوب.";

  return { valid: Object.keys(errors).length === 0, errors };
}

function fillForm(service) {
  document.getElementById("serviceId").value = service.id;
  document.getElementById("svcTitle").value = service.title || "";
  document.getElementById("svcTitleEn").value = service.titleEn || "";
  document.getElementById("svcSlug").value = service.slug || "";
  document.getElementById("svcSlug").dataset.manual = "1";
  document.getElementById("svcShortDesc").value = service.shortDescription || "";
  document.getElementById("svcShortDescEn").value = service.shortDescriptionEn || "";
  document.getElementById("svcDescription").value = service.description || "";
  document.getElementById("svcDescriptionEn").value = service.descriptionEn || "";
  document.getElementById("svcFeatures").value = (service.features || []).join("\n");
  document.getElementById("svcFeaturesEn").value = (service.featuresEn || []).join("\n");
  document.getElementById("svcPrice").value = service.price ?? "";
  document.getElementById("svcCurrency").value = service.currency || "EGP";
  document.getElementById("svcCategory").value = service.category || "";
  document.getElementById("svcDelivery").value = service.deliveryTime || "";
  document.getElementById("svcSortOrder").value = service.sortOrder ?? 0;
  document.getElementById("svcFeatured").checked = !!service.featured;
  document.getElementById("svcActive").checked = service.active !== false;
  document.getElementById("svcSeoTitle").value = service.seoTitle || "";
  document.getElementById("svcSeoTitleEn").value = service.seoTitleEn || "";
  document.getElementById("svcMetaDesc").value = service.metaDescription || "";
  document.getElementById("svcMetaDescEn").value = service.metaDescriptionEn || "";
}

// -----------------------------------------------
// Save (Create / Update)
// -----------------------------------------------
modalSaveBtn.addEventListener("click", async () => {
  const { valid, errors } = validateForm();
  if (!valid) {
    setFormErrors(errors);
    const firstErr = serviceForm.querySelector(".admin-form-input--error, .admin-form-textarea--error");
    if (firstErr) firstErr.focus();
    return;
  }

  const data = getFormData();
  const id = document.getElementById("serviceId").value;
  const isEdit = !!id;

  // Loading
  const btnText = modalSaveBtn.querySelector(".btn-text");
  const btnLoader = modalSaveBtn.querySelector(".btn-loader");
  btnText.style.display = "none";
  btnLoader.style.display = "block";
  modalSaveBtn.disabled = true;

  try {
    if (isEdit) {
      await updateDoc(doc(db, "services", id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      // تحديث في الذاكرة
      const idx = allServices.findIndex((s) => s.id === id);
      if (idx !== -1) {
        allServices[idx] = { ...allServices[idx], ...data, updatedAt: new Date() };
      }
    } else {
      const docRef = await addDoc(collection(db, "services"), {
        ...data,
        image: "",
        gallery: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      allServices.push({
        id: docRef.id,
        ...data,
        image: "",
        gallery: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    renderServices(allServices);
    closeModal();
  } catch (err) {
    alert("حدث خطأ أثناء الحفظ. تأكد من اتصال الإنترنت وصلاحياتك.");
  }

  btnText.style.display = "";
  btnLoader.style.display = "none";
  modalSaveBtn.disabled = false;
});

// -----------------------------------------------
// Add Service Button
// -----------------------------------------------
addServiceBtn.addEventListener("click", () => {
  resetForm();
  openModal(false);
  setTimeout(() => document.getElementById("svcTitle").focus(), 300);
});

// -----------------------------------------------
// Toggle Active / Featured
// -----------------------------------------------
async function toggleField(id, field, value) {
  try {
    await updateDoc(doc(db, "services", id), { [field]: value, updatedAt: serverTimestamp() });
    const svc = allServices.find((s) => s.id === id);
    if (svc) svc[field] = value;
  } catch {
    alert("حدث خطأ أثناء التحديث.");
    renderServices(allServices);
  }
}

// -----------------------------------------------
// Search
// -----------------------------------------------
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    renderServices(allServices);
    return;
  }
  const filtered = allServices.filter(
    (s) =>
      (s.title || "").toLowerCase().includes(q) ||
      (s.titleEn || "").toLowerCase().includes(q) ||
      (s.slug || "").toLowerCase().includes(q) ||
      (s.category || "").toLowerCase().includes(q)
  );
  renderServices(filtered);
});

// -----------------------------------------------
// Render Services Table
// -----------------------------------------------
const CURRENCY_MAP = { EGP: "ج.م", USD: "$", SAR: "ر.س", AED: "د.إ" };
const CATEGORY_MAP = {
  "web-development": "تطوير مواقع",
  "web-design": "تصميم مواقع",
  "seo": "تحسين محركات البحث",
  "graphic-design": "تصميم جرافيك",
  "wordpress": "ووردبريس",
  "blogger": "بلوجر",
  "other": "أخرى",
};

function renderServices(services) {
  tableWrapper.textContent = "";

  if (services.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-state-icon";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z"/></svg>`;

    const title = document.createElement("div");
    title.className = "empty-state-title";
    title.textContent = searchInput.value.trim() ? "لا توجد نتائج" : "لا توجد خدمات بعد";

    const desc = document.createElement("div");
    desc.className = "empty-state-desc";
    desc.textContent = searchInput.value.trim()
      ? "جرّب كلمات بحث مختلفة"
      : "ابدأ بإضافة أول خدمة لك";

    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(desc);
    tableWrapper.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-table";

  // Header
  const thead = document.createElement("thead");
  const hRow = document.createElement("tr");
  ["الخدمة", "التصنيف", "السعر", "نشطة", "مميزة", "إجراءات"].forEach((t) => {
    const th = document.createElement("th");
    th.textContent = t;
    hRow.appendChild(th);
  });
  thead.appendChild(hRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  services.forEach((svc) => {
    const tr = document.createElement("tr");

    // الخدمة
    const tdName = document.createElement("td");
    const nameDiv = document.createElement("div");
    nameDiv.className = "service-title-cell";

    const nameSpan = document.createElement("span");
    nameSpan.className = "service-title-text";
    nameSpan.textContent = svc.title || "—";
    nameDiv.appendChild(nameSpan);

    if (svc.featured) {
      const star = document.createElement("span");
      star.className = "featured-star";
      star.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd"/></svg>`;
      nameDiv.appendChild(star);
    }

    tdName.appendChild(nameDiv);
    tr.appendChild(tdName);

    // التصنيف
    const tdCat = document.createElement("td");
    const catBadge = document.createElement("span");
    catBadge.className = "category-badge";
    catBadge.textContent = CATEGORY_MAP[svc.category] || svc.category || "—";
    tdCat.appendChild(catBadge);
    tr.appendChild(tdCat);

    // السعر
    const tdPrice = document.createElement("td");
    if (svc.price > 0) {
      const priceSpan = document.createElement("span");
      priceSpan.className = "price-text";
      priceSpan.textContent = svc.price.toLocaleString("ar-EG");
      const currSpan = document.createElement("span");
      currSpan.className = "price-currency";
      currSpan.textContent = CURRENCY_MAP[svc.currency] || svc.currency || "";
      tdPrice.appendChild(priceSpan);
      tdPrice.appendChild(currSpan);
    } else {
      tdPrice.textContent = "يُحدد لاحقًا";
    }
    tr.appendChild(tdPrice);

    // نشطة
    const tdActive = document.createElement("td");
    const toggleActive = document.createElement("label");
    toggleActive.className = "toggle-switch";
    const checkActive = document.createElement("input");
    checkActive.type = "checkbox";
    checkActive.checked = svc.active !== false;
    checkActive.setAttribute("aria-label", "تفعيل/تعطيل");
    const trackActive = document.createElement("span");
    trackActive.className = "toggle-track";
    toggleActive.appendChild(checkActive);
    toggleActive.appendChild(trackActive);
    checkActive.addEventListener("change", () => toggleField(svc.id, "active", checkActive.checked));
    tdActive.appendChild(toggleActive);
    tr.appendChild(tdActive);

    // مميزة
    const tdFeatured = document.createElement("td");
    const toggleFeat = document.createElement("label");
    toggleFeat.className = "toggle-switch";
    const checkFeat = document.createElement("input");
    checkFeat.type = "checkbox";
    checkFeat.checked = !!svc.featured;
    checkFeat.setAttribute("aria-label", "تمييز/إلغاء تمييز");
    const trackFeat = document.createElement("span");
    trackFeat.className = "toggle-track";
    toggleFeat.appendChild(checkFeat);
    toggleFeat.appendChild(trackFeat);
    checkFeat.addEventListener("change", () => toggleField(svc.id, "featured", checkFeat.checked));
    tdFeatured.appendChild(toggleFeat);
    tr.appendChild(tdFeatured);

    // إجراءات
    const tdActions = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "table-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-ghost";
    editBtn.type = "button";
    editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/></svg>`;
    editBtn.setAttribute("aria-label", "تعديل");
    editBtn.addEventListener("click", () => {
      resetForm();
      fillForm(svc);
      openModal(true);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-danger";
    delBtn.type = "button";
    delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>`;
    delBtn.setAttribute("aria-label", "حذف");
    delBtn.addEventListener("click", () => openConfirm(svc.id, svc.title));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);
    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
}

// -----------------------------------------------
// Fetch Services
// -----------------------------------------------
async function fetchServices() {
  try {
    const q = query(collection(db, "services"), orderBy("sortOrder", "asc"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

// -----------------------------------------------
// User Info
// -----------------------------------------------
function setUserInfo(user) {
  const name = user.displayName || user.email || "مدير";
  headerUserName.textContent = name;
  headerAvatar.textContent = name.trim().charAt(0);
}

// -----------------------------------------------
// Init
// -----------------------------------------------
async function init(user) {
  setUserInfo(user);

  allServices = await fetchServices();
  renderServices(allServices);

  pageLoader.style.display = "none";
  servicesContent.style.display = "block";

  // فتح نموذج إضافة تلقائيًا إذا وُجد ?action=new
  if (new URLSearchParams(location.search).get("action") === "new") {
    resetForm();
    openModal(false);
    setTimeout(() => document.getElementById("svcTitle").focus(), 300);
  }
}

requireAdmin({ loginUrl: "/login.html" })
  .then((user) => {
    document.body.style.visibility = "visible";
    return init(user);
  })
  .catch(() => {
    document.body.style.visibility = "visible";
  });
