import { requireAdmin } from "/js/auth-guard.js";
import { auth, db } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import { isSafeUrl } from "/js/security.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ===============================
// DOM
// ===============================
const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("adminOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const portfolioContent = document.getElementById("portfolioContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const searchInput = document.getElementById("searchInput");
const addBtn = document.getElementById("addPortfolioBtn");
const tableWrapper = document.getElementById("portfolioTableWrapper");

// Modal
const modalOverlay = document.getElementById("modalOverlay");
const modal = document.getElementById("portfolioModal");
const modalTitleText = document.getElementById("modalTitleText");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const form = document.getElementById("portfolioForm");

// Confirm
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmDialog = document.getElementById("confirmDialog");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// Image preview
const imageUrlInput = document.getElementById("pfImageUrl");
const imagePreview = document.getElementById("imagePreview");

// ===============================
// State
// ===============================
let allItems = [];
let deleteTargetId = null;

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
// Slug Generator
// ===============================
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

document.getElementById("pfTitle").addEventListener("input", (e) => {
  const slugInput = document.getElementById("pfSlug");
  if (!slugInput.dataset.manual) {
    slugInput.value = generateSlug(e.target.value);
  }
});

document.getElementById("pfSlug").addEventListener("input", (e) => {
  if (e.target.value !== generateSlug(document.getElementById("pfTitle").value)) {
    e.target.dataset.manual = "1";
  } else {
    delete e.target.dataset.manual;
  }
});

// ===============================
// Image Preview
// ===============================
imageUrlInput.addEventListener("input", () => {
  const url = imageUrlInput.value.trim();
  imagePreview.textContent = "";
  imagePreview.className = "image-preview-box";
  if (url && isSafeUrl(url)) {
    const img = document.createElement("img");
    img.alt = "معاينة";
    img.loading = "lazy";
    img.addEventListener("load", () => {
      imagePreview.appendChild(img);
      imagePreview.classList.add("image-preview-box--has-image");
    });
    img.addEventListener("error", () => {
      imagePreview.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/></svg>';
    });
    img.src = url;
  } else {
    imagePreview.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/></svg>';
  }
});

// ===============================
// Modal
// ===============================
function openModal(isEdit = false) {
  modalTitleText.textContent = isEdit ? "تعديل العمل" : "إضافة عمل";
  document.querySelector("#modalSaveBtn .btn-text").textContent = isEdit ? "تحديث العمل" : "حفظ العمل";
  modalOverlay.style.display = "block";
  requestAnimationFrame(() => {
    modalOverlay.classList.add("admin-modal-overlay--visible");
    modal.classList.add("admin-modal--open");
  });
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.classList.remove("admin-modal-overlay--visible");
  modal.classList.remove("admin-modal--open");
  setTimeout(() => {
    modalOverlay.style.display = "none";
    document.body.style.overflow = "";
  }, 220);
  resetForm();
}

modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (confirmDialog.style.display !== "none") closeConfirm();
    else if (modal.classList.contains("admin-modal--open")) closeModal();
  }
});

// ===============================
// Confirm
// ===============================
function openConfirm(id, name) {
  deleteTargetId = id;
  document.getElementById("confirmDesc").textContent =
    `هل أنت متأكد من حذف العمل "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`;
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
    await deleteDoc(doc(db, "portfolio", deleteTargetId));
    allItems = allItems.filter((p) => p.id !== deleteTargetId);
    renderItems(allItems);
    closeConfirm();
  } catch (error) {
    alert("حدث خطأ أثناء الحذف: " + error.message);
  }
  confirmDeleteBtn.disabled = false;
});

// ===============================
// Form Helpers
// ===============================
function resetForm() {
  form.reset();
  document.getElementById("portfolioId").value = "";
  document.getElementById("pfSlug").removeAttribute("data-manual");
  document.getElementById("pfActive").checked = true;
  document.getElementById("pfSortOrder").value = "0";
  form.querySelectorAll(".admin-form-error").forEach((el) => (el.textContent = ""));
  form.querySelectorAll(".admin-form-input--error, .admin-form-textarea--error").forEach((el) => {
    el.classList.remove("admin-form-input--error", "admin-form-textarea--error");
  });
  imagePreview.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/></svg>';
  imagePreview.className = "image-preview-box";
}

function getFormData() {
  const tags = document.getElementById("pfTags").value.split(",").map((s) => s.trim()).filter(Boolean);
  const imageUrl = document.getElementById("pfImageUrl").value.trim();
  const liveUrl = document.getElementById("pfLiveUrl").value.trim();

  return {
    title: document.getElementById("pfTitle").value.trim(),
    titleEn: document.getElementById("pfTitleEn").value.trim(),
    slug: document.getElementById("pfSlug").value.trim(),
    shortDescription: document.getElementById("pfShortDesc").value.trim(),
    shortDescriptionEn: document.getElementById("pfShortDescEn").value.trim(),
    description: document.getElementById("pfDescription").value.trim(),
    tags: tags,
    image: isSafeUrl(imageUrl) ? imageUrl : "",
    liveUrl: isSafeUrl(liveUrl) ? liveUrl : "",
    sortOrder: parseInt(document.getElementById("pfSortOrder").value, 10) || 0,
    featured: document.getElementById("pfFeatured").checked,
    active: document.getElementById("pfActive").checked,
    seoTitle: document.getElementById("pfSeoTitle").value.trim(),
    seoTitleEn: document.getElementById("pfSeoTitleEn").value.trim(),
    metaDescription: document.getElementById("pfMetaDesc").value.trim(),
  };
}

