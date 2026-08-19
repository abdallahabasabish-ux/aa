/**
 * modal.js
 * إدارة المودال والإشعارات (Toast) ونموذج الطلب
 * التصميم الجديد — ينزلق من الأسفل
 */

import { db } from "/js/firebase-init.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ===== حالة المودال =====
let currentItem = null;
let currentType = 'service'; // 'service' | 'product' | 'portfolio'

// ===== DOM =====
const modalOverlay = document.getElementById('modalOverlay');
const modalContainer = document.getElementById('modalContainer');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalImage = document.getElementById('modalImage');
const modalBody = document.getElementById('modalBody');
const modalFeatures = document.getElementById('modalFeatures');
const modalPrice = document.getElementById('modalPrice');
const modalForm = document.getElementById('modalForm');
const modalFormName = document.getElementById('modalFormName');
const modalFormEmail = document.getElementById('modalFormEmail');
const modalFormMessage = document.getElementById('modalFormMessage');
const modalFormSubmit = document.getElementById('modalFormSubmit');
const modalFormSubmitText = modalFormSubmit.querySelector('.btn-text');
const modalFormSpinner = modalFormSubmit.querySelector('.spinner');

// ===== Toast =====
const toastContainer = document.getElementById('toastContainer');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');

// ===== فتح المودال =====
export function openModal(item, type = 'service') {
  currentItem = item;
  currentType = type;

  // تعبئة البيانات
  modalTitle.textContent = item.title || '—';
  modalSubtitle.textContent = item.shortDescription || '';

  // الصورة
  if (item.image && isSafeUrl(item.image)) {
    modalImage.src = item.image;
    modalImage.alt = item.title || '';
    modalImage.style.display = 'block';
  } else {
    modalImage.style.display = 'none';
  }

  // الوصف التفصيلي
  modalBody.innerHTML = '';
  if (item.description) {
    const paragraphs = item.description.split('\n').filter(p => p.trim());
    paragraphs.forEach(p => {
      const para = document.createElement('p');
      para.textContent = p;
      modalBody.appendChild(para);
    });
  }

  // المميزات
  modalFeatures.innerHTML = '';
  if (item.features && item.features.length > 0) {
    item.features.forEach(f => {
      const tag = document.createElement('span');
      tag.className = 'modal-feature-tag';
      tag.textContent = f;
      modalFeatures.appendChild(tag);
    });
  }

  // السعر
  const currencyMap = { EGP: 'ج.م', USD: '$', SAR: 'ر.س', AED: 'د.إ' };
  if (item.price > 0) {
    modalPrice.textContent = `${Number(item.price).toLocaleString('ar-EG')} ${currencyMap[item.currency] || item.currency || ''}`;
    modalPrice.className = 'modal-price';
  } else {
    modalPrice.textContent = 'مجاني';
    modalPrice.className = 'modal-price modal-price-free';
  }

  // إعادة تعيين النموذج
  modalForm.reset();
  modalFormSubmit.disabled = false;
  modalFormSubmit.classList.remove('loading');
  modalFormSubmitText.style.display = '';
  modalFormSpinner.style.display = 'none';

  // إظهار المودال
  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ===== إغلاق المودال =====
export function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
  currentItem = null;
}

// ===== إظهار الإشعار (Toast) =====
export function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add('visible');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 5000);
}

// ===== إخفاء الإشعار =====
export function hideToast() {
  toast.classList.remove('visible');
  clearTimeout(window.toastTimeout);
}

// ===== دالة مساعدة للتحقق من الرابط =====
function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const normalized = url.trim().toLowerCase();
  return normalized.startsWith('http://') || normalized.startsWith('https://') || normalized === '';
}

// ===== إرسال الطلب =====
async function submitRequest(e) {
  e.preventDefault();

  const name = modalFormName.value.trim();
  const email = modalFormEmail.value.trim();
  const message = modalFormMessage.value.trim();

  if (!name || !email) {
    showToast('⚠️ يرجى إدخال الاسم والبريد الإلكتروني.');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('⚠️ صيغة البريد الإلكتروني غير صحيحة.');
    return;
  }

  modalFormSubmit.disabled = true;
  modalFormSubmit.classList.add('loading');
  modalFormSubmitText.style.display = 'none';
  modalFormSpinner.style.display = 'block';

  try {
    await addDoc(collection(db, 'orders'), {
      type: currentType === 'service' ? 'service_request' : currentType === 'product' ? 'product_request' : 'portfolio_inquiry',
      itemId: currentItem.id,
      itemTitle: currentItem.title,
      itemSlug: currentItem.slug,
      customerName: name,
      customerEmail: email,
      customerMessage: message || '',
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    showToast('✅ تم إرسال طلبك بنجاح، سيتم التواصل معك خلال 24 ساعة.');

    setTimeout(() => {
      closeModal();
    }, 800);

  } catch (error) {
    console.error('خطأ في إرسال الطلب:', error);
    showToast('❌ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }

  modalFormSubmit.disabled = false;
  modalFormSubmit.classList.remove('loading');
  modalFormSubmitText.style.display = '';
  modalFormSpinner.style.display = 'none';
}

// ===== ربط الأحداث =====
modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});
toastClose.addEventListener('click', hideToast);

modalForm.addEventListener('submit', submitRequest);
