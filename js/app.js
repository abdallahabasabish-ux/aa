// site/js/app.js
import { db } from './firebase-init.js';
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { t, getCurrentLang } from './i18n.js';

// ===== تحميل جميع البيانات =====
export async function loadAllData() {
    await Promise.all([
        fetchServices(),
        fetchTemplates(),
        fetchProducts(),
        fetchPortfolio(),
        fetchPosts(),
        fetchTestimonials()
    ]);
    renderFAQ(); // ثابت أو من Firestore
}

// ===== جلب الخدمات =====
async function fetchServices() {
    const container = document.getElementById('servicesGrid');
    if (!container) return;
    try {
        const q = query(collection(db, "services"), where("active", "==", true), orderBy("featured", "desc"));
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCards(container, items, 'service');
    } catch (e) {
        console.error("Error fetching services:", e);
        container.innerHTML = `<p class="empty-state">حدث خطأ في تحميل الخدمات</p>`;
    }
}

// ===== جلب القوالب =====
async function fetchTemplates() {
    const container = document.getElementById('templatesGrid');
    if (!container) return;
    try {
        const q = query(collection(db, "templates"), where("active", "==", true));
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCards(container, items, 'template');
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="empty-state">حدث خطأ في تحميل القوالب</p>`;
    }
}

// ===== جلب المنتجات =====
async function fetchProducts() {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    try {
        const q = query(collection(db, "products"), where("active", "==", true));
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCards(container, items, 'product');
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="empty-state">حدث خطأ في تحميل المنتجات</p>`;
    }
}

// ===== جلب معرض الأعمال =====
async function fetchPortfolio() {
    const container = document.getElementById('portfolioGrid');
    if (!container) return;
    try {
        const q = query(collection(db, "portfolio"), where("active", "==", true), orderBy("featured", "desc"));
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCards(container, items, 'portfolio');
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="empty-state">حدث خطأ في تحميل الأعمال</p>`;
    }
}

// ===== جلب المقالات =====
async function fetchPosts() {
    const container = document.getElementById('blogGrid');
    if (!container) return;
    try {
        const q = query(collection(db, "posts"), where("status", "==", "published"), orderBy("publishedAt", "desc"), limit(4));
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCards(container, items, 'post');
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="empty-state">حدث خطأ في تحميل المقالات</p>`;
    }
}

