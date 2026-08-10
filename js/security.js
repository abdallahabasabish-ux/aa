/**
 * security.js
 * أدوات أمنية — منع XSS و Sanitization.
 *
 * القاعدة الذهبية: استخدم textContent دائمًا.
 * إذا اضطررت لـ innerHTML، مرّر النص من escapeHtml() أولًا.
 */

/**
 * تحويل الأحرف الخطرة إلى HTML entities — يمنع DOM XSS.
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
  return str.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}

/**
 * تنظيف إدخال نصي — trim + truncate.
 * للعرض فقط، ليس بديلًا عن server-side validation.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export function sanitizeInput(str, max = 500) {
  if (typeof str !== "string") return "";
  const t = str.trim();
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * التحقق من أن URL آمن — يمنع javascript: و data:.
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (typeof url !== "string") return false;
  const n = url.trim().toLowerCase();
  return (
    n.startsWith("http://") ||
    n.startsWith("https://") ||
    n.startsWith("/") ||
    n.startsWith("#") ||
    n === ""
  );
}
