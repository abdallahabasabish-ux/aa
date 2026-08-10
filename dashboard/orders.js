import { requireAuth } from "/js/auth-guard.js";
import { auth, db } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import {
  collection, query, where, orderBy, getDocs, Timestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const sidebar = document.getElementById("dashSidebar");
const overlay = document.getElementById("dashOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const ordersContent = document.getElementById("ordersContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerName = document.getElementById("headerName");

function openSidebar() { sidebar.classList.add("dash-sidebar--open"); overlay.classList.add("dash-overlay--visible"); document.body.style.overflow = "hidden"; }
function closeSidebar() { sidebar.classList.remove("dash-sidebar--open"); overlay.classList.remove("dash-overlay--visible"); document.body.style.overflow = ""; }
hamburger.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);
window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => { if (e.matches) closeSidebar(); });
logoutBtn.addEventListener("click", async () => { const r = await logout(); if (r.ok) window.location.replace("/login.html"); });

function formatDate(d) { if (!d) return "—"; const date = d instanceof Timestamp ? d.toDate() : new Date(d); return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }); }

const STATUS_MAP = { new: { label: "جديد", cls: "new" }, reviewing: { label: "قيد المراجعة", cls: "reviewing" }, contacted: { label: "تم التواصل", cls: "contacted" }, in_progress: { label: "قيد التنفيذ", cls: "in_progress" }, completed: { label: "مكتمل", cls: "completed" }, cancelled: { label: "ملغى", cls: "cancelled" } };

function getStatusBadge(s) { const info = STATUS_MAP[s] || { label: s || "—", cls: "cancelled" }; const span = document.createElement("span"); span.className = `status-badge status-badge--${info.cls}`; span.textContent = info.label; return span; }

function renderOrders(orders) {
  ordersContent.textContent = "";
  if (orders.length === 0) {
    const e = document.createElement("div"); e.className = "dash-empty";
    e.innerHTML = `<div class="dash-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg></div><div class="dash-empty-title">لا توجد طلبات</div><div class="dash-empty-desc">لم تُرسل أي طلبات بعد</div>`;
    ordersContent.appendChild(e); return;
  }

  const list = document.createElement("div"); list.className = "dash-order-list";
  orders.forEach((o) => {
    const item = document.createElement("div"); item.className = "dash-order-item";
    const num = document.createElement("span"); num.className = "dash-order-num"; num.textContent = o.orderNumber || o.id.slice(0, 8).toUpperCase();
    const title = document.createElement("span"); title.className = "dash-order-title"; title.textContent = o.title || "—";
    const date = document.createElement("span"); date.className = "dash-order-date"; date.textContent = formatDate(o.createdAt);
    const badge = getStatusBadge(o.status);
    item.append(num, title, date, badge); list.appendChild(item);
  });
  ordersContent.appendChild(list);
}

async function init(user) {
  const name = user.displayName || user.email || "مستخدم";
  headerName.textContent = name; headerAvatar.textContent = name.trim().charAt(0);
  try {
    const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    renderOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch { renderOrders([]); }
  pageLoader.style.display = "none"; ordersContent.style.display = "block";
}

requireAuth("/login.html").then((user) => { document.body.style.visibility = "visible"; return init(user); }).catch(() => {});
