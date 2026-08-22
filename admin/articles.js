/**
 * admin/articles.js
 * إدارة المقالات — CRUD كامل مع TinyMCE ورفع الصور
 */

import { requireAdmin } from "/js/auth-guard.js";
import { auth, db, storage } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import { isSafeUrl, escapeHtml } from "/js/security.js";
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
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

// ============================================
// DOM
// ============================================
const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("adminOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const articlesContent = document.getElementById("articlesContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const searchInput = document.getElementById("searchInput");
const addArticleBtn = document.getElementById("addArticleBtn");
const tableWrapper = document.getElementById("articlesTableWrapper");
const formContainer = document.getElementById("articleFormContainer");
const articleForm = document.getElementById("articleForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveArticleBtn = document.getElementById("saveArticleBtn");

// حقول النموذج
const articleId = document.getElementById("articleId");
const artTitle = document.getElementById("artTitle");
const artSlug = document.getElementById("artSlug");
const artCategory = document.getElementById("artCategory");
const artAuthor = document.getElementById("artAuthor");
const artExcerpt = document.getElementById("artExcerpt");
const artBody = document.getElementById("artBody");
const artImage = document.getElementById("artImage");
const artSortOrder = document.getElementById("artSortOrder");
const artActive = document.getElementById("artActive");
const artSeoTitle = document.getElementById("artSeoTitle");
const artMetaDesc = document.getElementById("artMetaDesc");

// رفع الصور
const uploadImageBtn = document.getElementById("uploadImageBtn");
const imageFileInput = document.getElementById("imageFileInput");
const imagePreview = document.getElementById("imagePreview");
const removeImageBtn = document.getElementById("removeImageBtn");
const uploadProgress = document.getElementById("uploadProgress");

// مودال التأكيد
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");

// ============================================
// الحالة
// ============================================
let allArticles = [];
let deleteTargetId = null;
let editor = null;
let isEditMode = false;
let uploadedImageUrl = "";

// ============================================
// TinyMCE تهيئة المحرر
// ============================================
async function initEditor() {
  // تأكد من تحميل TinyMCE
  if (typeof tinymce === "undefined") {
    console.warn("TinyMCE not loaded. Using textarea fallback.");
    return;
  }

  await tinymce.init({
    selector: "#artBody",
    language: "ar",
    directionality: "rtl",
    height: 400,
    menubar: true,
    plugins: [
      "advlist", "autolink", "lists", "link", "image", "charmap", "preview",
      "anchor", "searchreplace", "visualblocks", "code", "fullscreen",
      "insertdatetime", "media", "table", "help", "wordcount"
    ],
    toolbar: "undo redo | blocks | " +
      "bold italic backcolor | alignleft aligncenter " +
      "alignright alignjustify | bullist numlist outdent indent | " +
      "removeformat | help",
    content_style: "body { font-family: Cairo, sans-serif; font-size: 16px; line-height: 1.8; }",
    setup: function(ed) {
      editor = ed;
      ed.on("change", function() {
        // تحديث قيمة textarea للتحقق
        artBody.value = ed.getContent();
      });
    },
  });
}

// ============================================
// Sidebar
// ============================================
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

// ============================================
// Slug Generator
// ============================================
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

artTitle.addEventListener("input", () => {
  if (!artSlug.dataset.manual) {
    artSlug.value = generateSlug(artTitle.value);
  }
});
artSlug.addEventListener("input", () => {
  if (artSlug.value !== generateSlug(artTitle.value)) {
    artSlug.dataset.manual = "1";
  } else {
    delete artSlug.dataset.manual;
  }
});

// ============================================
// رفع الصورة إلى Firebase Storage
// ============================================
uploadImageBtn.addEventListener("click", () => {
  imageFileInput.click();
});

imageFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // التحقق من نوع الملف
  if (!file.type.startsWith("image/")) {
    alert("يرجى اختيار ملف صورة صالح.");
    return;
  }

  // تعطيل الزر أثناء الرفع
  uploadImageBtn.disabled = true;
  uploadImageBtn.textContent = "جاري الرفع...";

  const storageRef = ref(storage, `articles/${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      uploadProgress.style.width = progress + "%";
    },
    (error) => {
      console.error("Error uploading image:", error);
      alert("فشل رفع الصورة. حاول مجدداً.");
      uploadImageBtn.disabled = false;
      uploadImageBtn.textContent = "📤 رفع صورة";
    },
    async () => {
      try {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        uploadedImageUrl = url;
        artImage.value = url;
        updateImagePreview(url);
        uploadImageBtn.disabled = false;
        uploadImageBtn.textContent = "📤 رفع صورة";
        uploadProgress.style.width = "0%";
        removeImageBtn.style.display = "inline-block";
      } catch (err) {
        console.error("Error getting download URL:", err);
        alert("حدث خطأ أثناء الحصول على رابط الصورة.");
        uploadImageBtn.disabled = false;
        uploadImageBtn.textContent = "📤 رفع صورة";
      }
    }
  );
});

function updateImagePreview(url) {
  imagePreview.innerHTML = "";
  if (url && isSafeUrl(url)) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "معاينة الصورة";
    imagePreview.appendChild(img);
  } else {
    imagePreview.innerHTML = `<span class="placeholder">🖼️</span>`;
  }
}

removeImageBtn.addEventListener("click", async () => {
  if (uploadedImageUrl) {
    try {
      const oldRef = ref(storage, uploadedImageUrl);
      await deleteObject(oldRef);
    } catch (e) {
      console.warn("Could not delete old image:", e);
    }
  }
  uploadedImageUrl = "";
  artImage.value = "";
  updateImagePreview("");
  removeImageBtn.style.display = "none";
});

// ============================================
// فتح/إغلاق نموذج المقال
// ============================================
function openForm(article = null) {
  isEditMode = !!article;
  formContainer.style.display = "block";

  if (article) {
    // ملء النموذج للتحرير
    articleId.value = article.id;
    artTitle.value = article.title || "";
    artSlug.value = article.slug || "";
    artSlug.dataset.manual = "1";
    artCategory.value = article.category || "";
    artAuthor.value = article.author || "";
    artExcerpt.value = article.excerpt || "";
    if (editor) {
      editor.setContent(article.body || "");
    } else {
      artBody.value = article.body || "";
    }
    uploadedImageUrl = article.image || "";
    artImage.value = uploadedImageUrl;
    updateImagePreview(uploadedImageUrl);
    if (uploadedImageUrl) {
      removeImageBtn.style.display = "inline-block";
    } else {
      removeImageBtn.style.display = "none";
    }
    artSortOrder.value = article.sortOrder ?? 0;
    artActive.checked = article.active !== false;
    artSeoTitle.value = article.seoTitle || "";
    artMetaDesc.value = article.metaDescription || "";

    document.querySelector("#saveArticleBtn .btn-text").textContent = "💾 تحديث المقال";
  } else {
    // إضافة جديدة
    resetForm();
    document.querySelector("#saveArticleBtn .btn-text").textContent = "💾 حفظ المقال";
  }

  // تمرير إلى النموذج
  formContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  articleId.value = "";
  artTitle.value = "";
  artSlug.value = "";
  delete artSlug.dataset.manual;
  artCategory.value = "";
  artAuthor.value = "";
  artExcerpt.value = "";
  if (editor) editor.setContent("");
  else artBody.value = "";
  uploadedImageUrl = "";
  artImage.value = "";
  updateImagePreview("");
  removeImageBtn.style.display = "none";
  artSortOrder.value = "0";
  artActive.checked = true;
  artSeoTitle.value = "";
  artMetaDesc.value = "";
  // مسح الأخطاء
  document.querySelectorAll(".error").forEach(el => el.textContent = "");
}

function closeForm() {
  formContainer.style.display = "none";
  resetForm();
  isEditMode = false;
}

cancelEditBtn.addEventListener("click", closeForm);

addArticleBtn.addEventListener("click", () => {
  openForm(null);
  // التركيز على حقل العنوان
  setTimeout(() => artTitle.focus(), 300);
});

// ============================================
// حفظ المقال
// ============================================
articleForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // التحقق من صحة الحقول
  const title = artTitle.value.trim();
  const excerpt = artExcerpt.value.trim();
  const body = editor ? editor.getContent() : artBody.value.trim();

  let hasError = false;
  document.querySelectorAll(".error").forEach(el => el.textContent = "");

  if (!title) {
    document.getElementById("artTitleErr").textContent = "عنوان المقال مطلوب.";
    hasError = true;
  }
  if (!excerpt) {
    document.getElementById("artExcerptErr").textContent = "ملخص المقال مطلوب.";
    hasError = true;
  }
  if (!body) {
    document.getElementById("artBodyErr").textContent = "محتوى المقال مطلوب.";
    hasError = true;
  }

  if (hasError) return;

  // تعطيل الزر وإظهار التحميل
  saveArticleBtn.disabled = true;
  saveArticleBtn.querySelector(".btn-text").style.display = "none";
  saveArticleBtn.querySelector(".spinner").style.display = "block";

  const data = {
    title: title,
    slug: artSlug.value.trim() || generateSlug(title),
    category: artCategory.value,
    author: artAuthor.value.trim() || "عبدالله عباس",
    excerpt: excerpt,
    body: body,
    image: artImage.value || "",
    sortOrder: parseInt(artSortOrder.value, 10) || 0,
    active: artActive.checked,
    seoTitle: artSeoTitle.value.trim(),
    metaDescription: artMetaDesc.value.trim(),
    updatedAt: serverTimestamp(),
  };

  try {
    const id = articleId.value;
    if (id) {
      // تحديث
      await updateDoc(doc(db, "blog", id), data);
      const idx = allArticles.findIndex(a => a.id === id);
      if (idx !== -1) {
        allArticles[idx] = { ...allArticles[idx], ...data, updatedAt: new Date() };
      }
    } else {
      // إضافة جديدة
      data.createdAt = serverTimestamp();
      const docRef = await addDoc(collection(db, "blog"), data);
      allArticles.push({
        id: docRef.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    renderArticles(allArticles);
    closeForm();
    // إشعار نجاح (بسيط)
    alert(isEditMode ? "✅ تم تحديث المقال بنجاح." : "✅ تم إضافة المقال بنجاح.");
  } catch (error) {
    console.error("Error saving article:", error);
    alert("❌ حدث خطأ أثناء حفظ المقال. تأكد من اتصال الإنترنت.");
  }

  saveArticleBtn.disabled = false;
  saveArticleBtn.querySelector(".btn-text").style.display = "";
  saveArticleBtn.querySelector(".spinner").style.display = "none";
});

// ============================================
// عرض المقالات في جدول
// ============================================
function renderArticles(articles) {
  tableWrapper.textContent = "";

  if (articles.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"/></svg></div>
      <div class="title">${searchInput.value.trim() ? "لا توجد نتائج" : "لا توجد مقالات بعد"}</div>
      <div class="desc">${searchInput.value.trim() ? "جرّب كلمات بحث مختلفة" : "ابدأ بإضافة أول مقال"}</div>
    `;
    tableWrapper.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "articles-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `<tr>
    <th>المقال</th>
    <th>التصنيف</th>
    <th>الكاتب</th>
    <th>نشط</th>
    <th>الإجراءات</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  articles.forEach((article) => {
    const tr = document.createElement("tr");

    // العمود الأول: الصورة + العنوان
    const tdTitle = document.createElement("td");
    const flexDiv = document.createElement("div");
    flexDiv.style.cssText = "display:flex;align-items:center;gap:12px;";

    const thumbDiv = document.createElement("div");
    thumbDiv.className = "article-thumb";
    if (article.image && isSafeUrl(article.image)) {
      const img = document.createElement("img");
      img.src = article.image;
      img.alt = "";
      thumbDiv.appendChild(img);
    } else {
      thumbDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"/></svg>`;
    }
    flexDiv.appendChild(thumbDiv);

    const titleSpan = document.createElement("span");
    titleSpan.className = "article-title";
    titleSpan.textContent = article.title || "—";
    flexDiv.appendChild(titleSpan);
    tdTitle.appendChild(flexDiv);
    tr.appendChild(tdTitle);

    // التصنيف
    const tdCat = document.createElement("td");
    tdCat.textContent = article.category || "—";
    tr.appendChild(tdCat);

    // الكاتب
    const tdAuthor = document.createElement("td");
    tdAuthor.textContent = article.author || "—";
    tr.appendChild(tdAuthor);

    // نشط (Toggle)
    const tdActive = document.createElement("td");
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "toggle-switch";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = article.active !== false;
    toggleInput.addEventListener("change", () => toggleActive(article.id, toggleInput.checked));
    const track = document.createElement("span");
    track.className = "toggle-track";
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(track);
    tdActive.appendChild(toggleLabel);
    tr.appendChild(tdActive);

    // الإجراءات
    const tdActions = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "table-actions";

    const editBtn = document.createElement("button");
    editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/></svg>`;
    editBtn.setAttribute("aria-label", "تعديل");
    editBtn.addEventListener("click", () => openForm(article));
    actionsDiv.appendChild(editBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>`;
    delBtn.setAttribute("aria-label", "حذف");
    delBtn.addEventListener("click", () => {
      deleteTargetId = article.id;
      confirmMessage.textContent = `هل أنت متأكد من حذف المقال "${article.title}"؟ لا يمكن التراجع عن هذا الإجراء.`;
      confirmModal.classList.add("active");
    });
    actionsDiv.appendChild(delBtn);

    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
}

// ============================================
// تبديل حالة النشاط
// ============================================
async function toggleActive(id, value) {
  try {
    await updateDoc(doc(db, "blog", id), { active: value, updatedAt: serverTimestamp() });
    const article = allArticles.find(a => a.id === id);
    if (article) article.active = value;
  } catch (e) {
    console.error("Error toggling active:", e);
    renderArticles(allArticles);
  }
}

// ============================================
// البحث
// ============================================
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { renderArticles(allArticles); return; }
  const filtered = allArticles.filter(a =>
    (a.title || "").toLowerCase().includes(q) ||
    (a.slug || "").toLowerCase().includes(q) ||
    (a.category || "").toLowerCase().includes(q) ||
    (a.author || "").toLowerCase().includes(q)
  );
  renderArticles(filtered);
});

// ============================================
// مودال التأكيد
// ============================================
confirmCancelBtn.addEventListener("click", () => {
  confirmModal.classList.remove("active");
  deleteTargetId = null;
});
confirmDeleteBtn.addEventListener("click", async () => {
  if (!deleteTargetId) return;
  try {
    await deleteDoc(doc(db, "blog", deleteTargetId));
    allArticles = allArticles.filter(a => a.id !== deleteTargetId);
    renderArticles(allArticles);
    confirmModal.classList.remove("active");
    deleteTargetId = null;
  } catch (e) {
    console.error("Error deleting article:", e);
    alert("❌ حدث خطأ أثناء حذف المقال.");
    confirmModal.classList.remove("active");
  }
});
confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) {
    confirmModal.classList.remove("active");
    deleteTargetId = null;
  }
});

// ============================================
// جلب المقالات
// ============================================
async function fetchArticles() {
  try {
    const q = query(collection(db, "blog"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error fetching articles:", e);
    return [];
  }
}

// ============================================
// معلومات المستخدم
// ============================================
function setUserInfo(user) {
  const name = user.displayName || user.email || "مدير";
  headerUserName.textContent = name;
  headerAvatar.textContent = name.trim().charAt(0);
}

// ============================================
// التهيئة
// ============================================
async function init(user) {
  setUserInfo(user);
  await initEditor();
  allArticles = await fetchArticles();
  renderArticles(allArticles);

  pageLoader.style.display = "none";
  articlesContent.style.display = "block";

  // فتح النموذج تلقائياً إذا كان هناك ?action=new
  if (new URLSearchParams(location.search).get("action") === "new") {
    openForm(null);
    setTimeout(() => artTitle.focus(), 300);
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