// ===== جلب التقييمات =====
async function fetchTestimonials() {
    const container = document.getElementById('testimonialsGrid');
    if (!container) return;
    try {
        const q = query(collection(db, "reviews"), where("status", "==", "approved"));
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTestimonials(container, items);
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="empty-state">لا توجد تقييمات حالياً</p>`;
    }
}

// ===== دالة عرض البطاقات =====
function renderCards(container, items, type) {
    if (!items || items.length === 0) {
        container.innerHTML = `<p class="empty-state">${t('No items found')}</p>`;
        return;
    }
    const lang = getCurrentLang();
    const isAr = lang === 'ar';

    container.innerHTML = items.map(item => {
        const title = isAr ? item.title : (item.title_en || item.title);
        const desc = isAr ? item.description : (item.description_en || item.description || '');
        const price = item.price || 0;
        const currency = item.currency || 'SAR';
        const image = item.image || item.coverImage || item.featuredImage || item.images?.[0] || '';
        const slug = item.slug || item.id;

        let badge = '';
        if (type === 'product') {
            badge = item.type === 'free' 
                ? `<span class="card-tag free">${isAr ? 'مجاني' : 'Free'}</span>`
                : `<span class="card-tag">${isAr ? 'مدفوع' : 'Paid'}</span>`;
        }
        if (type === 'template') {
            badge = `<span class="card-tag">${item.type || ''}</span>`;
        }

        let meta = '';
        if (type === 'post' && item.publishedAt) {
            const date = item.publishedAt.toDate ? item.publishedAt.toDate() : new Date(item.publishedAt);
            meta = `<span class="card-meta">${date.toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>`;
        }

        let linkUrl = '#';
        if (type === 'service') linkUrl = `/detail.html?type=service&slug=${slug}`;
        else if (type === 'template') linkUrl = `/detail.html?type=template&slug=${slug}`;
        else if (type === 'product') linkUrl = `/detail.html?type=product&slug=${slug}`;
        else if (type === 'portfolio') linkUrl = `/detail.html?type=portfolio&slug=${slug}`;
        else if (type === 'post') linkUrl = `/detail.html?type=post&slug=${slug}`;

        return `
            <div class="card fade-in">
                <div class="card-image">
                    <img src="${image || 'https://placehold.co/600x400/FF6600/FFFFFF?text=Abdallah+Abas'}" alt="${title}" loading="lazy" />
                </div>
                <div class="card-body">
                    <h3 class="card-title"><a href="${linkUrl}">${title}</a></h3>
                    <p class="card-desc">${desc}</p>
                    ${meta}
                    <div class="card-footer">
                        <span class="card-price">${price > 0 ? price + ' ' + currency : (isAr ? 'مجاني' : 'Free')}</span>
                        ${badge}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== دالة عرض التقييمات =====
function renderTestimonials(container, items) {
    const lang = getCurrentLang();
    const isAr = lang === 'ar';
    if (!items || items.length === 0) {
        container.innerHTML = `<p class="empty-state">${isAr ? 'لا توجد تقييمات حالياً' : 'No reviews yet'}</p>`;
        return;
    }
    container.innerHTML = items.map(t => {
        const name = isAr ? t.user : (t.user_en || t.user);
        const comment = isAr ? t.comment : (t.comment_en || t.comment);
        const stars = '★'.repeat(t.rating || 5) + '☆'.repeat(5 - (t.rating || 5));
        return `
            <div class="testimonial-card fade-in">
                <div class="stars">${stars}</div>
                <blockquote>"${comment}"</blockquote>
                <div class="author">
                    <img src="${t.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name)}" alt="${name}" />
                    <strong>${name}</strong>
                </div>
            </div>
        `;
    }).join('');
}

// ===== FAQ (بيانات ثابتة مؤقتاً) =====
function renderFAQ() {
    const container = document.getElementById('faqList');
    if (!container) return;
    const lang = getCurrentLang();
    const isAr = lang === 'ar';
    const faqData = [
        { q: 'ما هي مدة تنفيذ الخدمة؟', q_en: 'What is the service delivery time?', a: 'تختلف المدة حسب نوع الخدمة، تتراوح بين 3 إلى 10 أيام عمل.', a_en: 'The duration varies depending on the service type, ranging from 3 to 10 business days.' },
        { q: 'هل تقدمون ضمان على الخدمات؟', q_en: 'Do you provide a warranty on services?', a: 'نعم، نقدم ضمان لمدة 30 يومًا على جميع خدماتنا.', a_en: 'Yes, we provide a 30-day warranty on all our services.' },
        { q: 'كيف يمكنني التواصل مع الدعم؟', q_en: 'How can I contact support?', a: 'يمكنك التواصل عبر الواتساب أو البريد الإلكتروني الموجودين في تذييل الموقع.', a_en: 'You can contact via WhatsApp or email found in the site footer.' }
    ];

    container.innerHTML = faqData.map((item, index) => {
        const q = isAr ? item.q : (item.q_en || item.q);
        const a = isAr ? item.a : (item.a_en || item.a);
        const active = index === 0 ? 'active' : '';
        return `
            <div class="faq-item ${active}">
                <div class="faq-question" data-index="${index}">
                    <span>${q}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="faq-answer">${a}</div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', function() {
            const parent = this.parentElement;
            const isActive = parent.classList.contains('active');
            container.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));
            if (!isActive) parent.classList.add('active');
        });
    });
}

// ===== تشغيل التطبيق عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', loadAllData);
