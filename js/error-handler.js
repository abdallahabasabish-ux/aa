export function showUserMessage(containerId, message, type = "error") {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.classList.remove("auth-message--visible", "auth-message--error", "auth-message--success");
  el.textContent = message;
  el.className = "auth-message";
  requestAnimationFrame(() => {
    el.classList.add("auth-message--visible", `auth-message--${type}`);
  });
}

export function clearUserMessage(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = "";
  el.className = "auth-message";
}

export function showFieldError(errorId, message) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = message;
  el.classList.add("field-error--visible");
}

export function clearFieldError(errorId) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = "";
  el.classList.remove("field-error--visible");
}
