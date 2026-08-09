// app.js - النسخة النهائية مع Firebase
import { db } from './firebase-init.js';
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { t, getCurrentLang } from './i18n.js';

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderAll();
});

async function fetchAndRenderAll() {
  await Promise.all([
    fetchServices(),
    fetchTemplates(),
    fetchProducts(),
    fetchPortfolio(),
    fetchPosts(),
    fetchTestimonials()
  ]);
  // FAQ ثابت أو من Firestore
  renderFAQ();
  // إعدادات الموبايل
  setupMobileMenu();
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

// ===== دالة عرض البطاقات (نفس الوظيفة السابقة مع تحسين طفيف) =====
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
    if (type === 'service') linkUrl = `/service/${slug}`;
    else if (type === 'template') linkUrl = `/template/${slug}`;
    else if (type === 'product') linkUrl = `/product/${slug}`;
    else if (type === 'portfolio') linkUrl = `/portfolio/${slug}`;
    else if (type === 'post') linkUrl = `/post/${slug}`;

    return `
      <div class="card fade-in">
        <div class="card-image">
          <img src="${image || 'https://placehold.co/600x400/FF6600/FFFFFF?text=Abdallah+Abbas'}" alt="${title}" loading="lazy" />
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

// ===== باقي الدوال (FAQ, Mobile Menu) =====
function renderFAQ() { /* نفس الكود السابق */ }
function setupMobileMenu() { /* نفس الكود السابق */ }
