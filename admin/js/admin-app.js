// admin/js/admin-app.js
// ================================================================
// الملف الرئيسي لتطبيق لوحة الإدارة
// يحتوي على: التنقل بين الصفحات، عرض لوحة التحكم، نظام الإشعارات (Toast)
// ================================================================

import { checkAdminAuth } from './auth-admin.js';

// ===== المتغيرات العامة =====
let currentPage = 'dashboard';

// ===== دالة التنقل بين الصفحات =====
export function navigateTo(page) {
    currentPage = page;

    // تحديث القائمة الجانبية (إزالة الـ active من الكل وإضافته للصفحة الحالية)
    document.querySelectorAll('.sidebar-nav ul li').forEach(el => el.classList.remove('active'));
    const activeMenuItem = document.querySelector(`.sidebar-nav ul li[data-page="${page}"]`);
    if (activeMenuItem) activeMenuItem.classList.add('active');

    // تحديث عنوان الصفحة
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = activeMenuItem ? activeMenuItem.textContent.trim() : page;
    }

    // الحاوية التي سيتم عرض المحتوى فيها
    const container = document.getElementById('dynamicContent');

    // ===== التوجيه حسب الصفحة =====
    switch (page) {
        case 'dashboard':
            renderDashboard(container);
            break;

        case 'services':
            import('./crud-services.js')
                .then(module => module.renderServices(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل الخدمات: ${err.message}</div>`;
                });
            break;

        case 'templates':
            import('./crud-templates.js')
                .then(module => module.renderTemplates(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل القوالب: ${err.message}</div>`;
                });
            break;

        case 'products':
            import('./crud-products.js')
                .then(module => module.renderProducts(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل المنتجات: ${err.message}</div>`;
                });
            break;

        case 'portfolio':
            import('./crud-portfolio.js')
                .then(module => module.renderPortfolio(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل الأعمال: ${err.message}</div>`;
                });
            break;

        case 'posts':
            import('./crud-posts.js')
                .then(module => module.renderPosts(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل المقالات: ${err.message}</div>`;
                });
            break;

        case 'orders':
            import('./crud-orders.js')
                .then(module => module.renderOrders(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل الطلبات: ${err.message}</div>`;
                });
            break;

        case 'users':
            import('./crud-users.js')
                .then(module => module.renderUsers(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل العملاء: ${err.message}</div>`;
                });
            break;

        case 'reviews':
            import('./crud-reviews.js')
                .then(module => module.renderReviews(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل التقييمات: ${err.message}</div>`;
                });
            break;

        case 'settings':
            import('./crud-settings.js')
                .then(module => module.renderSettings(container))
                .catch(err => {
                    container.innerHTML = `<div class="error-state">⚠️ فشل تحميل الإعدادات: ${err.message}</div>`;
                });
            break;

        default:
            container.innerHTML = `
                <div style="text-align:center;padding:4rem 0;color:var(--gray-500);">
                    <i class="fas fa-code" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
                    <h3>جاري التطوير...</h3>
                    <p>هذه الصفحة قيد الإعداد</p>
                </div>
            `;
    }
}

