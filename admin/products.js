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

// -----------------------------------------------
// DOM
// -----------------------------------------------
const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("adminOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const productsContent = document.getElementById("productsContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const searchInput = document.getElementById("searchInput");
const addProductBtn = document.getElementById("addProductBtn");
const tableWrapper = document.getElementById("productsTableWrapper");

// Modal
const modalOverlay = document.getElementById("modalOverlay");
const productModal = document.getElementById("productModal");
const modalTitleText = document.getElementById("modalTitleText");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const productForm = document.getElementById("productForm");

// Confirm
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmDialog = document.getElementById("confirmDialog");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// Image preview
const imageUrlInput = document.getElementById("prodImageUrl");
const imagePreview = document.getElementById("imagePreview");

// -----------------------------------------------
// State
// -----------------------------------------------
let allProducts = [];
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

document.getElementById("prodTitle").addEventListener("input", (e) => {
  const slugInput = document.getElementById("prodSlug");
  if (!slugInput.dataset.manual) {
    slugInput.value = generateSlug(e.target.value);
  }
});

document.getElementById("prodSlug").addEventListener("input", (e) => {
  if (e.target.value !== generateSlug(document.getElementById("prodTitle").value)) {
    e.target.dataset.manual = "1";
  } else {
    delete e.target.dataset.manual;
  }
});

// -----------------------------------------------
// Image Preview
// -----------------------------------------------
imageUrlInput.addEventListener("input", () => {
  const url = imageUrlInput.value.trim();
  imagePreview.textContent = "";
  imagePreview.className = "image-preview-box";

  if (url && isSafeUrl(url)) {
    const img = document.createElement("img");
    img.alt = "معاينة الصورة";
    img.loading = "lazy";

    img.addEventListener("load", () => {
      imagePreview.appendChild(img);
      imagePreview.classList.add("image-preview-box--has-image");
    });

    img.addEventListener("error", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("fill", "none");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.5");
      svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/>';
      svg.style.cssText = "width:24px;height:24px";
      imagePreview.appendChild(svg);
    });

    img.src = url;
  } else {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("fill", "none");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.5");
    svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/>';
    svg.style.cssText = "width:24px;height:24px";
    imagePreview.appendChild(svg);
  }
});

// -----------------------------------------------
// Modal
// -----------------------------------------------
function openModal(isEdit = false) {
  modalTitleText.textContent = isEdit ? "تعديل المنتج" : "إضافة منتج";
  document.getElementById("modalSaveBtn").querySelector(".btn-text").textContent = isEdit ? "تحديث المنتج" : "حفظ المنتج";
  modalOverlay.style.display = "block";
  requestAnimationFrame(() => {
    modalOverlay.classList.add("admin-modal-overlay--visible");
    productModal.classList.add("admin-modal--open");
  });
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.classList.remove("admin-modal-overlay--visible");
  productModal.classList.remove("admin-modal--open");
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
    else if (productModal.classList.contains("admin-modal--open")) closeModal();
  }
});

// -----------------------------------------------
// Confirm Dialog
// -----------------------------------------------
function openConfirm(id, name) {
  deleteTargetId = id;
  const desc = document.getElementById("confirmDesc");
  desc.textContent = `هل أنت متأكد من حذف المنتج "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`;
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
    await deleteDoc(doc(db, "products", deleteTargetId));
    allProducts = allProducts.filter((p) => p.id !== deleteTargetId);
    renderProducts(allProducts);
    closeConfirm();
  } catch {
    alert("حدث خطأ أثناء حذف المنتج.");
  }
  confirmDeleteBtn.disabled = false;
});

// -----------------------------------------------
// Form Helpers
// -----------------------------------------------
function resetForm() {
  productForm.reset();
  document.getElementById("productId").value = "";
  document.getElementById("prodSlug").removeAttribute("data-manual");
  document.getElementById("prodActive").checked = true;
  document.getElementById("prodSortOrder").value = "0";
  productForm.querySelectorAll(".admin-form-error").forEach((el) => { el.textContent = ""; });
  productForm.querySelectorAll(".admin-form-input--error, .admin-form-textarea--error").forEach((el) => {
    el.classList.remove("admin-form-input--error", "admin-form-textarea--error");
  });
  // إعادة معاينة الصورة
  imagePreview.textContent = "";
  imagePreview.className = "image-preview-box";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("fill", "none");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/>';
  svg.style.cssText = "width:24px;height:24px";
  imagePreview.appendChild(svg);
}

