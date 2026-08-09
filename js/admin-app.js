import { checkAdminAuth } from './auth-admin.js';

let currentPage = 'dashboard';

export function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.sidebar-nav ul li').forEach(el => el.classList.remove('active'));
    document.querySelector(`.sidebar-nav ul li[data-page="${page}"]`)?.classList.add('active');
    document.getElementById('pageTitle').textContent = document.querySelector(`.sidebar-nav ul li[data-page="${page}"]`)?.textContent || page;

    const container = document.getElementById('dynamicContent');
    switch (page) {
        case 'dashboard': renderDashboard(container); break;
        case 'services': import('./crud-services.js').then(m => m.renderServices(container)); break;
        case 'templates': import('./crud-templates.js').then(m => m.renderTemplates(container)); break;
        case 'products': import('./crud-products.js').then(m => m.renderProducts(container)); break;
        case 'portfolio': import('./crud-portfolio.js').then(m => m.renderPortfolio(container)); break;
        case 'posts': import('./crud-posts.js').then(m => m.renderPosts(container)); break;
        default: container.innerHTML = '<h2>جاري التطوير...</h2>';
    }
}

function renderDashboard(container) {
    container.innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card"><h3>الخدمات</h3><div class="number" id="statServices">0</div></div>
            <div class="stat-card"><h3>القوالب</h3><div class="number" id="statTemplates">0</div></div>
            <div class="stat-card"><h3>المنتجات</h3><div class="number" id="statProducts">0</div></div>
            <div class="stat-card"><h3>الطلبات</h3><div class="number" id="statOrders">0</div></div>
            <div class="stat-card"><h3>التقييمات المعلقة</h3><div class="number" id="statReviews">0</div></div>
        </div>
        <div style="background:white;padding:2rem;border-radius:var(--radius);box-shadow:var(--shadow);">
            <h3>مرحباً بك في لوحة الإدارة</h3>
            <p>اختر أحد الأقسام من القائمة الجانبية لإدارة المحتوى.</p>
        </div>
    `;
    // جلب الإحصائيات من Firestore (يمكن إضافتها لاحقاً)
}

document.querySelectorAll('.sidebar-nav ul li[data-page]').forEach(el => {
    el.addEventListener('click', () => {
        const page = el.getAttribute('data-page');
        navigateTo(page);
        document.getElementById('sidebar')?.classList.remove('open');
    });
});

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
});

export function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

navigateTo('dashboard');