// ===== لوحة التحكم (Dashboard) =====
function renderDashboard(container) {
    container.innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <h3>الخدمات</h3>
                <div class="number" id="statServices">0</div>
            </div>
            <div class="stat-card">
                <h3>القوالب</h3>
                <div class="number" id="statTemplates">0</div>
            </div>
            <div class="stat-card">
                <h3>المنتجات</h3>
                <div class="number" id="statProducts">0</div>
            </div>
            <div class="stat-card">
                <h3>المشاريع</h3>
                <div class="number" id="statPortfolio">0</div>
            </div>
            <div class="stat-card">
                <h3>الطلبات</h3>
                <div class="number" id="statOrders">0</div>
            </div>
            <div class="stat-card">
                <h3>التقييمات المعلقة</h3>
                <div class="number" id="statReviews">0</div>
            </div>
            <div class="stat-card">
                <h3>المقالات</h3>
                <div class="number" id="statPosts">0</div>
            </div>
            <div class="stat-card">
                <h3>العملاء</h3>
                <div class="number" id="statUsers">0</div>
            </div>
        </div>
        <div style="background:white;padding:2rem;border-radius:var(--radius);box-shadow:var(--shadow);">
            <h3 style="margin-bottom:0.5rem;">مرحباً بك في لوحة الإدارة</h3>
            <p style="color:var(--gray-500);">اختر أحد الأقسام من القائمة الجانبية لإدارة المحتوى.</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1.5rem;">
                <a href="#" onclick="window.navigateTo('services')" class="btn btn-primary-sm">إدارة الخدمات</a>
                <a href="#" onclick="window.navigateTo('templates')" class="btn btn-primary-sm">إدارة القوالب</a>
                <a href="#" onclick="window.navigateTo('orders')" class="btn btn-primary-sm">عرض الطلبات</a>
                <a href="#" onclick="window.navigateTo('settings')" class="btn btn-primary-sm">الإعدادات</a>
            </div>
        </div>
    `;

    // جلب الإحصائيات من Firestore
    loadStats();
}

// ===== جلب الإحصائيات =====
async function loadStats() {
    try {
        const { db } = window.__admin;
        const { collection, getCountFromServer } = await import('firebase/firestore');

        // جلب عدد الخدمات
        const servicesCount = await getCountFromServer(collection(db, "services"));
        document.getElementById('statServices').textContent = servicesCount.data().count || 0;

        const templatesCount = await getCountFromServer(collection(db, "templates"));
        document.getElementById('statTemplates').textContent = templatesCount.data().count || 0;

        const productsCount = await getCountFromServer(collection(db, "products"));
        document.getElementById('statProducts').textContent = productsCount.data().count || 0;

        const portfolioCount = await getCountFromServer(collection(db, "portfolio"));
        document.getElementById('statPortfolio').textContent = portfolioCount.data().count || 0;

        const ordersCount = await getCountFromServer(collection(db, "orders"));
        document.getElementById('statOrders').textContent = ordersCount.data().count || 0;

        const postsCount = await getCountFromServer(collection(db, "posts"));
        document.getElementById('statPosts').textContent = postsCount.data().count || 0;

        const usersCount = await getCountFromServer(collection(db, "users"));
        document.getElementById('statUsers').textContent = usersCount.data().count || 0;

        // التقييمات المعلقة
        const { query, where } = await import('firebase/firestore');
        const pendingReviewsQuery = query(collection(db, "reviews"), where("status", "==", "pending"));
        const pendingReviews = await getCountFromServer(pendingReviewsQuery);
        document.getElementById('statReviews').textContent = pendingReviews.data().count || 0;

    } catch (e) {
        console.warn('فشل في تحميل الإحصائيات:', e);
    }
}

// ===== نظام الإشعارات (Toast) =====
export function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    // أيقونة حسب النوع
    const icon = document.createElement('span');
    icon.style.marginLeft = '0.5rem';
    if (type === 'success') icon.innerHTML = '✅';
    else if (type === 'error') icon.innerHTML = '❌';
    else icon.innerHTML = 'ℹ️';
    toast.prepend(icon);

    container.appendChild(toast);

    // إزالة الإشعار بعد 4 ثوانٍ
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ================================================================
// أحداث التنقل من القائمة الجانبية
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // أحداث النقر على عناصر القائمة
    document.querySelectorAll('.sidebar-nav ul li[data-page]').forEach(el => {
        el.addEventListener('click', () => {
            const page = el.getAttribute('data-page');
            navigateTo(page);
            // إغلاق القائمة الجانبية في الشاشات الصغيرة
            document.getElementById('sidebar')?.classList.remove('open');
        });
    });

    // زر فتح/إغلاق القائمة الجانبية (للشاشات الصغيرة)
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });

    // جعل دالة navigateTo متاحة عالمياً للاستخدام من داخل HTML (مثلاً أزرار dashboard)
    window.navigateTo = navigateTo;

    // التحقق من صلاحية المشرف
    checkAdminAuth().then(user => {
        if (user) {
            // تحميل الصفحة الافتراضية
            navigateTo('dashboard');
        }
    });
});

// ===== إضافة دالة مساعدة لتحديث حالة التحميل =====
export function setLoading(container, show = true) {
    if (show) {
        container.innerHTML = `
            <div class="loading-spinner" style="text-align:center;padding:3rem 0;">
                <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i>
                <p style="margin-top:1rem;color:var(--gray-500);">جاري التحميل...</p>
            </div>
        `;
    }
}
