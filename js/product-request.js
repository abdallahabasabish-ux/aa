/**
 * product-request.js
 * إرسال طلب المنتج مباشرة بدون مودال
 */

import { auth, db } from "/js/firebase-init.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ===== TOAST =====
const toast = document.getElementById('pdetToast');
const toastMessage = document.getElementById('pdetToastMessage');
const toastClose = document.getElementById('pdetToastClose');
let toastTimeout = null;

// ===== إظهار الإشعار =====
export function showProductToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.className = 'pdet-toast';
  const icon = toast.querySelector('.pdet-toast-icon');
  if (type === 'success') {
    icon.style.color = '#22C55E';
  } else {
    icon.style.color = '#EF4444';
  }
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 4000);
}

// ===== إخفاء الإشعار =====
export function hideProductToast() {
  toast.classList.remove('visible');
  clearTimeout(toastTimeout);
}

// ===== طلب المنتج =====
export async function requestProduct(product) {
  const user = auth.currentUser;

  // التحقق من تسجيل الدخول
  if (!user) {
    showProductToast('⚠️ يرجى تسجيل الدخول أولاً', 'error');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 1500);
    return;
  }

  // تعطيل الزر (اختياري)
  const btn = document.querySelector('.pdet-request-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';
  }

  try {
    // إرسال الطلب
    await addDoc(collection(db, 'orders'), {
      type: 'product_request',
      userId: user.uid,
      productId: product.id,
      productTitle: product.title,
      productSlug: product.slug,
      productPrice: product.price || 0,
      productCurrency: product.currency || 'EGP',
      customerName: user.displayName || user.email?.split('@')[0] || 'مستخدم',
      customerEmail: user.email || '',
      customerMessage: '',
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // إشعار نجاح
    showProductToast('✅ تم إرسال طلبك بنجاح، سيتم التواصل خلال 24 ساعة');

    // التوجيه إلى لوحة التحكم بعد 1.5 ثانية
    setTimeout(() => {
      window.location.href = '/dashboard/orders.html';
    }, 1500);

  } catch (error) {
    console.error('خطأ في طلب المنتج:', error);
    showProductToast('❌ حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
        </svg>
        طلب المنتج
      `;
    }
  }
}

// ===== ربط إغلاق الإشعار =====
toastClose.addEventListener('click', hideProductToast);
