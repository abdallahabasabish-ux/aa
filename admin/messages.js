import { requireAdmin } from "/js/auth-guard.js";
import { auth, db } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ===============================
// DOM
// ===============================
const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("adminOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const messagesContent = document.getElementById("messagesContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const searchInput = document.getElementById("searchInput");
const markAllReadBtn = document.getElementById("markAllReadBtn");
const tableWrapper = document.getElementById("messagesTableWrapper");

// Modal
const modalOverlay = document.getElementById("modalOverlay");
const modal = document.getElementById("messageModal");
const modalTitleText = document.getElementById("modalTitleText");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalBody = document.getElementById("messageDetailBody");
const modalFooter = document.getElementById("messageDetailFooter");

// Confirm
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmDialog = document.getElementById("confirmDialog");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// ===============================
// State
// ===============================
let allItems = [];
let deleteTargetId = null;
let currentMessageId = null;

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
function formatDateTime(date) {
  if (!date) return "—";
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessageSubject(msg) {
  return msg.title || msg.subject || msg.service || "رسالة جديدة";
}

function getSenderName(msg) {
  return msg.name || msg.customerName || msg.senderName || "—";
}

function getSenderEmail(msg) {
  return msg.email || msg.customerEmail || msg.senderEmail || "—";
}

// ===============================
// Modal (تفاصيل الرسالة)
// ===============================
function openModal(message) {
  currentMessageId = message.id;
  modalTitleText.textContent = `رسالة من ${getSenderName(message)}`;
  modalOverlay.style.display = "block";
  requestAnimationFrame(() => {
    modalOverlay.classList.add("admin-modal-overlay--visible");
    modal.classList.add("admin-modal--open");
  });
  document.body.style.overflow = "hidden";

  // تعبئة المحتوى
  modalBody.textContent = "";
  modalFooter.textContent = "";

  // تفاصيل
  const detailSection = document.createElement("div");
  detailSection.className = "detail-section";

  const grid = document.createElement("div");
  grid.className = "detail-grid";

  grid.appendChild(createDetailItem("المرسل", getSenderName(message)));
  grid.appendChild(createDetailItem("البريد الإلكتروني", getSenderEmail(message)));
  grid.appendChild(createDetailItem("الموضوع", getMessageSubject(message)));

  if (message.phone) {
    grid.appendChild(createDetailItem("الهاتف", message.phone));
  }

  if (message.budget) {
    grid.appendChild(createDetailItem("الميزانية", message.budget));
  }

  grid.appendChild(createDetailItem("التاريخ", formatDateTime(message.createdAt)));

  detailSection.appendChild(grid);
  modalBody.appendChild(detailSection);

  // نص الرسالة
  if (message.message) {
    const msgSection = document.createElement("div");
    msgSection.className = "detail-section";

    const msgTitle = document.createElement("div");
    msgTitle.className = "detail-section-title";
    msgTitle.textContent = "نص الرسالة";
    msgSection.appendChild(msgTitle);

    const msgText = document.createElement("div");
    msgText.className = "detail-value detail-value--muted";
    msgText.style.whiteSpace = "pre-wrap";
    msgText.style.lineHeight = "1.8";
    msgText.textContent = message.message;
    msgSection.appendChild(msgText);

    modalBody.appendChild(msgSection);
  }

  // زر "تحديد كمقروء"
  const footerDiv = document.createElement("div");
  footerDiv.style.display = "flex";
  footerDiv.style.alignItems = "center";
  footerDiv.style.gap = "12px";
  footerDiv.style.width = "100%";
  footerDiv.style.justifyContent = "flex-end";

  const readBtn = document.createElement("button");
  readBtn.className = "btn-primary";
  readBtn.type = "button";
  const isRead = message.read === true;
  readBtn.innerHTML = isRead
    ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg> مقروءة`
    : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg> تعيين كمقروءة`;
  readBtn.style.marginInlineStart = "auto";

  readBtn.addEventListener("click", async () => {
    try {
      const newReadState = !isRead;
      await updateDoc(doc(db, "orders", message.id), { read: newReadState });
      message.read = newReadState;
      // تحديث الجدول
      renderItems(allItems);
      closeModal();
    } catch (error) {
      alert("حدث خطأ أثناء تحديث حالة القراءة: " + error.message);
    }
  });

  footerDiv.appendChild(readBtn);

  // زر الحذف (من المودال)
  const delBtn = document.createElement("button");
  delBtn.className = "btn-danger";
  delBtn.type = "button";
  delBtn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg> حذف الرسالة';
  delBtn.addEventListener("click", () => {
    closeModal();
    setTimeout(() => openConfirm(message.id, getSenderName(message)), 300);
  });
  footerDiv.appendChild(delBtn);

  modalFooter.appendChild(footerDiv);
}

function closeModal() {
  modalOverlay.classList.remove("admin-modal-overlay--visible");
  modal.classList.remove("admin-modal--open");
  setTimeout(() => {
    modalOverlay.style.display = "none";
    document.body.style.overflow = "";
    currentMessageId = null;
  }, 220);
}

modalCloseBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (confirmDialog.style.display !== "none") closeConfirm();
    else if (modal.classList.contains("admin-modal--open")) closeModal();
  }
});

