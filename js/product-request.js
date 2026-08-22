/**
 * product-request.js
 * منطق طلب المنتج — التحقق من تسجيل الدخول، المودال، الإشعار
 */

import { auth, db } from "/js/firebase-init.js";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { isSafeUrl } from "/js/security.js";

// ===== DOM =====
const modalOverlay = document.getElementById('pdetModalOverlay');
const modal = document.getElementById('pdetModal');
const modalClose = document.getElementById('pdetModalClose');
const modalProductName = document.getElementById('pdetModalProductName');
const modalProductPrice = document.getElementById('pdetModalProductPrice');
const modalProductImage = document.getElementById('pdetModalProductImage');
const form = document.getElementById('pdetForm');
const formName = document.getElementById('pdetFormName');
const formEmail = document.getElementById('pdetFormEmail');
const formMessage = document.getElementById('pdetFormMessage');
const formSubmit = document.getElementById('pdetFormSubmit');
const formSubmitText = formSubmit.querySelector('.btn-text');
const formSpinner = formSubmit.querySelector('.spinner');

// ===== TOAST =====
const toast = document.getElementById('pdetToast');
const toastMessage = document.getElementById('pdetToastMessage');
const toastClose = document.getElementById('pdetToastClose');

// ===== الدولة =====
let currentProduct = null;
let toastTimeout = null;

// ===== إظهار الإشعار =====
export function showProductToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.className = 'pdet-toast';
  if (type === 'success') {
    toast.querySelector('.pdet-toast-icon').style.color = '#22C55E';
  } else {
    toast.querySelector('.pdet-toast-icon').style.color = '#EF4444';
  }
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 5000);
}

// ===== إخفاء الإشعار =====
export function hideProductToast() {
  toast.classList.remove('visible');
  clearTimeout(toastTimeout);
}

// ===== فتح المودال =====
export function openProductModal(product) {
  currentProduct = product;
  
  // تعبئة بيانات المنتج
  modalProductName.textContent = product.title || '—';
  
  const currencyMap = { EGP: 'ج.م', USD: '$', SAR: 'ر.س', AED: 'د.إ' };
  if (product.price > 0) {
    modalProductPrice.textContent = `${Number(product.price).toLocaleString('ar-EG')} ${currencyMap[product.currency] || product.currency || ''}`;
  } else {
    modalProductPrice.textContent = 'مجاني';
  }
  
  if (product.image && isSafeUrl(product.image)) {
    modalProductImage.src = product.image;
    modalProductImage.alt = product.title || '';
    modalProductImage.style.display = 'block';
  } else {
    modalProductImage.style.display = 'none';
  }
  
  // تعبئة بيانات المستخدم إذا كان مسجلاً
  const user = auth.currentUser;
  if (user) {
    if (user.displayName) formName.value = user.displayName;
    else if (user.email) formName.value = user.email.split('@')[0];
    formEmail.value = user.email || '';
    formEmail.disabled = true;
    
    // جلب رقم الهاتف من Firestore
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists() && snap.data().phone) {
        // يمكن إضافة حقل هاتف إذا أردت
      }
    }).catch(() => {});
  } else {
    formEmail.disabled = false;
  }
  
  // إعادة تعيين النموذج
  form.reset();
  if (user) {
    if (user.displayName) formName.value = user.displayName;
    else if (user.email) formName.value = user.email.split('@')[0];
    formEmail.value = user.email || '';
    formEmail.disabled = true;
  } else {
    formEmail.disabled = false;
  }
  formMessage.value = '';
  
  formSubmit.disabled = false;
  formSubmit.classList.remove('loading');
  formSubmitText.style.display = '';
  formSpinner.style.display = 'none';
  
  // إزالة الأخطاء
  document.querySelectorAll('.pdet-form-error').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.pdet-form-input.error, .pdet-form-textarea.error').forEach(el => el.classList.remove('error'));
  
  // إظهار المودال
  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ===== إغلاق المودال =====
export function closeProductModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
  currentProduct = null;
}

// ===== التحقق من صحة النموذج =====
function validateForm() {
  let valid = true;
  
  const name = formName.value.trim();
  const email = formEmail.value.trim();
  
  // اسم
  const nameError = document.getElementById('pdetFormNameError');
  if (!name) {
    nameError.textContent = 'الاسم مطلوب';
    nameError.classList.add('visible');
    formName.classList.add('error');
    valid = false;
  } else {
    nameError.classList.remove('visible');
    formName.classList.remove('error');
  }
  
  // بريد
  const emailError = document.getElementById('pdetFormEmailError');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    emailError.textContent = 'البريد الإلكتروني مطلوب';
    emailError.classList.add('visible');
    formEmail.classList.add('error');
    valid = false;
  } else if (!emailRegex.test(email)) {
    emailError.textContent = 'صيغة البريد غير صحيحة';
    emailError.classList.add('visible');
    formEmail.classList.add('error');
    valid = false;
  } else {
    emailError.classList.remove('visible');
    formEmail.classList.remove('error');
  }
  
  return valid;
}

// ===== إرسال الطلب =====
async function submitProductRequest(e) {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  const user = auth.currentUser;
  if (!user) {
    showProductToast('⚠️ يرجى تسجيل الدخول أولاً', 'error');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 1500);
    return;
  }
  
  const name = formName.value.trim();
  const email = formEmail.value.trim();
  const message = formMessage.value.trim();
  
  // تعطيل الزر
  formSubmit.disabled = true;
  formSubmit.classList.add('loading');
  formSubmitText.style.display = 'none';
  formSpinner.style.display = 'block';
  
  try {
    // حفظ في Firestore
    await addDoc(collection(db, 'orders'), {
      type: 'product_request',
      userId: user.uid,
      productId: currentProduct.id,
      productTitle: currentProduct.title,
      productSlug: currentProduct.slug,
      productPrice: currentProduct.price || 0,
      productCurrency: currentProduct.currency || 'EGP',
      customerName: name,
      customerEmail: email,
      customerMessage: message || '',
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // إظهار الإشعار
    showProductToast('✅ تم إرسال طلبك بنجاح، سيتم التواصل خلال 24 ساعة');
    
    // إغلاق المودال بعد تأخير
    setTimeout(() => {
      closeProductModal();
    }, 800);
    
    // التوجيه إلى لوحة التحكم بعد 1.5 ثانية
    setTimeout(() => {
      window.location.href = '/dashboard/orders.html';
    }, 1500);
    
  } catch (error) {
    console.error('خطأ في طلب المنتج:', error);
    showProductToast('❌ حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    formSubmit.disabled = false;
    formSubmit.classList.remove('loading');
    formSubmitText.style.display = '';
    formSpinner.style.display = 'none';
  }
}

// ===== ربط الأحداث =====
modalClose.addEventListener('click', closeProductModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeProductModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeProductModal();
});
toastClose.addEventListener('click', hideProductToast);

form.addEventListener('submit', submitProductRequest);

// ===== تصدير الدوال للاستخدام في صفحة التفاصيل =====
export default {
  openProductModal,
  closeProductModal,
  showProductToast,
  hideProductToast
};
