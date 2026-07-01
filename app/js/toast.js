// Toast notification system for Ahorrio.
// Usage: showToast("Mensaje", "success" | "error" | "info")

let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.className = "toast-container";
  container.setAttribute("aria-live", "polite");
  document.body.appendChild(container);
  return container;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {"success" | "error" | "info"} [type="info"]
 * @param {number} [duration=3000]  ms
 */
export function showToast(message, type = "info", duration = 3000) {
  const wrap = ensureContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", "status");

  const icons = { success: "✓", error: "✕", info: "ℹ" };
  toast.textContent = `${icons[type] || ""} ${message}`;

  wrap.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (wrap.children.length === 0) {
      wrap.remove();
      container = null;
    }
  }, duration);
}