function createDetailItem(label, value) {
  const item = document.createElement("div");
  item.className = "detail-item";

  const lbl = document.createElement("div");
  lbl.className = "detail-label";
  lbl.textContent = label;
  item.appendChild(lbl);

  const val = document.createElement("div");
  val.className = "detail-value";
  if (value) {
    val.textContent = value;
  } else {
    val.textContent = "—";
    val.classList.add("detail-value--empty");
  }
  item.appendChild(val);
  return item;
}

// ===============================
// Confirm
// ===============================
function openConfirm(id, name) {
  deleteTargetId = id;
  document.getElementById("confirmDesc").textContent =
    `هل أنت متأكد من حذف رسالة "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`;
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
    await deleteDoc(doc(db, "orders", deleteTargetId));
    allItems = allItems.filter((p) => p.id !== deleteTargetId);
    renderItems(allItems);
    closeConfirm();
    alert("✅ تم حذف الرسالة بنجاح.");
  } catch (error) {
    alert("❌ فشل الحذف: " + (error.message || "خطأ غير معروف"));
  }
  confirmDeleteBtn.disabled = false;
});

// ===============================
// Mark All as Read
// ===============================
markAllReadBtn.addEventListener("click", async () => {
  const unread = allItems.filter((msg) => msg.read !== true);
  if (unread.length === 0) {
    alert("جميع الرسائل مقروءة بالفعل.");
    return;
  }
  if (!confirm(`تحديد ${unread.length} رسالة كـ "مقروءة"؟`)) return;

  try {
    const batch = writeBatch(db);
    unread.forEach((msg) => {
      const ref = doc(db, "orders", msg.id);
      batch.update(ref, { read: true });
    });
    await batch.commit();

    // تحديث الحالة المحلية
    unread.forEach((msg) => { msg.read = true; });
    renderItems(allItems);
    alert(`✅ تم تعيين ${unread.length} رسالة كمقروءة.`);
  } catch (error) {
    alert("❌ فشل التحديث: " + (error.message || "خطأ غير معروف"));
  }
});

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
      (p.name || p.customerName || "").toLowerCase().includes(q) ||
      (p.email || p.customerEmail || "").toLowerCase().includes(q) ||
      (p.title || p.subject || p.service || "").toLowerCase().includes(q) ||
      (p.message || "").toLowerCase().includes(q)
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
      <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg></div>
      <div class="empty-state-title">${searchInput.value.trim() ? "لا توجد نتائج" : "لا توجد رسائل بعد"}</div>
      <div class="empty-state-desc">${searchInput.value.trim() ? "جرّب كلمات بحث مختلفة" : "ستظهر رسائل التواصل هنا"}</div>
    `;
    tableWrapper.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  const hRow = document.createElement("tr");
  ["المرسل", "الموضوع", "التاريخ", "الحالة", "إجراءات"].forEach((t) => {
    const th = document.createElement("th");
    th.textContent = t;
    hRow.appendChild(th);
  });
  thead.appendChild(hRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  items.forEach((item) => {
    const tr = document.createElement("tr");
    const isRead = item.read === true;

    // خلفية مختلفة للرسائل غير المقروءة
    if (!isRead) {
      tr.style.backgroundColor = "rgba(255, 102, 0, 0.03)";
    }

    // المرسل
    const tdSender = document.createElement("td");
    const senderDiv = document.createElement("div");
    senderDiv.className = "service-title-text";
    senderDiv.textContent = getSenderName(item);
    if (!isRead) {
      senderDiv.style.fontWeight = "700";
      senderDiv.style.color = "var(--admin-text-primary)";
    }
    tdSender.appendChild(senderDiv);
    // بريد إلكتروني صغير أسفل الاسم
    const emailSmall = document.createElement("div");
    emailSmall.style.fontSize = "0.7rem";
    emailSmall.style.color = "var(--admin-text-muted)";
    emailSmall.style.direction = "ltr";
    emailSmall.style.textAlign = "start";
    emailSmall.textContent = getSenderEmail(item);
    tdSender.appendChild(emailSmall);
    tr.appendChild(tdSender);

    // الموضوع
    const tdSubject = document.createElement("td");
    tdSubject.textContent = getMessageSubject(item);
    if (!isRead) {
      tdSubject.style.fontWeight = "600";
      tdSubject.style.color = "var(--admin-text-primary)";
    }
    tr.appendChild(tdSubject);

    // التاريخ
    const tdDate = document.createElement("td");
    tdDate.textContent = formatDateTime(item.createdAt);
    tr.appendChild(tdDate);

    // الحالة (مقروءة/غير مقروءة)
    const tdStatus = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.className = "status-badge";
    if (isRead) {
      statusSpan.className = "status-badge status-badge--completed";
      statusSpan.textContent = "مقروءة";
    } else {
      statusSpan.className = "status-badge status-badge--new";
      statusSpan.textContent = "غير مقروءة";
    }
    tdStatus.appendChild(statusSpan);
    tr.appendChild(tdStatus);

    // إجراءات
    const tdActions = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "table-actions";

    // زر العرض
    const viewBtn = document.createElement("button");
    viewBtn.className = "btn-ghost";
    viewBtn.type = "button";
    viewBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>';
    viewBtn.setAttribute("aria-label", "عرض التفاصيل");
    viewBtn.addEventListener("click", () => {
      // تعيين الرسالة كمقروءة تلقائياً عند فتحها
      if (!isRead) {
        updateDoc(doc(db, "orders", item.id), { read: true }).catch(() => {});
        item.read = true;
      }
      openModal(item);
    });

    // زر الحذف
    const delBtn = document.createElement("button");
    delBtn.className = "btn-danger";
    delBtn.type = "button";
    delBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
    delBtn.setAttribute("aria-label", "حذف");
    delBtn.addEventListener("click", () => openConfirm(item.id, getSenderName(item)));

    actionsDiv.appendChild(viewBtn);
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
    // جلب رسائل التواصل فقط (type == "contact")
    const q = query(
      collection(db, "orders"),
      where("type", "==", "contact"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("خطأ في جلب الرسائل:", error);
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
  messagesContent.style.display = "block";
}

requireAdmin({ loginUrl: "/login.html" })
  .then((user) => {
    document.body.style.visibility = "visible";
    return init(user);
  })
  .catch(() => {
    document.body.style.visibility = "visible";
  });
