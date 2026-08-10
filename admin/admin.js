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

const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("adminOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const dashContent = document.getElementById("dashboardContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerUserName = document.getElementById("headerUserName");
const ordersWrapper = document.getElementById("ordersTableWrapper");

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

const mql = window.matchMedia("(min-width: 1024px)");
mql.addEventListener("change", (e) => {
  if (e.matches) closeSidebar();
});

logoutBtn.addEventListener("click", async () => {
  const result = await logout();
  if (result.ok) {
    window.location.replace("/login.html");
  }
});

function formatDate(date) {
  if (!date) return "—";
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

const TYPE_MAP = {
  service: "خدمة",
  product: "منتج",
};
async function fetchStats() {
  const results = { services: 0, products: 0, newOrders: 0, customers: 0 };

  try {
    const snap = await getCountFromServer(
      query(collection(db, "services"), where("active", "==", true))
    );
    results.services = snap.data().count;
  } catch { /* مجموعة غير موجودة → 0 */ }

  try {
    const snap = await getCountFromServer(
      query(collection(db, "products"), where("active", "==", true))
    );
    results.products = snap.data().count;
  } catch { /* مجموعة غير موجودة → 0 */ }

  try {
    const snap = await getCountFromServer(
      query(collection(db, "orders"), where("status", "==", "new"))
    );
    results.newOrders = snap.data().count;
  } catch { /* مجموعة غير موجودة → 0 */ }

  try {
    const snap = await getCountFromServer(collection(db, "user_products"));
    results.customers = snap.data().count;
  } catch { /* مجموعة غير موجودة → 0 */ }

  return results;
}
function renderStats(stats) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val.toLocaleString("ar-EG");
  };

  setVal("statServices", stats.services);
  setVal("statProducts", stats.products);
  setVal("statNewOrders", stats.newOrders);
  setVal("statCustomers", stats.customers);
}
async function fetchRecentOrders() {
  try {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch {
    return [];
  }
}
function renderOrders(orders) {
  ordersWrapper.textContent = "";

  if (orders.length === 0) {
    ordersWrapper.appendChild(createEmptyState());
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const headers = ["رقم الطلب", "العميل", "النوع", "الحالة", "التاريخ"];
  headers.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  orders.forEach((order) => {
    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    const numSpan = document.createElement("span");
    numSpan.className = "order-number";
    numSpan.textContent = order.orderNumber || order.id.slice(0, 8);
    tdNum.appendChild(numSpan);
    tr.appendChild(tdNum);

    const tdCustomer = document.createElement("td");
    tdCustomer.textContent = order.customerName || "—";
    tr.appendChild(tdCustomer);

    const tdType = document.createElement("td");
    tdType.textContent = TYPE_MAP[order.type] || order.type || "—";
    tr.appendChild(tdType);

    const tdStatus = document.createElement("td");
    tdStatus.appendChild(getStatusBadge(order.status));
    tr.appendChild(tdStatus);

    const tdDate = document.createElement("td");
    tdDate.textContent = formatDate(order.createdAt);
    tr.appendChild(tdDate);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  ordersWrapper.appendChild(table);
}

function createEmptyState() {
  const div = document.createElement("div");
  div.className = "empty-state";

  const iconDiv = document.createElement("div");
  iconDiv.className = "empty-state-icon";
  iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>`;

  const title = document.createElement("div");
  title.className = "empty-state-title";
  title.textContent = "لا توجد طلبات بعد";

  const desc = document.createElement("div");
  desc.className = "empty-state-desc";
  desc.textContent = "ستظهر الطلبات الواردة هنا فور تسجيلها";

  div.appendChild(iconDiv);
  div.appendChild(title);
  div.appendChild(desc);

  return div;
}

function setUserInfo(user) {
  const name = user.displayName || user.email || "مدير";
  headerUserName.textContent = name;

  const initial = name.trim().charAt(0);
  headerAvatar.textContent = initial;
}

async function initDashboard(user) {
  setUserInfo(user);

  try {
    const [stats, orders] = await Promise.all([
      fetchStats(),
      fetchRecentOrders(),
    ]);

    renderStats(stats);
    renderOrders(orders);

    pageLoader.style.display = "none";
    dashContent.style.display = "block";
  } catch (error) {
    pageLoader.style.display = "none";
    dashContent.style.display = "block";

    renderStats({ services: 0, products: 0, newOrders: 0, customers: 0 });
    renderOrders([]);
  }
}
requireAdmin({
  loginUrl: "/login.html",
})
  .then((user) => {
    document.body.style.visibility = "visible";
    return initDashboard(user);
  })
  .catch(() => {
  });
