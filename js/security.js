/**
 * security.js
 * أدوات أمنية — منع XSS وSanitization.
 *
 * القاعدة: استخدم textContent دائمًا.
 * إذا اضطررت لاستخدام innerHTML، مرر النص من هذه الدوال أولاً.
 */

/**
 * تحويل الأحرف الخطرة إلى HTML entities.
 * يمنع DOM XSS عند الحاجة لعرض نص من مستخدم أو من Firestore.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * تنظيف إدخال نصي — إزالة مسافات زائدة و truncate.
 * لا يُستبدل بـ sanitization كامل؛ هو للعرض فقط.
 *
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeInput(str, maxLength = 500) {
  if (typeof str !== "string") return "";
  const trimmed = str.trim();
  return trimmed.length > maxLength
    ? trimmed.slice(0, maxLength)
    : trimmed;
}

/**
 * التحقق من أن قيمة ما ليست خطيرة كـ href أو src.
 * يمنع javascript: و data: URLs.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (typeof url !== "string") return false;
  const normalized = url.trim().toLowerCase();
  return (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("/") ||
    normalized.startsWith("#") ||
    normalized === ""
  );
}
