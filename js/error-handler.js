/**
 * error-handler.js
 * عرض رسائل للمستخدم بأمان — لا يُعرض Firebase Error Codes أبدًا.
 *
 * كل Firebase error يمر من هنا قبل الوصول للمستخدم.
 */

/**
 * عرض رسالة للمستخدم في عنصر محدد.
 * يستخدم textContent دائمًا — لا خطر XSS.
 *
 * @param {string} containerId — id العنصر
 * @param {string} message — الرسالة الآمنة
 * @param {"error"|"success"} type
 */
export function showUserMessage(containerId, message, type = "error") {
  const el = document.getElementById(containerId);
  if (!el) return;

  // إزالة الحالات السابقة
  el.classList.remove("auth-message--visible", "auth-message--error", "auth-message--success");

  el.textContent = message;
  el.className = "auth-message";

  // تأخير بسيط لإعادة التشغيل إذا كانت نفس الرسالة
  requestAnimationFrame(() => {
    el.classList.add("auth-message--visible", `auth-message--${type}`);
  });
}

/**
 * إخفاء رسالة المستخدم.
 *
 * @param {string} containerId
 */
export function clearUserMessage(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = "";
  el.className = "auth-message";
}

/**
 * عرض خطأ تحت حقل معين (inline field error).
 *
 * @param {string} errorId — id عنصر الخطأ
 * @param {string} message
 */
export function showFieldError(errorId, message) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = message;
  el.classList.add("field-error--visible");
}

/**
 * إخفاء خطأ الحقل.
 *
 * @param {string} errorId
 */
export function clearFieldError(errorId) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = "";
  el.classList.remove("field-error--visible");
}