function validateForm() {
  const errors = {};
  const d = getFormData();
  if (!d.title) errors.pfTitle = "اسم المشروع مطلوب.";
  if (!d.slug) errors.pfSlug = "الرابط الثابت مطلوب.";
  return { valid: Object.keys(errors).length === 0, errors };
}

function setFormErrors(errors) {
  form.querySelectorAll(".admin-form-error").forEach((el) => (el.textContent = ""));
  form.querySelectorAll(".admin-form-input--error, .admin-form-textarea--error").forEach((el) => {
    el.classList.remove("admin-form-input--error", "admin-form-textarea--error");
  });
  for (const [field, msg] of Object.entries(errors)) {
    const errEl = document.getElementById(field + "Err");
    const inputEl = document.getElementById(field);
    if (errEl) errEl.textContent = msg;
    if (inputEl) {
      if (inputEl.tagName === "TEXTAREA") inputEl.classList.add("admin-form-textarea--error");
      else inputEl.classList.add("admin-form-input--error");
    }
  }
}

function fillForm(item) {
  document.getElementById("portfolioId").value = item.id;
  document.getElementById("pfTitle").value = item.title || "";
  document.getElementById("pfTitleEn").value = item.titleEn || "";
  document.getElementById("pfSlug").value = item.slug || "";
  document.getElementById("pfSlug").dataset.manual = "1";
  document.getElementById("pfShortDesc").value = item.shortDescription || "";
  document.getElementById("pfShortDescEn").value = item.shortDescriptionEn || "";
  document.getElementById("pfDescription").value = item.description || "";
  document.getElementById("pfTags").value = (item.tags || []).join(", ");
  document.getElementById("pfLiveUrl").value = item.liveUrl || "";
  document.getElementById("pfImageUrl").value = item.image || "";
  document.getElementById("pfSortOrder").value = item.sortOrder ?? 0;
  document.getElementById("pfFeatured").checked = !!item.featured;
  document.getElementById("pfActive").checked = item.active !== false;
  document.getElementById("pfSeoTitle").value = item.seoTitle || "";
  document.getElementById("pfSeoTitleEn").value = item.seoTitleEn || "";
  document.getElementById("pfMetaDesc").value = item.metaDescription || "";
  imageUrlInput.dispatchEvent(new Event("input"));
}

