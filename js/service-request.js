/**
 * service-request.js
 * إرسال طلب الخدمة مباشرة بدون مودال (مثل المنتجات)
 */

import { auth, db } from "/js/firebase-init.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ===== TOAST =====
const toast = document.getElementById('sdetToast');
const toastMessage = document.getElementById('sdetToastMessage');
const toastClose = document.getElementById('sdetToastClose');
let toastTimeout = null;

// ===== إظهار الإشعار =====
export function showServiceToast(message, type = 'success') {
  if (!toast) {
    // إذا لم يوجد عنصر toast، ننشئ واحداً مؤقتاً
    const fallbackToast = document.createElement('div');
    fallbackToast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:14px 28px;border-radius:12px;font-family:Cairo,sans-serif;font-size:0.9375rem;z-index:9999;box-shadow:0 12px 40px rgba(0,0,0,0.2);max-width:90vw;text-align:center;';
    fallbackToast.textContent = message;
    document.body.appendChild(fallbackToast);
    setTimeout(() => { fallbackToast.remove(); }, 4000);
    return;
  }

  toastMessage.textContent = message;
  toast.className = 'sdet-toast';
  const icon = toast.querySelector('.sdet-toast-icon');
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
export function hideServiceToast() {
  if (toast) {
    toast.classList.remove('visible');
    clearTimeout(toastTimeout);
  }
}

// ===== طلب الخدمة =====
export async function requestService(service) {
  const user = auth.currentUser;

  // ===== التحقق من تسجيل الدخول =====
  if (!user) {
    showServiceToast('⚠️ يرجى تسجيل الدخول أولاً', 'error');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 1500);
    return;
  }

  // ===== تعطيل الزر =====
  const btns = document.querySelectorAll('.sdet-request-btn, .sdet-cta-btn');
  btns.forEach(btn => {
    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';
  });

  try {
    // ===== إرسال الطلب إلى Firestore =====
    await addDoc(collection(db, 'orders'), {
      type: 'service_request',
      userId: user.uid,
      serviceId: service.id,
      serviceTitle: service.title,
      serviceSlug: service.slug,
      servicePrice: service.price || 0,
      serviceCurrency: service.currency || 'EGP',
      customerName: user.displayName || user.email?.split('@')[0] || 'مستخدم',
      customerEmail: user.email || '',
      customerMessage: '',
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // ===== إشعار نجاح =====
    showServiceToast('✅ تم إرسال طلبك بنجاح، سيتم التواصل خلال 24 ساعة');

    // ===== التوجيه إلى لوحة التحكم بعد 1.5 ثانية =====
    setTimeout(() => {
      window.location.href = '/dashboard/orders.html';
    }, 1500);

  } catch (error) {
    console.error('خطأ في طلب الخدمة:', error);
    showServiceToast('❌ حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    
    // ===== إعادة تفعيل الأزرار =====
    btns.forEach(btn => {
      btn.disabled = false;
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
        </svg>
        طلب الخدمة
      `;
    });
  }
}

// ===== ربط إغلاق الإشعار =====
if (toastClose) {
  toastClose.addEventListener('click', hideServiceToast);
}
