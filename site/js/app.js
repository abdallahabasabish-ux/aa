// app.js - التطبيق الرئيسي

import { 
  mockServices, mockTemplates, mockProducts, mockPortfolio, 
  mockPosts, mockTestimonials, mockFaq 
} from './modules/data.js';
import { t, getCurrentLang } from './i18n.js';

document.addEventListener('DOMContentLoaded', () => {

  // 1. Render Services
  renderCards('servicesGrid', mockServices, 'service');
  
  // 2. Render Templates
  renderCards('templatesGrid', mockTemplates, 'template');
  
  // 3. Render Products
  renderCards('productsGrid', mockProducts, 'product');
  
  // 4. Render Portfolio
  renderCards('portfolioGrid', mockPortfolio, 'portfolio');
  
  // 5. Render Blog Posts
  renderCards('blogGrid', mockPosts, 'post');
  
  // 6. Render Testimonials
  renderTestimonials();
  
  // 7. Render FAQ
  renderFAQ();

  // 8. Mobile Menu Toggle
  const menuToggle = document.getElementById('mobileMenuToggle');
  const nav = document.getElementById('main-nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      const icon = menuToggle.querySelector('i');
      if (nav.classList.contains('open')) {
        icon.className = 'fas fa-times';
      } else {
        icon.className = 'fas fa-bars';
      }
    });
  }

  // 9. Close mobile menu on link click
  document.querySelectorAll('.nav-list a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      const icon = menuToggle?.querySelector('i');
      if (icon) icon.className = 'fas fa-bars';
    });
  });
});

// ========== RENDER CARDS ==========
function renderCards(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<p class="empty-state">${t('No items found')}</p>`;
    return;
  }

  const lang = getCurrentLang();
  const isAr = lang === 'ar';

  container.innerHTML = items.map(item => {
    // Determine title, description, features based on language
    const title = isAr ? item.title : (item.title_en || item.title);
    const desc = isAr ? item.description : (item.description_en || item.description || '');
    const price = item.price || 0;
    const currency = item.currency || 'SAR';
    const image = item.image || item.coverImage || item.featuredImage || '';
    const slug = item.slug || item.id;

    // For products, check type
    let badge = '';
    if (type === 'product') {
      if (item.type === 'free') {
        badge = `<span class="card-tag free">${isAr ? 'مجاني' : 'Free'}</span>`;
      } else {
        badge = `<span class="card-tag">${isAr ? 'مدفوع' : 'Paid'}</span>`;
      }
    }
    if (type === 'template') {
      badge = `<span class="card-tag">${item.type}</span>`;
    }

    // For posts, show date
    let meta = '';
    if (type === 'post' && item.publishedAt) {
      const date = new Date(item.publishedAt.seconds ? item.publishedAt.seconds * 1000 : item.publishedAt);
      meta = `<span class="card-meta">${date.toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>`;
    }

    // Build card HTML
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

// ========== RENDER TESTIMONIALS ==========
function renderTestimonials() {
  const container = document.getElementById('testimonialsGrid');
  if (!container) return;
  const lang = getCurrentLang();
  const isAr = lang === 'ar';

  const items = mockTestimonials.filter(t => t.status === 'approved');
  if (items.length === 0) {
    container.innerHTML = `<p class="empty-state">${isAr ? 'لا توجد تقييمات حالياً' : 'No reviews yet'}</p>`;
    return;
  }

  container.innerHTML = items.map(t => {
    const name = isAr ? t.user : t.user_en || t.user;
    const comment = isAr ? t.comment : t.comment_en || t.comment;
    const stars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
    return `
      <div class="testimonial-card fade-in">
        <div class="stars">${stars}</div>
        <blockquote>"${comment}"</blockquote>
        <div class="author">
          <img src="${t.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name)}" alt="${name}" />
          <div>
            <strong>${name}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ========== RENDER FAQ ==========
function renderFAQ() {
  const container = document.getElementById('faqList');
  if (!container) return;
  const lang = getCurrentLang();
  const isAr = lang === 'ar';

  if (mockFaq.length === 0) return;

  container.innerHTML = mockFaq.map((item, index) => {
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

  // Toggle FAQ
  container.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', function() {
      const parent = this.parentElement;
      const isActive = parent.classList.contains('active');
      // Close all
      container.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));
      if (!isActive) {
        parent.classList.add('active');
      }
    });
  });
}
