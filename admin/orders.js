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
  updateDoc,
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
const ordersContent = document.getElementById("ordersContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const searchInput = document.getElementById("searchInput");
const filterBar = document.getElementById("filterBar");
const tableWrapper = document.getElementById("ordersTableWrapper");

// Modal
const modalOverlay = document.getElementById("modalOverlay");
const orderModal = document.getElementById("orderModal");
const modalTitleText = document.getElementById("modalTitleText");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const orderDetailBody = document.getElementById("orderDetailBody");
const orderDetailFooter = document.getElementById("orderDetailFooter");

// -----------------------------------------------
// State
// -----------------------------------------------
let allOrders = [];
let activeFilter = "all";
let currentOrderId = null;

// -----------------------------------------------
// Maps
// -----------------------------------------------
const STATUS_MAP = {
  new: { label: "جديد", cls: "new", order: 0 },
  reviewing: { label: "قيد المراجعة", cls: "reviewing", order: 1 },
  contacted: { label: "تم التواصل", cls: "contacted", order: 2 },
  in_progress: { label: "قيد التنفيذ", cls: "in_progress", order: 3 },
  completed: { label: "مكتمل", cls: "completed", order: 4 },
  cancelled: { label: "ملغى", cls: "cancelled", order: 5 },
};

const TYPE_MAP = {
  service: "خدمة",
  product: "منتج",
};

const CURRENCY_MAP = { EGP: "ج.م", USD: "$", SAR: "ر.س", AED: "د.إ" };

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
// Helpers
// -----------------------------------------------
function formatDate(date) {
  if (!date) return "—";
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(date) {
  if (!date) return "—";
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getStatusBadge(status) {
  const s = STATUS_MAP[status] || { label: status || "—", cls: "cancelled" };
  const span = document.createElement("span");
  span.className = `status-badge status-badge--${s.cls}`;
  span.textContent = s.label;
  return span;
}

function getOrderNumber(order) {
  return order.orderNumber || order.id.slice(0, 8).toUpperCase();
}

// -----------------------------------------------
// Filter Counts
// -----------------------------------------------
function getCounts() {
  const counts = { all: allOrders.length };
  for (const key of Object.keys(STATUS_MAP)) {
    counts[key] = allOrders.filter((o) => o.status === key).length;
  }
  return counts;
}

function renderFilters() {
  filterBar.textContent = "";
  const counts = getCounts();

  // "الكل" chip
  const allChip = createFilterChip("all", "الكل", counts.all);
  filterBar.appendChild(allChip);

  // Status chips — مرتبة حسب ترتيب الحالة
  const sorted = Object.entries(STATUS_MAP).sort((a, b) => a[1].order - b[1].order);
  for (const [key, val] of sorted) {
    const chip = createFilterChip(key, val.label, counts[key]);
    filterBar.appendChild(chip);
  }
}

function createFilterChip(key, label, count) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `filter-chip${activeFilter === key ? " filter-chip--active" : ""}`;
  btn.setAttribute("aria-pressed", activeFilter === key ? "true" : "false");

  const text = document.createElement("span");
  text.textContent = label;
  btn.appendChild(text);

  const countSpan = document.createElement("span");
  countSpan.className = "chip-count";
  countSpan.textContent = count;
  btn.appendChild(countSpan);

  btn.addEventListener("click", () => {
    activeFilter = key;
    renderFilters();
    renderTable();
  });

  return btn;
}

// -----------------------------------------------
// Search
// -----------------------------------------------
searchInput.addEventListener("input", () => {
  renderTable();
});

// -----------------------------------------------
// Render Table
// -----------------------------------------------
function getFilteredOrders() {
  let filtered = allOrders;

  // فلتر الحالة
  if (activeFilter !== "all") {
    filtered = filtered.filter((o) => o.status === activeFilter);
  }

  // فلتر البحث
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(
      (o) =>
        (o.customerName || "").toLowerCase().includes(q) ||
        (o.customerEmail || "").toLowerCase().includes(q) ||
        getOrderNumber(o).toLowerCase().includes(q) ||
        (o.title || "").toLowerCase().includes(q)
    );
  }

  return filtered;
}

function renderTable() {
  tableWrapper.textContent = "";
  const orders = getFilteredOrders();

  if (orders.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-state-icon";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>`;

    const title = document.createElement("div");
    title.className = "empty-state-title";
    const isSearch = searchInput.value.trim() || activeFilter !== "all";
    title.textContent = isSearch ? "لا توجد نتائج" : "لا توجد طلبات بعد";

    const desc = document.createElement("div");
    desc.className = "empty-state-desc";
    desc.textContent = isSearch ? "جرّب فلتر أو بحث مختلف" : "ستظهر الطلبات الواردة هنا فور تسجيلها";

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
  ["رقم الطلب", "العميل", "النوع", "الموضوع", "الميزانية", "الحالة", "التاريخ", ""].forEach((t) => {
    const th = document.createElement("th");
    th.textContent = t;
    hRow.appendChild(th);
  });
  thead.appendChild(hRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  orders.forEach((order) => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.addEventListener("click", (e) => {
      // لا تفتح التفاصيل عند الضغط على أزرار الإجراءات
      if (e.target.closest(".table-actions")) return;
      openDetail(order.id);
    });

    // رقم الطلب
    const tdNum = document.createElement("td");
    const numSpan = document.createElement("span");
    numSpan.className = "order-number";
    numSpan.textContent = getOrderNumber(order);
    tdNum.appendChild(numSpan);
    tr.appendChild(tdNum);

    // العميل
    const tdCustomer = document.createElement("td");
    tdCustomer.textContent = order.customerName || "—";
    tr.appendChild(tdCustomer);

    // النوع
    const tdType = document.createElement("td");
    const typeBadge = document.createElement("span");
    typeBadge.className = `order-type-badge order-type-badge--${order.type || "service"}`;
    typeBadge.textContent = TYPE_MAP[order.type] || order.type || "—";
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    // الموضوع
    const tdTitle = document.createElement("td");
    tdTitle.textContent = order.title || "—";
    tdTitle.style.maxWidth = "200px";
    tdTitle.style.overflow = "hidden";
    tdTitle.style.textOverflow = "ellipsis";
    tr.appendChild(tdTitle);

    // الميزانية
    const tdBudget = document.createElement("td");
    if (order.budget && order.budget > 0) {
      const budgetSpan = document.createElement("span");
      budgetSpan.className = "budget-display";
      budgetSpan.textContent = order.budget.toLocaleString("ar-EG");
      const curr = document.createElement("span");
      curr.className = "price-currency";
      curr.textContent = CURRENCY_MAP[order.currency] || order.currency || "";
      tdBudget.appendChild(budgetSpan);
      tdBudget.appendChild(curr);
    } else {
      const empty = document.createElement("span");
      empty.className = "budget-display budget-display--empty";
      empty.textContent = "—";
      tdBudget.appendChild(empty);
    }
    tr.appendChild(tdBudget);

    // الحالة
    const tdStatus = document.createElement("td");
    tdStatus.appendChild(getStatusBadge(order.status));
    tr.appendChild(tdStatus);

    // التاريخ
    const tdDate = document.createElement("td");
    tdDate.textContent = formatDate(order.createdAt);
    tr.appendChild(tdDate);

    // إجراءات
    const tdActions = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "table-actions";

    const viewBtn = document.createElement("button");
    viewBtn.className = "btn-ghost";
    viewBtn.type = "button";
    viewBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>`;
    viewBtn.setAttribute("aria-label", "عرض التفاصيل");
    viewBtn.addEventListener("click", (e) => { e.stopPropagation(); openDetail(order.id); });

    actionsDiv.appendChild(viewBtn);
    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
}

// -----------------------------------------------
// Order Detail Modal
// -----------------------------------------------
function openModal() {
  modalOverlay.style.display = "block";
  requestAnimationFrame(() => {
    modalOverlay.classList.add("admin-modal-overlay--visible");
    orderModal.classList.add("admin-modal--open");
  });
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.classList.remove("admin-modal-overlay--visible");
  orderModal.classList.remove("admin-modal--open");
  setTimeout(() => {
    modalOverlay.style.display = "none";
    document.body.style.overflow = "";
  }, 220);
  currentOrderId = null;
}

modalCloseBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && orderModal.classList.contains("admin-modal--open")) closeModal();
});

function openDetail(orderId) {
  const order = allOrders.find((o) => o.id === orderId);
  if (!order) return;

  currentOrderId = orderId;
  modalTitleText.textContent = `طلب #${getOrderNumber(order)}`;

  renderDetailContent(order);
  renderDetailFooter(order);
  openModal();
}

function renderDetailContent(order) {
  orderDetailBody.textContent = "";

  // === معلومات العميل ===
  const customerSection = document.createElement("div");
  customerSection.className = "detail-section";

  const customerTitle = document.createElement("div");
  customerTitle.className = "detail-section-title";
  customerTitle.textContent = "معلومات العميل";
  customerSection.appendChild(customerTitle);

  const customerGrid = document.createElement("div");
  customerGrid.className = "detail-grid";

  customerGrid.appendChild(createDetailItem("الاسم", order.customerName));
  customerGrid.appendChild(createDetailItem("البريد", order.customerEmail));

  const phoneVal = order.customerPhone || null;
  customerGrid.appendChild(createDetailItem("الهاتف", phoneVal));

  const websiteVal = order.websiteUrl && isSafeUrl(order.websiteUrl) ? order.websiteUrl : null;
  const websiteItem = createDetailItem("الموقع", websiteVal);
  if (websiteVal) {
    const valEl = websiteItem.querySelector(".detail-value");
    valEl.className = "detail-value detail-value--link";
    valEl.textContent = websiteVal;
  }
  customerGrid.appendChild(websiteItem);

  customerSection.appendChild(customerGrid);
  orderDetailBody.appendChild(customerSection);

  // === تفاصيل الطلب ===
  const orderSection = document.createElement("div");
  orderSection.className = "detail-section";

  const orderTitle = document.createElement("div");
  orderTitle.className = "detail-section-title";
  orderTitle.textContent = "تفاصيل الطلب";
  orderSection.appendChild(orderTitle);

  const orderGrid = document.createElement("div");
  orderGrid.className = "detail-grid";

  orderGrid.appendChild(createDetailItem("رقم الطلب", getOrderNumber(order)));
  orderGrid.appendChild(createDetailItem("النوع", TYPE_MAP[order.type] || order.type || "—"));

  const titleItem = createDetailItem("الموضوع", order.title);
  titleItem.classList.add("detail-item--full");
  orderGrid.appendChild(titleItem);

  if (order.budget && order.budget > 0) {
    const budgetText = `${order.budget.toLocaleString("ar-EG")} ${CURRENCY_MAP[order.currency] || order.currency || ""}`;
    orderGrid.appendChild(createDetailItem("الميزانية", budgetText));
  }

  orderGrid.appendChild(createDetailItem("تاريخ الطلب", formatDateTime(order.createdAt)));

  if (order.completedAt) {
    orderGrid.appendChild(createDetailItem("تاريخ الإنجاز", formatDateTime(order.completedAt)));
  }

  orderSection.appendChild(orderGrid);
  orderDetailBody.appendChild(orderSection);

  // === تفاصيل إضافية ===
  if (order.details) {
    const detailsSection = document.createElement("div");
    detailsSection.className = "detail-section";

    const detailsTitle = document.createElement("div");
    detailsTitle.className = "detail-section-title";
    detailsTitle.textContent = "التفاصيل";
    detailsSection.appendChild(detailsTitle);

    const detailsVal = document.createElement("div");
    detailsVal.className = "detail-value detail-value--muted";
    detailsVal.style.whiteSpace = "pre-wrap";
    detailsVal.textContent = order.details;
    detailsSection.appendChild(detailsVal);
    orderDetailBody.appendChild(detailsSection);
  }

  // === ملاحظة العميل ===
  if (order.customerNote) {
    const noteSection = document.createElement("div");
    noteSection.className = "detail-section";

    const noteTitle = document.createElement("div");
    noteTitle.className = "detail-section-title";
    noteTitle.textContent = "ملاحظة العميل";
    noteSection.appendChild(noteTitle);

    const noteBlock = document.createElement("div");
    noteBlock.className = "customer-note-block";
    noteBlock.textContent = order.customerNote;
    noteSection.appendChild(noteBlock);
    orderDetailBody.appendChild(noteSection);
  }

  // === ملاحظة إدارية ===
  const adminNoteSection = document.createElement("div");
  adminNoteSection.className = "detail-section";

  const adminNoteTitle = document.createElement("div");
  adminNoteTitle.className = "detail-section-title";
  adminNoteTitle.textContent = "ملاحظة إدارية";
  adminNoteSection.appendChild(adminNoteTitle);

  const noteArea = document.createElement("div");
  noteArea.className = "admin-note-area";

  const noteTextarea = document.createElement("textarea");
  noteTextarea.className = "admin-note-textarea";
  noteTextarea.id = "adminNoteInput";
  noteTextarea.placeholder = "أضف ملاحظة إدارية خاصة (لا تظهر للعميل)...";
  noteTextarea.value = order.adminNote || "";
  noteArea.appendChild(noteTextarea);

  adminNoteSection.appendChild(noteArea);
  orderDetailBody.appendChild(adminNoteSection);

  // === سجل الحالة ===
  const timelineSection = document.createElement("div");
  timelineSection.className = "detail-section";

  const timelineTitle = document.createElement("div");
  timelineTitle.className = "detail-section-title";
  timelineTitle.textContent = "سجل الحالة";
  timelineSection.appendChild(timelineTitle);

  const timeline = document.createElement("div");
  timeline.className = "status-timeline";

  const sortedStatuses = Object.entries(STATUS_MAP).sort((a, b) => a[1].order - b[1].order);
  const currentOrder = STATUS_MAP[order.status]?.order ?? 99;

  for (const [key, val] of sortedStatuses) {
    const step = document.createElement("div");
    const isDone = val.order <= currentOrder && order.status !== "cancelled";
    const isCurrent = key === order.status;

    if (isDone || isCurrent) {
      step.className = "status-step status-step--done";
    } else {
      step.className = "status-step";
    }

    const dot = document.createElement("div");
    dot.className = "status-dot";
    dot.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`;

    const info = document.createElement("div");
    info.className = "status-info";

    const label = document.createElement("div");
    label.className = "status-info-label";
    label.textContent = val.label;

    info.appendChild(label);

    // إذا كانت الحالة الحالية، أظهر التاريخ
    if (isCurrent && order.createdAt) {
      const time = document.createElement("div");
      time.className = "status-info-time";
      time.textContent = formatDateTime(order.createdAt);
      info.appendChild(time);
    }

    step.appendChild(dot);
    step.appendChild(info);
    timeline.appendChild(step);
  }

  timelineSection.appendChild(timeline);
  orderDetailBody.appendChild(timelineSection);
}

function renderDetailFooter(order) {
  orderDetailFooter.textContent = "";

  // تحديث الحالة
  const statusGroup = document.createElement("div");
  statusGroup.className = "status-select-group";

  const label = document.createElement("label");
  label.textContent = "تحديث الحالة:";
  label.setAttribute("for", "statusSelect");
  statusGroup.appendChild(label);

  const select = document.createElement("select");
  select.className = "status-select";
  select.id = "statusSelect";

  for (const [key, val] of Object.entries(STATUS_MAP)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = val.label;
    if (key === order.status) opt.selected = true;
    select.appendChild(opt);
  }

  statusGroup.appendChild(select);

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-primary";
  saveBtn.type = "button";
  saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg><span class="btn-text">حفظ التحديثات</span>`;
  saveBtn.style.marginInlineStart = "auto";

  const loader = document.createElement("span");
  loader.style.cssText = "display:none;width:16px;height:16px;border:2px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;animation:admin-spin .6s linear infinite;flex-shrink:0";
  saveBtn.appendChild(loader);

  saveBtn.addEventListener("click", async () => {
    const newStatus = select.value;
    const adminNote = document.getElementById("adminNoteInput").value.trim();

    saveBtn.disabled = true;
    saveBtn.querySelector(".btn-text").style.display = "none";
    loader.style.display = "block";

    try {
      const updateData = {
        status: newStatus,
        adminNote: adminNote,
        updatedAt: serverTimestamp(),
      };

      // إذا اكتمل الطلب
      if (newStatus === "completed" && order.status !== "completed") {
        updateData.completedAt = serverTimestamp();
      }
      // إذا أُلغي أو أُعيد لغير مكتمل
      if (newStatus !== "completed") {
        updateData.completedAt = null;
      }

      await updateDoc(doc(db, "orders", order.id), updateData);

      // تحديث في الذاكرة
      const idx = allOrders.findIndex((o) => o.id === order.id);
      if (idx !== -1) {
        allOrders[idx] = {
          ...allOrders[idx],
          status: newStatus,
          adminNote: adminNote,
          updatedAt: new Date(),
          completedAt: newStatus === "completed" ? new Date() : null,
        };
      }

      renderFilters();
      renderTable();
      closeModal();
    } catch {
      alert("حدث خطأ أثناء حفظ التحديثات.");
    }

    saveBtn.disabled = false;
    saveBtn.querySelector(".btn-text").style.display = "";
    loader.style.display = "none";
  });

  orderDetailFooter.appendChild(statusGroup);
  orderDetailFooter.appendChild(saveBtn);
}

// -----------------------------------------------
// Detail Helpers
// -----------------------------------------------
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

// -----------------------------------------------
// Fetch Orders
// -----------------------------------------------
async function fetchOrders() {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
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

  allOrders = await fetchOrders();
  renderFilters();
  renderTable();

  pageLoader.style.display = "none";
  ordersContent.style.display = "block";

  // فتح طلب محدد إذا وُجد ?id=xxx
  const params = new URLSearchParams(location.search);
  const orderId = params.get("id");
  if (orderId) {
    openDetail(orderId);
  }
}

requireAdmin({ loginUrl: "/login.html" })
  .then((user) => {
    document.body.style.visibility = "visible";
    return init(user);
  })
  .catch(() => {});
