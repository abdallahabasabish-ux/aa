export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
  return str.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}

export function sanitizeInput(str, max = 500) {
  if (typeof str !== "string") return "";
  const t = str.trim();
  return t.length > max ? t.slice(0, max) : t;
}

export function isSafeUrl(url) {
  if (typeof url !== "string") return false;
  const n = url.trim().toLowerCase();
  return (n.startsWith("http://") || n.startsWith("https://") || n.startsWith("/") || n.startsWith("#") || n === "");
}
