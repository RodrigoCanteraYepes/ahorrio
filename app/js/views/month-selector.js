// Month selector with arrow navigation for v0.1.
// Shows: ← [Month Year] →  [Hoy]
// Left arrow goes to previous month, right arrow to next.
// "Hoy" button appears only when viewing a different month than today's.
// Pure module; no storage I/O. ES module.

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

/** Return today's month key "YYYY-MM". */
export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM" -> previous-month "YYYY-MM". Handles year boundary. */
export function previousMonthKey(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
  if (!m) return monthKey;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return `${prev.year}-${String(prev.month).padStart(2, "0")}`;
}

/** "YYYY-MM" -> next-month "YYYY-MM". Handles year boundary. */
export function nextMonthKey(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
  if (!m) return monthKey;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return `${next.year}-${String(next.month).padStart(2, "0")}`;
}

/** "YYYY-MM" -> "Junio 2026". */
export function monthLabel(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
  if (!m) return monthKey || "";
  const name = MONTH_NAMES[Number(m[2]) - 1] || "";
  return name ? `${name} ${m[1]}` : monthKey;
}

/**
 * @param {HTMLElement} host
 * @param {string} selectedMonthKey  The currently selected "YYYY-MM"
 * @param {(newMonthKey: string) => void} onChange
 */
export function renderMonthSelector(host, selectedMonthKey, onChange) {
  host.innerHTML = "";
  const todayKey = currentMonthKey();

  const wrap = document.createElement("div");
  wrap.className = "month-selector";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "Navegación de mes");

  // Left arrow
  const leftBtn = document.createElement("button");
  leftBtn.type = "button";
  leftBtn.className = "month-selector__arrow";
  leftBtn.innerHTML = "&#8592;"; // ←
  leftBtn.setAttribute("aria-label", "Mes anterior");
  leftBtn.addEventListener("click", () => { onChange(previousMonthKey(selectedMonthKey));
  });
  wrap.appendChild(leftBtn);

  // Month label
  const label = document.createElement("span");
  label.className = "month-selector__label";
  label.textContent = monthLabel(selectedMonthKey);
  wrap.appendChild(label);

  // Right arrow
  const rightBtn = document.createElement("button");
  rightBtn.type = "button";
  rightBtn.className = "month-selector__arrow";
  rightBtn.innerHTML = "&#8594;"; // →
  rightBtn.setAttribute("aria-label", "Mes siguiente");
  rightBtn.addEventListener("click", () => { onChange(nextMonthKey(selectedMonthKey));
  });
  wrap.appendChild(rightBtn);

  // "Hoy" button — only show when not on current month
  if (selectedMonthKey !== todayKey) {
    const todayBtn = document.createElement("button");
    todayBtn.type = "button";
    todayBtn.className = "month-selector__today";
    todayBtn.textContent = "Hoy";
    todayBtn.setAttribute("aria-label", "Volver al mes actual");
    todayBtn.addEventListener("click", () => { onChange(todayKey);
    });
    wrap.appendChild(todayBtn);
  }

  host.appendChild(wrap);
}

if (typeof window !== "undefined") {
  window.__cg_month = { previousMonthKey, nextMonthKey, currentMonthKey, monthLabel };
}
