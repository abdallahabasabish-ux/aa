import { requireAuth } from "/js/auth-guard.js";
import { auth, db } from "/js/firebase-init.js";
import { logout } from "/js/auth.js";
import { isSafeUrl } from "/js/security.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// DOM
const sidebar = document.getElementById("dashSidebar");
const overlay = document.getElementById("dashOverlay");
const hamburger = document.getElementById("hamburgerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pageLoader = document.getElementById("pageLoader");
const mainContent = document.getElementById("mainContent");
const headerAvatar = document.getElementById("headerAvatar");
const headerName = document.getElementById("headerName");
const welcomeTitle = document.getElementById("welcomeTitle");
const productsArea = document.getElementById("productsArea");
const ordersArea = document.getElementById("ordersArea");

// Sidebar
function openSidebar() {
  sidebar.classList.add("dash-sidebar--open");
  overlay.classList.add("dash-overlay--visible");
  document.body.style.overflow = "hidden";
}
function closeSidebar() {
  sidebar.classList.remove("dash-sidebar--open");
  overlay.classList.remove("dash-overlay--visible");
  document.body.style.overflow = "";
}
hamburger.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);
window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => { if (e.matches) closeSidebar(); });

logoutBtn.addEventListener("click", async () => {
  const r = await logout();
  if (r.ok) window.location.replace("/login.html");
});

// Helpers
function formatDate(d) {
  if (!d) return "—";
  const date = d instanceof Timestamp ? d.toDate() : new Date(d);
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
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

// Render Products
function renderProducts(products) {
  productsArea.textContent = "";
  if (products.length === 0) {
    const empty = document.createElement("div");
    empty.className = "dash-empty";
    empty.innerHTML = `<div class="dash-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg></div><div class="dash-empty-title">لا توجد منتجات بعد</div><div class="dash-empty-desc">ستظهر المنتجات التي اشتريتها هنا</div>`;
    productsArea.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "dash-products-grid";

  products.forEach((p) => {
    const card = document.createElement("div");
    card.className = "dash-product-card";

    const thumb = document.createElement("div");
    thumb.className = "dash-product-thumb";
    if (p.productImage && isSafeUrl(p.productImage)) {
      const img = document.createElement("img");
      img.src = p.productImage;
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v12c0 .414.336.75.75.75Z"/></svg>`;
    }

    const info = document.createElement("div");
    info.className = "dash-product-info";

    const name = document.createElement("div");
    name.className = "dash-product-name";
    name.textContent = p.productTitle || "—";
    info.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "dash-product-meta";

    if (p.version) {
      const ver = document.createElement("span");
      ver.className = "dash-product-version";
      ver.textContent = "v" + p.version;
      meta.appendChild(ver);
    }

    if (p.purchaseDate) {
      const date = document.createElement("span");
      date.textContent = formatDate(p.purchaseDate);
      meta.appendChild(date);
    }

    info.appendChild(meta);
    card.appendChild(thumb);
    card.appendChild(info);
    grid.appendChild(card);
  });

  productsArea.appendChild(grid);
}

// Render Orders
function renderOrders(orders) {
  ordersArea.textContent = "";
  if (orders.length === 0) {
    const empty = document.createElement("div");
    empty.className = "dash-empty";
    empty.innerHTML = `<div class="dash-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg></div><div class="dash-empty-title">لا توجد طلبات</div><div class="dash-empty-desc">ستظهر طلباتك هنا بعد إرسالها</div>`;
    ordersArea.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "dash-order-list";

  orders.forEach((o) => {
    const item = document.createElement("div");
    item.className = "dash-order-item";

    const num = document.createElement("span");
    num.className = "dash-order-num";
    num.textContent = o.orderNumber || o.id.slice(0, 8).toUpperCase();

    const title = document.createElement("span");
    title.className = "dash-order-title";
    title.textContent = o.title || "—";

    const date = document.createElement("span");
    date.className = "dash-order-date";
    date.textContent = formatDate(o.createdAt);

    const badge = getStatusBadge(o.status);

    item.appendChild(num);
    item.appendChild(title);
    item.appendChild(date);
    item.appendChild(badge);
    list.appendChild(item);
  });

  ordersArea.appendChild(list);
}

// Fetch
async function fetchUserProducts(uid) {
  try {
    const q = query(collection(db, "user_products"), where("userId", "==", uid), orderBy("purchaseDate", "desc"), limit(4));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch { return []; }
}

async function fetchUserOrders(uid) {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(5));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function fetchFavoritesCount(uid) {
  try {
    const snap = await getDocs(query(collection(db, "favorites"), where("userId", "==", uid)));
    return snap.size;
  } catch { return 0; }
}

// Init
async function init(user) {
  const name = user.displayName || user.email || "مستخدم";
  headerName.textContent = name;
  headerAvatar.textContent = name.trim().charAt(0);
  welcomeTitle.textContent = `مرحبًا، ${name.split(" ")[0]}`;

  const [products, orders, favCount] = await Promise.all([
    fetchUserProducts(user.uid),
    fetchUserOrders(user.uid),
    fetchFavoritesCount(user.uid),
  ]);

  document.getElementById("statProducts").textContent = products.length;
  document.getElementById("statOrders").textContent = orders.length;
  document.getElementById("statFavorites").textContent = favCount;

  renderProducts(products);
  renderOrders(orders);

  pageLoader.style.display = "none";
  mainContent.style.display = "block";
}

requireAuth("/login.html")
  .then((user) => {
    document.body.style.visibility = "visible";
    return init(user);
  })
  .catch(() => {});