function getFormData() {
  const featuresAr = document.getElementById("prodFeatures").value
    .split("\n").map((l) => l.trim()).filter(Boolean);
  const featuresEn = document.getElementById("prodFeaturesEn").value
    .split("\n").map((l) => l.trim()).filter(Boolean);

  const imageUrl = document.getElementById("prodImageUrl").value.trim();
  const demoUrl = document.getElementById("prodDemoUrl").value.trim();

  return {
    title: document.getElementById("prodTitle").value.trim(),
    titleEn: document.getElementById("prodTitleEn").value.trim(),
    slug: document.getElementById("prodSlug").value.trim(),
    shortDescription: document.getElementById("prodShortDesc").value.trim(),
    shortDescriptionEn: document.getElementById("prodShortDescEn").value.trim(),
    description: document.getElementById("prodDescription").value.trim(),
    descriptionEn: document.getElementById("prodDescriptionEn").value.trim(),
    features: featuresAr,
    featuresEn: featuresEn,
    price: parseFloat(document.getElementById("prodPrice").value) || 0,
    currency: document.getElementById("prodCurrency").value,
    type: document.getElementById("prodType").value,
    category: document.getElementById("prodCategory").value,
    version: document.getElementById("prodVersion").value.trim(),
    demoUrl: isSafeUrl(demoUrl) ? demoUrl : "",
    image: isSafeUrl(imageUrl) ? imageUrl : "",
    gallery: [],
    status: document.getElementById("prodStatus").value,
    downloadType: document.getElementById("prodDownloadType").value,
    sortOrder: parseInt(document.getElementById("prodSortOrder").value, 10) || 0,
    featured: document.getElementById("prodFeatured").checked,
    active: document.getElementById("prodActive").checked,
    seoTitle: document.getElementById("prodSeoTitle").value.trim(),
    seoTitleEn: document.getElementById("prodSeoTitleEn").value.trim(),
    metaDescription: document.getElementById("prodMetaDesc").value.trim(),
    metaDescriptionEn: document.getElementById("prodMetaDescEn").value.trim(),
  };
}

function setFormErrors(errors) {
  productForm.querySelectorAll(".admin-form-error").forEach((el) => { el.textContent = ""; });
  productForm.querySelectorAll(".admin-form-input--error, .admin-form-textarea--error").forEach((el) => {
    el.classList.remove("admin-form-input--error", "admin-form-textarea--error");
  });
  for (const [field, msg] of Object.entries(errors)) {
    const errEl = document.getElementById(field + "Err");
    const inputEl = document.getElementById(field);
    if (errEl) errEl.textContent = msg;
    if (inputEl) {
      if (inputEl.tagName === "TEXTAREA") {
        inputEl.classList.add("admin-form-textarea--error");
      } else {
        inputEl.classList.add("admin-form-input--error");
      }
    }
  }
}

function validateForm() {
  const errors = {};
  const d = getFormData();

  if (!d.title) errors.prodTitle = "اسم المنتج مطلوب.";
  if (!d.slug) errors.prodSlug = "الرابط الثابت مطلوب.";

  return { valid: Object.keys(errors).length === 0, errors };
}

function fillForm(product) {
  document.getElementById("productId").value = product.id;
  document.getElementById("prodTitle").value = product.title || "";
  document.getElementById("prodTitleEn").value = product.titleEn || "";
  document.getElementById("prodSlug").value = product.slug || "";
  document.getElementById("prodSlug").dataset.manual = "1";
  document.getElementById("prodShortDesc").value = product.shortDescription || "";
  document.getElementById("prodShortDescEn").value = product.shortDescriptionEn || "";
  document.getElementById("prodDescription").value = product.description || "";
  document.getElementById("prodDescriptionEn").value = product.descriptionEn || "";
  document.getElementById("prodFeatures").value = (product.features || []).join("\n");
  document.getElementById("prodFeaturesEn").value = (product.featuresEn || []).join("\n");
  document.getElementById("prodPrice").value = product.price ?? "";
  document.getElementById("prodCurrency").value = product.currency || "EGP";
  document.getElementById("prodType").value = product.type || "template";
  document.getElementById("prodCategory").value = product.category || "";
  document.getElementById("prodVersion").value = product.version || "";
  document.getElementById("prodDemoUrl").value = product.demoUrl || "";
  document.getElementById("prodImageUrl").value = product.image || "";
  document.getElementById("prodStatus").value = product.status || "available";
  document.getElementById("prodDownloadType").value = product.downloadType || "free";
  document.getElementById("prodSortOrder").value = product.sortOrder ?? 0;
  document.getElementById("prodFeatured").checked = !!product.featured;
  document.getElementById("prodActive").checked = product.active !== false;
  document.getElementById("prodSeoTitle").value = product.seoTitle || "";
  document.getElementById("prodSeoTitleEn").value = product.seoTitleEn || "";
  document.getElementById("prodMetaDesc").value = product.metaDescription || "";
  document.getElementById("prodMetaDescEn").value = product.metaDescriptionEn || "";

  // تحديث معاينة الصورة
  imageUrlInput.dispatchEvent(new Event("input"));
}

