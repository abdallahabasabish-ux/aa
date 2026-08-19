/**
 * admin.js — لوحة التحكم الرئيسية (محسّنة)
 * تعرض إحصائيات حقيقية باستخدام getCountFromServer
 * لا يتطلب فهارس مركبة — يستخدم فهارس أحادية فقط
 */

import { requireAdmin } from "/js/auth-guard.js";
import { auth, db } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  getDocs,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ===============================
// DOM
// ===============================
const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("adminOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const dashContent = document.getElementById("dashboardContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const ordersWrapper = document.getElementById("ordersTableWrapper");
const refreshBtn = document.getElementById("refreshStatsBtn");

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
function formatDate(date) {
  if (!date) return "—";
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_MAP = {
  new: { label: "جديد", cls: "new" },
  reviewing: { label: "قيد المراجعة", cls: "reviewing" },
  contacted: { label: "تم التواصل", cls: "contacted" },
  in_progress: { label: "قيد التنفيذ", cls: "in_progress" },
  completed: { label: "مكتمل", cls: "completed" },
  cancelled: { label: "ملغى", cls: "cancelled" },
};

function getStatusBadge(status) {
  const s = STATUS_MAP[status] || { label: status || "—", cls: "cancelled" };
  const span = document.createElement("span");
  span.className = `status-badge status-badge--${s.cls}`;
  span.textContent = s.label;
  return span;
}

// ===============================
// Fetch Stats (بدون فهارس مركبة)
// ===============================
async function fetchStats() {
  const results = {
    services: 0,
    products: 0,
    newOrders: 0,
    unreadMessages: 0,
  };

  // 1. الخدمات النشطة
  try {
    const snap = await getCountFromServer(
      query(collection(db, "services"), where("active", "==", true))
    );
    results.services = snap.data().count;
  } catch (e) {
    console.warn("فشل جلب عدد الخدمات:", e);
  }

  // 2. المنتجات النشطة
  try {
    const snap = await getCountFromServer(
      query(collection(db, "products"), where("active", "==", true))
    );
    results.products = snap.data().count;
  } catch (e) {
    console.warn("فشل جلب عدد المنتجات:", e);
  }

  // 3. الطلبات الجديدة (status == "new")
  try {
    const snap = await getCountFromServer(
      query(collection(db, "orders"), where("status", "==", "new"))
    );
    results.newOrders = snap.data().count;
  } catch (e) {
    console.warn("فشل جلب عدد الطلبات الجديدة:", e);
  }

  // 4. الرسائل غير المقروءة — بطريقة لا تحتاج فهرساً مركباً
  //    نحسب: (جميع رسائل contact) - (رسائل contact المقروءة)
  try {
    // جميع رسائل contact
    const totalContactSnap = await getCountFromServer(
      query(collection(db, "orders"), where("type", "==", "contact"))
    );
    const totalContact = totalContactSnap.data().count;

    // رسائل contact المقروءة
    const readContactSnap = await getCountFromServer(
      query(collection(db, "orders"), where("type", "==", "contact"), where("read", "==", true))
    );
    const readContact = readContactSnap.data().count;

    results.unreadMessages = Math.max(0, totalContact - readContact);
  } catch (e) {
    console.warn("فشل جلب عدد الرسائل غير المقروءة:", e);
    results.unreadMessages = 0;
  }

  return results;
}

// ===============================
// Fetch Recent Orders (جميع الطلبات، آخر 5)
// ===============================
async function fetchRecentOrders() {
  try {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn("فشل جلب الطلبات الأخيرة:", e);
    return [];
  }
}

// ===============================
// Render
// ===============================
function renderStats(stats) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val.toLocaleString("ar-EG");
  };
  setVal("statServices", stats.services);
  setVal("statProducts", stats.products);
  setVal("statNewOrders", stats.newOrders);
  setVal("statUnreadMessages", stats.unreadMessages);
}

function renderOrders(orders) {
  ordersWrapper.textContent = "";
  if (orders.length === 0) {
    ordersWrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg></div>
        <div class="empty-state-title">لا توجد طلبات بعد</div>
        <div class="empty-state-desc">ستظهر الطلبات الواردة هنا فور تسجيلها</div>
      </div>
    `;
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>رقم الطلب</th><th>العميل</th><th>النوع</th><th>الحالة</th><th>التاريخ</th></tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  orders.forEach((order) => {
    const normalized = {
      ...order,
      customerName: order.customerName || order.name || order.customer?.name || "—",
      type: order.type || (order.service ? "service" : order.product ? "product" : "contact"),
      status: order.status || "new",
    };
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="order-number">${order.orderNumber || order.id.slice(0, 8)}</span></td>
      <td>${normalized.customerName}</td>
      <td>${normalized.type === "contact" ? "رسالة" : normalized.type === "service" ? "خدمة" : "منتج"}</td>
      <td></td>
      <td>${formatDate(order.createdAt)}</td>
    `;
    const statusTd = tr.querySelectorAll("td")[3];
    statusTd.appendChild(getStatusBadge(order.status));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  ordersWrapper.appendChild(table);
}

// ===============================
// Load All Data
// ===============================
async function loadDashboard() {
  try {
    const [stats, orders] = await Promise.all([
      fetchStats(),
      fetchRecentOrders(),
    ]);
    renderStats(stats);
    renderOrders(orders);
  } catch (error) {
    console.error("خطأ في تحميل لوحة التحكم:", error);
    renderStats({ services: 0, products: 0, newOrders: 0, unreadMessages: 0 });
    renderOrders([]);
  }
  pageLoader.style.display = "none";
  dashContent.style.display = "block";
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
  await loadDashboard();

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = "جاري التحديث...";
      await loadDashboard();
      refreshBtn.disabled = false;
      refreshBtn.textContent = "تحديث";
    });
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