// ===============================
// Save (Create / Update)
// ===============================
modalSaveBtn.addEventListener("click", async () => {
  console.log("🟢 زر الحفظ تم الضغط عليه");

  const { valid, errors } = validateForm();
  if (!valid) {
    setFormErrors(errors);
    const first = form.querySelector(".admin-form-input--error, .admin-form-textarea--error");
    if (first) first.focus();
    return;
  }

  const data = getFormData();
  const id = document.getElementById("portfolioId").value;
  const isEdit = !!id;

  // إظهار حالة التحميل
  const btnText = modalSaveBtn.querySelector(".btn-text");
  const btnLoader = modalSaveBtn.querySelector(".btn-loader");
  btnText.style.display = "none";
  btnLoader.style.display = "block";
  modalSaveBtn.disabled = true;

  try {
    // تحقق من المستخدم والصلاحية
    if (!auth.currentUser) {
      throw new Error("يجب تسجيل الدخول كمدير.");
    }
    const tokenResult = await auth.currentUser.getIdTokenResult();
    if (!tokenResult.claims.admin) {
      throw new Error("ليس لديك صلاحية Admin. تأكد من تعيين الصلاحيات.");
    }

    console.log("✅ المستخدم مصرح له:", auth.currentUser.uid);
    console.log("📦 البيانات المرسلة:", data);

    if (isEdit) {
      await updateDoc(doc(db, "portfolio", id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      const idx = allItems.findIndex((p) => p.id === id);
      if (idx !== -1) allItems[idx] = { ...allItems[idx], ...data, updatedAt: new Date() };
    } else {
      const docRef = await addDoc(collection(db, "portfolio"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      allItems.push({
        id: docRef.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    renderItems(allItems);
    closeModal();
    alert("✅ تم الحفظ بنجاح!");
  } catch (error) {
    console.error("❌ خطأ في الحفظ:", error);
    alert(`❌ فشل الحفظ: ${error.message || "خطأ غير معروف"}`);
  }

  // إعادة الزر
  btnText.style.display = "";
  btnLoader.style.display = "none";
  modalSaveBtn.disabled = false;
});

// ===============================
// Add Button
// ===============================
addBtn.addEventListener("click", () => {
  resetForm();
  openModal(false);
  setTimeout(() => document.getElementById("pfTitle").focus(), 300);
});

// ===============================
// Toggle
// ===============================
async function toggleField(id, field, value) {
  try {
    await updateDoc(doc(db, "portfolio", id), { [field]: value, updatedAt: serverTimestamp() });
    const item = allItems.find((p) => p.id === id);
    if (item) item[field] = value;
  } catch (error) {
    alert("حدث خطأ أثناء التحديث: " + error.message);
    renderItems(allItems);
  }
}

// ===============================
// Search
// ===============================
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    renderItems(allItems);
    return;
  }
  const filtered = allItems.filter(
    (p) =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.slug || "").toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q))
  );
  renderItems(filtered);
});

// ===============================
// Render
// ===============================
function renderItems(items) {
  tableWrapper.textContent = "";
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/></svg></div>
      <div class="empty-state-title">${searchInput.value.trim() ? "لا توجد نتائج" : "لا توجد أعمال بعد"}</div>
      <div class="empty-state-desc">${searchInput.value.trim() ? "جرّب كلمات بحث مختلفة" : "ابدأ بإضافة أول عمل"}</div>
    `;
    tableWrapper.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  const hRow = document.createElement("tr");
  ["المشروع", "الوسوم", "نشط", "مميز", "إجراءات"].forEach((t) => {
    const th = document.createElement("th");
    th.textContent = t;
    hRow.appendChild(th);
  });
  thead.appendChild(hRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  items.forEach((item) => {
    const tr = document.createElement("tr");

    // المشروع
    const tdName = document.createElement("td");
    const div = document.createElement("div");
    div.className = "product-image-cell";
    const thumb = document.createElement("div");
    thumb.className = "product-thumb";
    if (item.image && isSafeUrl(item.image)) {
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
    } else {
      thumb.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/></svg>';
    }
    const nameSpan = document.createElement("span");
    nameSpan.className = "service-title-text";
    nameSpan.textContent = item.title || "—";
    div.appendChild(thumb);
    div.appendChild(nameSpan);
    tdName.appendChild(div);
    tr.appendChild(tdName);

    // الوسوم
    const tdTags = document.createElement("td");
    const tagsContainer = document.createElement("div");
    tagsContainer.style.display = "flex";
    tagsContainer.style.gap = "4px";
    tagsContainer.style.flexWrap = "wrap";
    (item.tags || []).slice(0, 3).forEach((t) => {
      const tag = document.createElement("span");
      tag.className = "category-badge";
      tag.textContent = t;
      tagsContainer.appendChild(tag);
    });
    if ((item.tags || []).length > 3) {
      const more = document.createElement("span");
      more.className = "category-badge";
      more.textContent = `+${(item.tags || []).length - 3}`;
      tagsContainer.appendChild(more);
    }
    tdTags.appendChild(tagsContainer);
    tr.appendChild(tdTags);

    // نشط
    const tdActive = document.createElement("td");
    const toggleActive = document.createElement("label");
    toggleActive.className = "toggle-switch";
    const checkActive = document.createElement("input");
    checkActive.type = "checkbox";
    checkActive.checked = item.active !== false;
    const trackActive = document.createElement("span");
    trackActive.className = "toggle-track";
    toggleActive.appendChild(checkActive);
    toggleActive.appendChild(trackActive);
    checkActive.addEventListener("change", () => toggleField(item.id, "active", checkActive.checked));
    tdActive.appendChild(toggleActive);
    tr.appendChild(tdActive);

    // مميز
    const tdFeatured = document.createElement("td");
    const toggleFeat = document.createElement("label");
    toggleFeat.className = "toggle-switch";
    const checkFeat = document.createElement("input");
    checkFeat.type = "checkbox";
    checkFeat.checked = !!item.featured;
    const trackFeat = document.createElement("span");
    trackFeat.className = "toggle-track";
    toggleFeat.appendChild(checkFeat);
    toggleFeat.appendChild(trackFeat);
    checkFeat.addEventListener("change", () => toggleField(item.id, "featured", checkFeat.checked));
    tdFeatured.appendChild(toggleFeat);
    tr.appendChild(tdFeatured);

    // إجراءات
    const tdActions = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "table-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-ghost";
    editBtn.type = "button";
    editBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/></svg>';
    editBtn.setAttribute("aria-label", "تعديل");
    editBtn.addEventListener("click", () => {
      resetForm();
      fillForm(item);
      openModal(true);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-danger";
    delBtn.type = "button";
    delBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
    delBtn.setAttribute("aria-label", "حذف");
    delBtn.addEventListener("click", () => openConfirm(item.id, item.title));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);
    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
}

// ===============================
// Fetch
// ===============================
async function fetchItems() {
  try {
    const q = query(collection(db, "portfolio"), orderBy("sortOrder", "asc"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("خطأ في جلب الأعمال:", error);
    return [];
  }
}

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
  allItems = await fetchItems();
  renderItems(allItems);
  pageLoader.style.display = "none";
  portfolioContent.style.display = "block";

  if (new URLSearchParams(location.search).get("action") === "new") {
    resetForm();
    openModal(false);
    setTimeout(() => document.getElementById("pfTitle").focus(), 300);
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