// -----------------------------------------------
// Save
// -----------------------------------------------
modalSaveBtn.addEventListener("click", async () => {
  const { valid, errors } = validateForm();
  if (!valid) {
    setFormErrors(errors);
    const firstErr = productForm.querySelector(".admin-form-input--error, .admin-form-textarea--error");
    if (firstErr) firstErr.focus();
    return;
  }

  const data = getFormData();
  const id = document.getElementById("productId").value;
  const isEdit = !!id;

  const btnText = modalSaveBtn.querySelector(".btn-text");
  const btnLoader = modalSaveBtn.querySelector(".btn-loader");
  btnText.style.display = "none";
  btnLoader.style.display = "block";
  modalSaveBtn.disabled = true;

  try {
    if (isEdit) {
      await updateDoc(doc(db, "products", id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      const idx = allProducts.findIndex((p) => p.id === id);
      if (idx !== -1) {
        allProducts[idx] = { ...allProducts[idx], ...data, updatedAt: new Date() };
      }
    } else {
      const docRef = await addDoc(collection(db, "products"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      allProducts.push({
        id: docRef.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    renderProducts(allProducts);
    closeModal();
  } catch {
    alert("حدث خطأ أثناء الحفظ. تأكد من اتصال الإنترنت وصلاحياتك.");
  }

  btnText.style.display = "";
  btnLoader.style.display = "none";
  modalSaveBtn.disabled = false;
});

// -----------------------------------------------
// Add Button
// -----------------------------------------------
addProductBtn.addEventListener("click", () => {
  resetForm();
  openModal(false);
  setTimeout(() => document.getElementById("prodTitle").focus(), 300);
});

// -----------------------------------------------
// Toggle
// -----------------------------------------------
async function toggleField(id, field, value) {
  try {
    await updateDoc(doc(db, "products", id), { [field]: value, updatedAt: serverTimestamp() });
    const prod = allProducts.find((p) => p.id === id);
    if (prod) prod[field] = value;
  } catch {
    alert("حدث خطأ أثناء التحديث.");
    renderProducts(allProducts);
  }
}

// -----------------------------------------------
// Search
// -----------------------------------------------
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { renderProducts(allProducts); return; }
  const filtered = allProducts.filter(
    (p) =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.titleEn || "").toLowerCase().includes(q) ||
      (p.slug || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.type || "").toLowerCase().includes(q)
  );
  renderProducts(filtered);
});

// -----------------------------------------------
// Maps
// -----------------------------------------------
const CURRENCY_MAP = { EGP: "ج.م", USD: "$", SAR: "ر.س", AED: "د.إ" };

const TYPE_MAP = {
  template: { label: "قالب", cls: "template" },
  tool: { label: "أداة", cls: "tool" },
  resource: { label: "مصدر", cls: "resource" },
  "digital-product": { label: "منتج رقمي", cls: "digital-product" },
};

const STATUS_MAP = {
  available: { label: "متاح", cls: "available" },
  "coming-soon": { label: "قريبًا", cls: "coming-soon" },
  draft: { label: "مسودة", cls: "draft" },
  discontinued: { label: "متوقف", cls: "discontinued" },
};

const DOWNLOAD_MAP = {
  free: "تحميل مجاني",
  paid: "مدفوع",
  contact: "تواصل",
};

// -----------------------------------------------
// Render
// -----------------------------------------------
function renderProducts(products) {
  tableWrapper.textContent = "";

  if (products.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-state-icon";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>`;

    const title = document.createElement("div");
    title.className = "empty-state-title";
    title.textContent = searchInput.value.trim() ? "لا توجد نتائج" : "لا توجد منتجات بعد";

    const desc = document.createElement("div");
    desc.className = "empty-state-desc";
    desc.textContent = searchInput.value.trim() ? "جرّب كلمات بحث مختلفة" : "ابدأ بإضافة أول منتج";

    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(desc);
    tableWrapper.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  const hRow = document.createElement("tr");
  ["المنتج", "النوع", "الحالة", "السعر", "التحميل", "نشط", "إجراءات"].forEach((t) => {
    const th = document.createElement("th");
    th.textContent = t;
    hRow.appendChild(th);
  });
  thead.appendChild(hRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  products.forEach((prod) => {
    const tr = document.createElement("tr");

    // المنتج (صورة + اسم)
    const tdName = document.createElement("td");
    const nameDiv = document.createElement("div");
    nameDiv.className = "product-image-cell";

    const thumb = document.createElement("div");
    thumb.className = "product-thumb";

    if (prod.image && isSafeUrl(prod.image)) {
      const img = document.createElement("img");
      img.src = prod.image;
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/></svg>`;
    }

    const nameText = document.createElement("div");
    const nameSpan = document.createElement("span");
    nameSpan.className = "service-title-text";
    nameSpan.textContent = prod.title || "—";
    nameText.appendChild(nameSpan);

    if (prod.version) {
      const ver = document.createElement("span");
      ver.className = "version-tag";
      ver.textContent = "v" + prod.version;
      nameText.appendChild(ver);
    }

    nameDiv.appendChild(thumb);
    nameDiv.appendChild(nameText);
    tdName.appendChild(nameDiv);
    tr.appendChild(tdName);

    // النوع
    const tdType = document.createElement("td");
    const typeInfo = TYPE_MAP[prod.type] || { label: prod.type || "—", cls: "template" };
    const typeBadge = document.createElement("span");
    typeBadge.className = `type-badge type-badge--${typeInfo.cls}`;
    typeBadge.textContent = typeInfo.label;
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    // الحالة
    const tdStatus = document.createElement("td");
    const statusInfo = STATUS_MAP[prod.status] || { label: prod.status || "—", cls: "draft" };
    const statusDiv = document.createElement("div");
    statusDiv.className = `product-status product-status--${statusInfo.cls}`;
    const statusDot = document.createElement("span");
    statusDot.className = "product-status-dot";
    statusDiv.appendChild(statusDot);
    statusDiv.appendChild(document.createTextNode(statusInfo.label));
    tdStatus.appendChild(statusDiv);
    tr.appendChild(tdStatus);

    // السعر
    const tdPrice = document.createElement("td");
    if (prod.price > 0) {
      const priceSpan = document.createElement("span");
      priceSpan.className = "price-text";
      priceSpan.textContent = prod.price.toLocaleString("ar-EG");
      const currSpan = document.createElement("span");
      currSpan.className = "price-currency";
      currSpan.textContent = CURRENCY_MAP[prod.currency] || prod.currency || "";
      tdPrice.appendChild(priceSpan);
      tdPrice.appendChild(currSpan);
    } else {
      tdPrice.textContent = "مجاني";
      tdPrice.style.color = "var(--admin-success)";
      tdPrice.style.fontWeight = "600";
    }
    tr.appendChild(tdPrice);

    // نوع التحميل
    const tdDownload = document.createElement("td");
    const dlTag = document.createElement("span");
    dlTag.className = "download-tag";
    dlTag.textContent = DOWNLOAD_MAP[prod.downloadType] || prod.downloadType || "—";
    tdDownload.appendChild(dlTag);
    tr.appendChild(tdDownload);

    // نشط
    const tdActive = document.createElement("td");
    const toggleActive = document.createElement("label");
    toggleActive.className = "toggle-switch";
    const checkActive = document.createElement("input");
    checkActive.type = "checkbox";
    checkActive.checked = prod.active !== false;
    checkActive.setAttribute("aria-label", "تفعيل/تعطيل");
    const trackActive = document.createElement("span");
    trackActive.className = "toggle-track";
    toggleActive.appendChild(checkActive);
    toggleActive.appendChild(trackActive);
    checkActive.addEventListener("change", () => toggleField(prod.id, "active", checkActive.checked));
    tdActive.appendChild(toggleActive);
    tr.appendChild(tdActive);

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
      fillForm(prod);
      openModal(true);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-danger";
    delBtn.type = "button";
    delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>`;
    delBtn.setAttribute("aria-label", "حذف");
    delBtn.addEventListener("click", () => openConfirm(prod.id, prod.title));

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
// Fetch
// -----------------------------------------------
async function fetchProducts() {
  try {
    const q = query(collection(db, "products"), orderBy("sortOrder", "asc"), orderBy("createdAt", "desc"));
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
  allProducts = await fetchProducts();
  renderProducts(allProducts);
  pageLoader.style.display = "none";
  productsContent.style.display = "block";

  if (new URLSearchParams(location.search).get("action") === "new") {
    resetForm();
    openModal(false);
    setTimeout(() => document.getElementById("prodTitle").focus(), 300);
  }
}

requireAdmin({ loginUrl: "/login.html" })
  .then((user) => {
    document.body.style.visibility = "visible";
    return init(user);
  })
  .catch(() => {});
