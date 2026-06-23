(() => {
  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/router.js
  var DEFAULT_ROUTE = "dashboard";
  var VALID_ROUTES = /* @__PURE__ */ new Set(["dashboard", "add", "history", "edit", "settings"]);
  var handlers = [];
  function currentRoute() {
    const raw = (typeof location !== "undefined" ? location.hash : "") || "";
    const stripped = raw.startsWith("#") ? raw.slice(1) : raw;
    const [pathPart, queryPart] = stripped.split("?");
    const candidate = (pathPart || "").trim();
    if (candidate === "" || !VALID_ROUTES.has(candidate)) {
      return { name: (
        /** @type {"dashboard"} */
        DEFAULT_ROUTE
      ), params: new URLSearchParams() };
    }
    return {
      name: (
        /** @type {"dashboard" | "add" | "history" | "edit" | "settings"} */
        candidate
      ),
      params: new URLSearchParams(queryPart || "")
    };
  }
  function notify(route) {
    for (const h3 of handlers) {
      try {
        h3(route);
      } catch (err) {
        console.error("[router] handler threw:", err);
      }
    }
  }
  function onRouteChange(handler) {
    handlers.push(handler);
    return () => {
      const i = handlers.indexOf(handler);
      if (i >= 0) handlers.splice(i, 1);
    };
  }
  function navigate(name, params) {
    const target = VALID_ROUTES.has(name) ? name : DEFAULT_ROUTE;
    let hash = `#${target}`;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      if (qs) hash += `?${qs}`;
    }
    if (typeof location === "undefined") return;
    if (location.hash === hash) {
      notify(currentRoute());
      return;
    }
    location.hash = hash;
  }
  if (typeof window !== "undefined") {
    window.__cg_router = { currentRoute, navigate, onRouteChange };
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/format.js
  function formatEUR(cents) {
    const value = (Math.round(cents) / 100).toFixed(2);
    const [intPart, decPart] = value.split(".");
    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${withThousands},${decPart} \u20AC`;
  }
  function parseEURInput(input) {
    if (typeof input !== "string") return null;
    const trimmed = input.trim();
    if (trimmed === "") return null;
    let normalized = trimmed;
    const hasDot = normalized.includes(".");
    const hasComma = normalized.includes(",");
    if (hasDot && hasComma) {
      if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = normalized.replace(/,/g, "");
      }
    } else if (hasComma) {
      normalized = normalized.replace(",", ".");
    }
    const num = Number(normalized);
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 100);
  }
  function formatDateES(iso) {
    if (typeof iso !== "string") return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return "";
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  function parseDateInput(input) {
    if (typeof input !== "string") return null;
    const trimmed = input.trim();
    let year, month, day;
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (m) {
      year = Number(m[1]);
      month = Number(m[2]);
      day = Number(m[3]);
    } else {
      m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
      if (!m) return null;
      day = Number(m[1]);
      month = Number(m[2]);
      year = Number(m[3]);
    }
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }
  function todayISO() {
    const d = /* @__PURE__ */ new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (typeof window !== "undefined") {
    window.__cg_format = { formatEUR, parseEURInput, formatDateES, parseDateInput, todayISO };
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/storage.js
  var KEY_TX = "cg:v1:transactions";
  var KEY_UI = "cg:v1:ui-state";
  var KEY_BUDGETS = "cg:v1:budgets";
  var VALID_TYPES = /* @__PURE__ */ new Set(["expense", "income"]);
  function isValidTransaction(item) {
    if (item === null || typeof item !== "object") return false;
    const t = (
      /** @type {Record<string, unknown>} */
      item
    );
    if (typeof t.id !== "string" || t.id === "") return false;
    if (typeof t.type !== "string" || !VALID_TYPES.has(t.type)) return false;
    if (typeof t.amountCents !== "number" || !Number.isInteger(t.amountCents) || t.amountCents <= 0) return false;
    if (typeof t.categoryId !== "string" || t.categoryId === "") return false;
    if (typeof t.dateISO !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.dateISO)) return false;
    if (typeof t.description !== "string") return false;
    if (typeof t.createdAt !== "string") return false;
    if (typeof t.updatedAt !== "string") return false;
    return true;
  }
  function loadTransactions() {
    const raw = localStorage.getItem(KEY_TX);
    if (raw === null) return [];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(`[storage] ${KEY_TX} is not valid JSON; resetting.`, err);
      localStorage.removeItem(KEY_TX);
      return [];
    }
    if (!Array.isArray(parsed)) {
      console.warn(`[storage] ${KEY_TX} is not an array; resetting.`);
      localStorage.removeItem(KEY_TX);
      return [];
    }
    const result = [];
    const seenIds = /* @__PURE__ */ new Set();
    const seenContent = /* @__PURE__ */ new Set();
    let changed = false;
    for (const item of parsed) {
      if (!isValidTransaction(item)) {
        console.warn(`[storage] dropping invalid transaction:`, item);
        changed = true;
        continue;
      }
      if (seenIds.has(item.id)) {
        changed = true;
        continue;
      }
      seenIds.add(item.id);
      const contentKey = `${item.type}|${item.amountCents}|${item.categoryId}|${item.dateISO}|${item.description}`;
      if (seenContent.has(contentKey)) {
        changed = true;
        continue;
      }
      seenContent.add(contentKey);
      result.push(
        /** @type {Transaction} */
        item
      );
    }
    if (changed) {
      console.warn(`[storage] cleaned ${parsed.length - result.length} duplicate/invalid transactions`);
      localStorage.setItem(KEY_TX, JSON.stringify(result));
    }
    return result;
  }
  function saveTransaction(tx) {
    if (!isValidTransaction(tx)) {
      console.warn(`[storage] refusing to save invalid transaction:`, tx);
      return;
    }
    const list = loadTransactions();
    list.push(tx);
    localStorage.setItem(KEY_TX, JSON.stringify(list));
  }
  function deleteTransaction(id) {
    const list = loadTransactions();
    const next = list.filter((t) => t.id !== id);
    if (next.length === list.length) return;
    localStorage.setItem(KEY_TX, JSON.stringify(next));
  }
  function updateTransaction(id, updates) {
    const list = loadTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const merged = { ...list[idx], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (!isValidTransaction(merged)) {
      console.warn(`[storage] refusing to update to invalid transaction:`, merged);
      return;
    }
    list[idx] = merged;
    localStorage.setItem(KEY_TX, JSON.stringify(list));
  }
  function loadUIState() {
    const raw = localStorage.getItem(KEY_UI);
    if (raw === null) {
      const def = defaultUIState();
      localStorage.setItem(KEY_UI, JSON.stringify(def));
      return def;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(`[storage] ${KEY_UI} is not valid JSON; resetting.`, err);
      const def = defaultUIState();
      localStorage.setItem(KEY_UI, JSON.stringify(def));
      return def;
    }
    if (!parsed || typeof parsed !== "object" || typeof parsed.selectedMonth !== "string" || !/^\d{4}-\d{2}$/.test(parsed.selectedMonth)) {
      console.warn(`[storage] ${KEY_UI} shape mismatch; resetting.`);
      const def = defaultUIState();
      localStorage.setItem(KEY_UI, JSON.stringify(def));
      return def;
    }
    return (
      /** @type {UIState} */
      parsed
    );
  }
  function saveUIState(state) {
    if (!state || typeof state !== "object" || typeof state.selectedMonth !== "string") {
      console.warn(`[storage] refusing to save invalid ui-state:`, state);
      return;
    }
    localStorage.setItem(KEY_UI, JSON.stringify(state));
  }
  function defaultUIState() {
    return { selectedMonth: todayISO().slice(0, 7) };
  }
  function loadBudgets(monthKey) {
    const out = /* @__PURE__ */ new Map();
    const raw = localStorage.getItem(KEY_BUDGETS);
    if (!raw) return out;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return out;
      const monthData = parsed[monthKey];
      if (!monthData || typeof monthData !== "object") return out;
      for (const [catId, cents] of Object.entries(monthData)) {
        if (typeof cents === "number" && Number.isFinite(cents) && cents >= 0) {
          out.set(catId, cents);
        }
      }
    } catch (_) {
    }
    return out;
  }
  function saveBudget(monthKey, categoryId, amountCents) {
    let all = {};
    const raw = localStorage.getItem(KEY_BUDGETS);
    if (raw) {
      try {
        all = JSON.parse(raw) || {};
      } catch (_) {
      }
    }
    if (!all[monthKey] || typeof all[monthKey] !== "object") all[monthKey] = {};
    if (amountCents <= 0) {
      delete all[monthKey][categoryId];
    } else {
      all[monthKey][categoryId] = Math.round(amountCents);
    }
    localStorage.setItem(KEY_BUDGETS, JSON.stringify(all));
  }
  function deleteBudget(monthKey, categoryId) {
    saveBudget(monthKey, categoryId, 0);
  }
  if (typeof window !== "undefined") {
    window.__cg_storage = {
      loadTransactions,
      saveTransaction,
      deleteTransaction,
      updateTransaction,
      loadUIState,
      saveUIState,
      loadBudgets,
      saveBudget,
      deleteBudget,
      /** Wipe both keys. Used during manual testing. */
      _reset() {
        localStorage.removeItem(KEY_TX);
        localStorage.removeItem(KEY_UI);
        localStorage.removeItem(KEY_BUDGETS);
      }
    };
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/categories.js
  var CATEGORIES = Object.freeze([
    Object.freeze({ id: "ocio", name: "Ocio", type: "expense", icon: "\u{1F3AC}", color: "#8B5CF6" }),
    Object.freeze({ id: "compras", name: "Compras", type: "expense", icon: "\u{1F6D2}", color: "#EC4899" }),
    Object.freeze({ id: "comida", name: "Comida", type: "expense", icon: "\u{1F354}", color: "#F59E0B" }),
    Object.freeze({ id: "alquiler", name: "Alquiler", type: "expense", icon: "\u{1F3E0}", color: "#3B82F6" }),
    Object.freeze({ id: "ahorro", name: "Ahorro", type: "expense", icon: "\u{1F4B0}", color: "#10B981" }),
    Object.freeze({ id: "sueldo", name: "Sueldo", type: "income", icon: "\u{1F4BC}", color: "#1F8F61" }),
    Object.freeze({ id: "viajes", name: "Viajes", type: "expense", icon: "\u2708\uFE0F", color: "#0EA5E9" }),
    Object.freeze({ id: "otros", name: "Otros", type: "ambos", icon: "\u{1F4E6}", color: "#6B7280" })
  ]);
  function getCategoryById(id) {
    return CATEGORIES.find((c) => c.id === id);
  }
  var KEY_CUSTOM_CATS = "cg:v1:custom-categories";
  var KEY_HIDDEN_CATS = "cg:v1:hidden-categories";
  function loadCustomCategories() {
    const raw = localStorage.getItem(KEY_CUSTOM_CATS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (c) => c && typeof c.id === "string" && c.id !== "" && typeof c.name === "string" && c.name !== "" && (c.type === "expense" || c.type === "income" || c.type === "ambos")
      );
    } catch (_) {
      return [];
    }
  }
  function loadHiddenCategories() {
    const raw = localStorage.getItem(KEY_HIDDEN_CATS);
    if (!raw) return /* @__PURE__ */ new Set();
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return /* @__PURE__ */ new Set();
      return new Set(parsed.filter((id) => typeof id === "string"));
    } catch (_) {
      return /* @__PURE__ */ new Set();
    }
  }
  function loadAllCategories() {
    const hidden = loadHiddenCategories();
    const customs = loadCustomCategories();
    const defaults = CATEGORIES.filter((c) => !hidden.has(c.id));
    return [...defaults, ...customs];
  }
  function saveCustomCategory(cat) {
    if (!cat || typeof cat.id !== "string" || typeof cat.name !== "string") return;
    const customs = loadCustomCategories();
    const exists = customs.some((c) => c.id === cat.id) || CATEGORIES.some((c) => c.id === cat.id);
    if (exists) return;
    customs.push(cat);
    localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify(customs));
  }
  function deleteCategory(id) {
    const customs = loadCustomCategories();
    const isCustom = customs.some((c) => c.id === id);
    if (isCustom) {
      const next = customs.filter((c) => c.id !== id);
      localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify(next));
      return;
    }
    if (CATEGORIES.some((c) => c.id === id)) {
      const hidden = loadHiddenCategories();
      hidden.add(id);
      localStorage.setItem(KEY_HIDDEN_CATS, JSON.stringify([...hidden]));
    }
  }
  function restoreHiddenCategories() {
    localStorage.removeItem(KEY_HIDDEN_CATS);
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/totals.js
  function computeTotals(transactions, monthKey) {
    let income = 0;
    let expenses = 0;
    let count = 0;
    for (const t of transactions) {
      if (typeof t.dateISO !== "string" || !t.dateISO.startsWith(monthKey)) continue;
      count += 1;
      if (t.type === "income") {
        income += t.amountCents;
      } else if (t.type === "expense") {
        expenses += t.amountCents;
      }
    }
    return { income, expenses, net: income - expenses, count };
  }
  function groupByCategory(transactions, monthKey) {
    const out = /* @__PURE__ */ new Map();
    for (const t of transactions) {
      if (typeof t.dateISO !== "string" || !t.dateISO.startsWith(monthKey)) continue;
      const cur = out.get(t.categoryId) ?? { amountCents: 0, count: 0 };
      cur.amountCents += t.amountCents;
      cur.count += 1;
      out.set(t.categoryId, cur);
    }
    return out;
  }
  if (typeof window !== "undefined") {
    window.__cg_totals = { computeTotals, groupByCategory };
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/views/month-selector.js
  var MONTH_NAMES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ];
  function currentMonthKey() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function previousMonthKey(monthKey) {
    const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
    if (!m) return monthKey;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    return `${prev.year}-${String(prev.month).padStart(2, "0")}`;
  }
  function nextMonthKey(monthKey) {
    const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
    if (!m) return monthKey;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    return `${next.year}-${String(next.month).padStart(2, "0")}`;
  }
  function monthLabel(monthKey) {
    const m = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
    if (!m) return monthKey || "";
    const name = MONTH_NAMES[Number(m[2]) - 1] || "";
    return name ? `${name} ${m[1]}` : monthKey;
  }
  function renderMonthSelector(host, selectedMonthKey, onChange) {
    host.innerHTML = "";
    const todayKey = currentMonthKey();
    const wrap = document.createElement("div");
    wrap.className = "month-selector";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Navegaci\xF3n de mes");
    const leftBtn = document.createElement("button");
    leftBtn.type = "button";
    leftBtn.className = "month-selector__arrow";
    leftBtn.innerHTML = "&#8592;";
    leftBtn.setAttribute("aria-label", "Mes anterior");
    leftBtn.addEventListener("click", () => {
      onChange(previousMonthKey(selectedMonthKey));
    });
    wrap.appendChild(leftBtn);
    const label = document.createElement("span");
    label.className = "month-selector__label";
    label.textContent = monthLabel(selectedMonthKey);
    wrap.appendChild(label);
    const rightBtn = document.createElement("button");
    rightBtn.type = "button";
    rightBtn.className = "month-selector__arrow";
    rightBtn.innerHTML = "&#8594;";
    rightBtn.setAttribute("aria-label", "Mes siguiente");
    rightBtn.addEventListener("click", () => {
      onChange(nextMonthKey(selectedMonthKey));
    });
    wrap.appendChild(rightBtn);
    if (selectedMonthKey !== todayKey) {
      const todayBtn = document.createElement("button");
      todayBtn.type = "button";
      todayBtn.className = "month-selector__today";
      todayBtn.textContent = "Hoy";
      todayBtn.setAttribute("aria-label", "Volver al mes actual");
      todayBtn.addEventListener("click", () => {
        onChange(todayKey);
      });
      wrap.appendChild(todayBtn);
    }
    host.appendChild(wrap);
  }
  if (typeof window !== "undefined") {
    window.__cg_month = { previousMonthKey, nextMonthKey, currentMonthKey, monthLabel };
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/views/dashboard.js
  function renderDashboard(root) {
    root.innerHTML = "";
    const { selectedMonth: monthKey } = loadUIState();
    const allTxs = loadTransactions();
    const monthTxs = allTxs.filter((t) => typeof t.dateISO === "string" && t.dateISO.startsWith(monthKey)).slice().sort((a, b) => a.dateISO !== b.dateISO ? a.dateISO < b.dateISO ? 1 : -1 : a.createdAt < b.createdAt ? 1 : -1);
    const totals = computeTotals(monthTxs, monthKey);
    const screen = el("section", "dashboard");
    screen.setAttribute("aria-labelledby", "dashboard-title");
    const header = el("header", "dashboard__header");
    const titleWrap = el("div", "dashboard__title-wrap");
    titleWrap.appendChild(el("h1", "dashboard__title", "Ahorrio"));
    header.appendChild(titleWrap);
    const addBtn = el("button", "fab", "+ A\xF1adir");
    addBtn.type = "button";
    addBtn.setAttribute("aria-label", "A\xF1adir transacci\xF3n");
    addBtn.addEventListener("click", () => {
      navigate("add");
    });
    const hamburgerBtn = el("button", "hamburger-btn", "\u2630");
    hamburgerBtn.type = "button";
    hamburgerBtn.setAttribute("aria-label", "Abrir men\xFA");
    header.appendChild(addBtn);
    header.appendChild(hamburgerBtn);
    screen.appendChild(header);
    const selectorHost = el("div", "dashboard__selector");
    screen.appendChild(selectorHost);
    renderMonthSelector(selectorHost, monthKey, (newKey) => {
      saveUIState({ selectedMonth: newKey });
      renderDashboard(root);
    });
    const card = el("section", "totals-card");
    card.setAttribute("aria-label", "Totales del mes");
    card.appendChild(totalsRow("Ingresos", formatEUR(totals.income), "income", totals.income === 0 ? "Sin ingresos este mes" : null));
    card.appendChild(totalsRow("Gastos", formatEUR(totals.expenses), "expense", totals.expenses === 0 ? "Sin gastos este mes" : null));
    card.appendChild(totalsRow("Neto", formatEUR(totals.net), totals.net >= 0 ? "income" : "expense", totals.count === 0 ? "Sin movimientos" : null));
    screen.appendChild(card);
    const expenseTxsForBudget = monthTxs.filter((t) => t.type === "expense");
    const byCatForBudget = groupByCategory(expenseTxsForBudget, monthKey);
    if (expenseTxsForBudget.length > 0) {
      const entries = [...byCatForBudget.entries()].map(([catId, data]) => {
        const cat = getCategoryById(catId) || { name: catId, icon: "?", color: "#6B7280" };
        return { catId, name: cat.name, icon: cat.icon, color: cat.color, amount: data.amountCents };
      }).sort((a, b) => b.amount - a.amount);
      const chartSection = el("section", "chart-section");
      chartSection.setAttribute("aria-label", "Gr\xE1fico de gastos por categor\xEDa");
      chartSection.appendChild(el("h2", "chart-section__title", "Gastos por categor\xEDa"));
      const chartWrap = el("div", "chart-wrap");
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 240;
      canvas.className = "pie-chart";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Gr\xE1fico circular de gastos por categor\xEDa");
      chartWrap.appendChild(canvas);
      const legend = el("div", "chart-legend");
      const totalExpenses = entries.reduce((sum, e) => sum + e.amount, 0);
      for (const entry of entries) {
        const pct = totalExpenses > 0 ? Math.round(entry.amount / totalExpenses * 100) : 0;
        const item = el("div", "chart-legend__item");
        const dot = el("span", "chart-legend__dot");
        dot.style.background = entry.color;
        item.appendChild(dot);
        item.appendChild(el("span", "chart-legend__name", `${entry.icon} ${entry.name}`));
        item.appendChild(el("span", "chart-legend__pct", `${pct}%`));
        item.appendChild(el("span", "chart-legend__amount", formatEUR(entry.amount)));
        legend.appendChild(item);
      }
      chartWrap.appendChild(legend);
      chartSection.appendChild(chartWrap);
      screen.appendChild(chartSection);
      requestAnimationFrame(() => drawPieChart(canvas, entries));
    }
    renderBudgetSection(screen, monthKey, byCatForBudget, root);
    if (monthTxs.length === 0) {
      const empty = el("div", "empty-state");
      const emptyIcon = el("div", "empty-state__icon", "\u{1F4B0}");
      empty.appendChild(emptyIcon);
      empty.appendChild(el("p", "empty-state__title", "A\xFAn no hay movimientos este mes"));
      const cta = el("button", "btn btn--primary empty-state__cta", "+ A\xF1adir transacci\xF3n");
      cta.type = "button";
      cta.addEventListener("click", () => {
        navigate("add");
      });
      empty.appendChild(cta);
      screen.appendChild(empty);
    } else {
      const list = el("ul", "tx-list");
      list.setAttribute("aria-label", "Movimientos del mes");
      for (const tx of monthTxs) list.appendChild(txItem(tx, root));
      screen.appendChild(list);
    }
    const menuPanel = createMenuPanel(root);
    screen.appendChild(menuPanel.overlay);
    screen.appendChild(menuPanel.panel);
    hamburgerBtn.addEventListener("click", () => {
      menuPanel.open();
    });
    root.appendChild(screen);
  }
  function renderBudgetSection(screen, monthKey, byCatForBudget, root) {
    const budgets = loadBudgets(monthKey);
    const allCats = loadAllCategories().filter((c) => c.type === "expense" || c.type === "ambos");
    const budgetSection = el("section", "budget-section");
    budgetSection.setAttribute("aria-label", "Presupuestos del mes");
    budgetSection.appendChild(el("h2", "budget-section__title", "Presupuestos"));
    let hasBudgets = false;
    for (const [catId, budgetCents] of budgets) {
      if (budgetCents <= 0) continue;
      hasBudgets = true;
      const cat = getCategoryById(catId) || { name: catId, icon: "?", color: "#6B7280" };
      const spent = byCatForBudget.get(catId)?.amountCents || 0;
      const pct = budgetCents > 0 ? Math.min(100, Math.round(spent / budgetCents * 100)) : 0;
      const actualPct = budgetCents > 0 ? Math.round(spent / budgetCents * 100) : 0;
      const tone = actualPct >= 100 ? "danger" : actualPct >= 80 ? "warning" : "ok";
      const remaining = budgetCents - spent;
      const row = el("div", "budget-row");
      const labelRow = el("div", "budget-row__label");
      labelRow.appendChild(el("span", "budget-row__icon", cat.icon));
      labelRow.appendChild(el("span", "budget-row__name", cat.name));
      const pctSpan = el("span", `budget-row__pct budget-row__pct--${tone}`, `${actualPct}%`);
      labelRow.appendChild(pctSpan);
      row.appendChild(labelRow);
      const barBg = el("div", "budget-bar");
      const barFill = el("div", `budget-bar__fill budget-bar__fill--${tone}`);
      barFill.style.width = `${pct}%`;
      barBg.appendChild(barFill);
      row.appendChild(barBg);
      const amounts = el("span", "budget-row__amounts", `${formatEUR(spent)} / ${formatEUR(budgetCents)}`);
      row.appendChild(amounts);
      const remainingClass = `budget-row__remaining budget-row__remaining--${tone}`;
      const remainingText = remaining >= 0 ? `quedan ${formatEUR(remaining)}` : `te pasaste ${formatEUR(Math.abs(remaining))}`;
      row.appendChild(el("span", remainingClass, remainingText));
      budgetSection.appendChild(row);
    }
    const addBudgetBtn = el("button", "budget-add-btn", "+ A\xF1adir presupuesto");
    addBudgetBtn.type = "button";
    addBudgetBtn.addEventListener("click", () => {
      const existingForm = budgetSection.querySelector(".budget-add-form");
      if (existingForm) {
        existingForm.remove();
        return;
      }
      const form = createBudgetAddForm(monthKey, root, allCats, budgets);
      budgetSection.appendChild(form);
    });
    budgetSection.appendChild(addBudgetBtn);
    screen.appendChild(budgetSection);
  }
  function createBudgetAddForm(monthKey, root, allCats, existingBudgets) {
    const form = el("div", "budget-add-form");
    const row = el("div", "budget-add-form__row");
    const select = el("select", "budget-add-form__select");
    select.setAttribute("aria-label", "Categor\xEDa");
    const defaultOpt = el("option", null, "Seleccionar categor\xEDa");
    defaultOpt.value = "";
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    select.appendChild(defaultOpt);
    for (const cat of allCats) {
      const opt = el("option", null, `${cat.icon} ${cat.name}`);
      opt.value = cat.id;
      select.appendChild(opt);
    }
    row.appendChild(select);
    const input = el("input", "budget-add-form__input");
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "0,00 \u20AC";
    input.setAttribute("aria-label", "Importe del presupuesto");
    row.appendChild(input);
    const saveBtn = el("button", "budget-add-form__btn", "Guardar");
    saveBtn.type = "button";
    saveBtn.addEventListener("click", () => {
      const catId = select.value;
      if (!catId) return;
      const cents = parseEURInput(input.value);
      if (cents === null || cents <= 0) return;
      saveBudget(monthKey, catId, cents);
      renderDashboard(root);
    });
    row.appendChild(saveBtn);
    form.appendChild(row);
    return form;
  }
  function totalsRow(label, value, tone, subCopy) {
    const row = el("div", "totals-card__row");
    const labelCol = el("div", "totals-card__label-col");
    labelCol.appendChild(el("span", "totals-card__label", label));
    if (subCopy) labelCol.appendChild(el("span", "totals-card__sub", subCopy));
    row.appendChild(labelCol);
    row.appendChild(el("span", `totals-card__value totals-card__value--${tone}`, value));
    return row;
  }
  function txItem(tx, root) {
    const li = el("li", `tx-item tx-item--${tx.type}`);
    const cat = getCategoryById(tx.categoryId) || { name: tx.categoryId, icon: "?" };
    const icon = el("span", "tx-item__icon", cat.icon || "?");
    icon.setAttribute("aria-hidden", "true");
    li.appendChild(icon);
    const main = el("div", "tx-item__main");
    const nameRow = el("div", "tx-item__name");
    nameRow.appendChild(el("span", "tx-item__category", cat.name));
    if (tx.description && tx.description.trim() !== "") {
      nameRow.appendChild(el("span", "tx-item__sep", " \xB7 "));
      nameRow.appendChild(el("span", "tx-item__description", tx.description));
    }
    main.appendChild(nameRow);
    main.appendChild(el("div", "tx-item__date", formatDateES(tx.dateISO)));
    li.appendChild(main);
    const sign = tx.type === "income" ? "+" : "-";
    li.appendChild(el("span", `tx-item__amount tx-item__amount--${tx.type}`, `${sign}${formatEUR(tx.amountCents)}`));
    const actions = el("div", "tx-item__actions");
    const editBtn = el("button", "tx-item__edit");
    editBtn.type = "button";
    editBtn.textContent = "Editar";
    editBtn.setAttribute("aria-label", `Editar ${cat.name} de ${formatEUR(tx.amountCents)}`);
    editBtn.addEventListener("click", () => {
      navigate("edit", { id: tx.id });
    });
    actions.appendChild(editBtn);
    const del = el("button", "tx-item__delete");
    del.type = "button";
    del.textContent = "Borrar";
    del.setAttribute("aria-label", `Borrar ${cat.name} de ${formatEUR(tx.amountCents)}`);
    del.addEventListener("click", () => {
      if (!window.confirm("\xBFBorrar este movimiento?")) return;
      deleteTransaction(tx.id);
      renderDashboard(root);
    });
    actions.appendChild(del);
    li.appendChild(actions);
    return li;
  }
  function drawPieChart(canvas, entries) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 8;
    const total = entries.reduce((sum, e) => sum + e.amount, 0);
    if (total === 0) return;
    let startAngle = -Math.PI / 2;
    for (const entry of entries) {
      const sliceAngle = entry.amount / total * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = entry.color;
      ctx.fill();
      startAngle += sliceAngle;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.fillStyle = "#1A1F2B";
    ctx.font = "bold 14px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formatEUR(total), cx, cy - 6);
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillStyle = "#6B7280";
    ctx.fillText("Total", cx, cy + 10);
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0 && text !== null) node.textContent = String(text);
    return node;
  }
  function createMenuPanel(root) {
    const overlay = el("div", "menu-overlay");
    overlay.hidden = true;
    const panel = el("div", "menu-panel");
    panel.hidden = true;
    const header = el("div", "menu-panel__header");
    header.appendChild(el("h2", "menu-panel__title", "Men\xFA"));
    const closeBtn = el("button", "menu-panel__close", "\u2715");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Cerrar men\xFA");
    header.appendChild(closeBtn);
    panel.appendChild(header);
    const catSection = el("div", "menu-section");
    catSection.appendChild(el("h3", "menu-section__title", "Categor\xEDas"));
    const catForm = el("form", "category-form");
    catForm.setAttribute("aria-label", "A\xF1adir categor\xEDa");
    const nameInput = el("input", "category-form__input");
    nameInput.type = "text";
    nameInput.placeholder = "Nombre";
    nameInput.setAttribute("aria-label", "Nombre de categor\xEDa");
    const typeSelect = el("select", "category-form__select");
    typeSelect.setAttribute("aria-label", "Tipo de categor\xEDa");
    const optExpense = el("option", null, "Gasto");
    optExpense.value = "expense";
    const optIncome = el("option", null, "Ingreso");
    optIncome.value = "income";
    const optBoth = el("option", null, "Ambos");
    optBoth.value = "ambos";
    typeSelect.appendChild(optExpense);
    typeSelect.appendChild(optIncome);
    typeSelect.appendChild(optBoth);
    const addCatBtn = el("button", "category-form__btn", "A\xF1adir");
    addCatBtn.type = "button";
    catForm.appendChild(nameInput);
    catForm.appendChild(typeSelect);
    catForm.appendChild(addCatBtn);
    catSection.appendChild(catForm);
    const catList = el("div", "category-list");
    catSection.appendChild(catList);
    panel.appendChild(catSection);
    const historySection = el("div", "menu-section");
    const historyLink = el("button", "menu-section__link", "Ver historial mensual");
    historyLink.type = "button";
    historyLink.addEventListener("click", () => {
      close();
      navigate("history");
    });
    historySection.appendChild(el("h3", "menu-section__title", "Historial mensual"));
    historySection.appendChild(historyLink);
    panel.appendChild(historySection);
    const settingsSection = el("div", "menu-section");
    const settingsLink = el("button", "menu-section__link", "Configuraci\xF3n");
    settingsLink.type = "button";
    settingsLink.addEventListener("click", () => {
      close();
      navigate("settings");
    });
    settingsSection.appendChild(el("h3", "menu-section__title", "Ajustes"));
    settingsSection.appendChild(settingsLink);
    panel.appendChild(settingsSection);
    const dangerSection = el("div", "menu-section");
    const clearBtn = el("button", "menu-section__danger-btn", "Borrar todos los datos");
    clearBtn.type = "button";
    clearBtn.addEventListener("click", () => {
      if (!window.confirm("\xBFEst\xE1s seguro? Se borrar\xE1n TODOS los datos. Esta acci\xF3n no se puede deshacer.")) return;
      localStorage.clear();
      close();
      renderDashboard(root);
    });
    dangerSection.appendChild(el("h3", "menu-section__title", "Datos"));
    dangerSection.appendChild(clearBtn);
    panel.appendChild(dangerSection);
    function open() {
      overlay.hidden = false;
      panel.hidden = false;
      requestAnimationFrame(() => {
        overlay.classList.add("menu-overlay--visible");
        panel.classList.add("menu-panel--open");
      });
      renderCategoryList();
    }
    function close() {
      overlay.classList.remove("menu-overlay--visible");
      panel.classList.remove("menu-panel--open");
      setTimeout(() => {
        overlay.hidden = true;
        panel.hidden = true;
      }, 300);
    }
    function renderCategoryList() {
      catList.innerHTML = "";
      const allCats = loadAllCategories();
      for (const cat of allCats) {
        const item = el("div", "category-item");
        const nameSpan = el("span", "category-item__name", `${cat.icon} ${cat.name}`);
        const typeBadge = el("span", `category-item__type category-item__type--${cat.type}`, cat.type === "expense" ? "Gasto" : cat.type === "income" ? "Ingreso" : "Ambos");
        item.appendChild(nameSpan);
        item.appendChild(typeBadge);
        const delBtn = el("button", "category-item__delete", "\u2715");
        delBtn.type = "button";
        delBtn.setAttribute("aria-label", `Eliminar ${cat.name}`);
        delBtn.addEventListener("click", () => {
          if (!window.confirm(`\xBFEliminar la categor\xEDa "${cat.name}"?`)) return;
          deleteCategory(cat.id);
          renderCategoryList();
        });
        item.appendChild(delBtn);
        catList.appendChild(item);
      }
      const restoreBtn = el("button", "category-restore-btn", "Restaurar categor\xEDas por defecto");
      restoreBtn.type = "button";
      restoreBtn.addEventListener("click", () => {
        restoreHiddenCategories();
        renderCategoryList();
      });
      catList.appendChild(restoreBtn);
    }
    addCatBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const type = typeSelect.value;
      const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!id) return;
      const icon = type === "income" ? "\u{1F4B5}" : "\u{1F3F7}\uFE0F";
      saveCustomCategory({ id, name, type, icon, color: "#6B7280" });
      nameInput.value = "";
      renderCategoryList();
    });
    closeBtn.addEventListener("click", () => {
      close();
    });
    overlay.addEventListener("click", () => {
      close();
    });
    return { overlay, panel, open, close };
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/views/add.js
  var categoriesFor = (tipo) => loadAllCategories().filter((c) => tipo === "Gasto" ? c.type === "expense" || c.type === "ambos" : c.type === "income" || c.type === "ambos");
  var newId = () => {
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  };
  function renderAddView(root) {
    root.innerHTML = "";
    let tipo = "Gasto";
    let fecha = todayISO();
    let description = "";
    const screen = h("section", { className: "add-view", "aria-labelledby": "add-title" });
    const back = h("button", { className: "add-view__back", type: "button", "aria-label": "Volver al inicio" }, "\u2190 Atr\xE1s");
    back.addEventListener("click", () => {
      navigate("dashboard");
    });
    const title = h("h1", { className: "add-view__title", id: "add-title" }, "A\xF1adir transacci\xF3n");
    screen.appendChild(h("header", { className: "add-view__header" }, [back, title]));
    const form = h("form", { className: "add-view__form", noValidate: true, "aria-label": "Formulario de transacci\xF3n" });
    const segBtns = [];
    const seg = h("div", { className: "segmented", role: "group", "aria-label": "Tipo de movimiento" });
    for (
      const opt of
      /** @type {const} */
      ["Gasto", "Ingreso"]
    ) {
      const b = h("button", { className: "segmented__option", type: "button", "aria-pressed": opt === tipo ? "true" : "false", dataset: { tipo: opt } }, opt);
      if (opt === tipo) b.classList.add("segmented__option--active");
      b.addEventListener("click", () => {
        setTipo(opt);
      });
      seg.appendChild(b);
      segBtns.push({ value: opt, node: b });
    }
    const tipoError = errPara();
    form.appendChild(h("div", { className: "field field--segmented" }, [h("span", { className: "field__label" }, "Tipo"), seg, tipoError]));
    const importeInput = h("input", { className: "field__input", type: "text", id: "add-importe", inputMode: "decimal", autocomplete: "off", placeholder: "0,00" });
    const importeError = errPara();
    importeInput.setAttribute("aria-describedby", importeError.id);
    form.appendChild(buildField("Importe (\u20AC)", importeInput, importeError));
    const catSelect = h("select", { className: "field__input field__input--select", id: "add-categoria" });
    const catError = errPara();
    form.appendChild(buildField("Categor\xEDa", catSelect, catError));
    const fechaInput = h("input", { className: "field__input", type: "date", id: "add-fecha", value: fecha });
    fechaInput.addEventListener("change", () => {
      fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaInput.value) ? fechaInput.value : todayISO();
    });
    form.appendChild(buildField("Fecha", fechaInput));
    const descInput = h("input", { className: "field__input", type: "text", id: "add-desc", maxLength: 120, placeholder: "Descripci\xF3n (opcional)" });
    descInput.addEventListener("input", () => {
      description = descInput.value;
    });
    form.appendChild(buildField("Descripci\xF3n (opcional)", descInput));
    const saveBtn = h("button", { className: "btn btn--primary add-view__save", type: "button" }, "Guardar");
    saveBtn.disabled = true;
    const cancelBtn = h("button", { className: "btn btn--secondary add-view__cancel", type: "button" }, "Cancelar");
    cancelBtn.addEventListener("click", () => {
      navigate("dashboard");
    });
    form.appendChild(h("div", { className: "add-view__actions" }, [saveBtn, cancelBtn]));
    saveBtn.addEventListener("click", () => {
      if (!saveBtn.disabled) handleSave();
    });
    screen.appendChild(form);
    root.appendChild(screen);
    catSelect.addEventListener("change", () => {
      catError.hidden = true;
      updateSaveEnabled();
    });
    importeInput.addEventListener("input", () => {
      importeError.hidden = true;
      updateSaveEnabled();
    });
    function populateCategorias() {
      catSelect.innerHTML = "";
      for (const c of categoriesFor(tipo)) {
        const opt = h("option", { value: c.id }, `${c.icon}  ${c.name}`);
        catSelect.appendChild(opt);
      }
      if (catSelect.options.length > 0) catSelect.value = catSelect.options[0].value;
    }
    function setTipo(next) {
      if (next === tipo || next !== "Gasto" && next !== "Ingreso") return;
      tipo = next;
      for (const s of segBtns) {
        const active = s.value === next;
        s.node.setAttribute("aria-pressed", active ? "true" : "false");
        s.node.classList.toggle("segmented__option--active", active);
      }
      populateCategorias();
      updateSaveEnabled();
    }
    function updateSaveEnabled() {
      const cents = parseEURInput(importeInput.value);
      saveBtn.disabled = !(cents !== null && cents > 0 && catSelect.value !== "");
    }
    function handleSave() {
      const cents = parseEURInput(importeInput.value);
      if (cents === null || cents <= 0) {
        showErr(importeError, "Introduce un importe v\xE1lido.");
        importeInput.focus();
        return;
      }
      if (catSelect.value === "") {
        showErr(catError, "Selecciona una categor\xEDa.");
        catSelect.focus();
        return;
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const tx = {
        id: newId(),
        type: tipo === "Gasto" ? "expense" : "income",
        amountCents: cents,
        categoryId: catSelect.value,
        dateISO: fecha,
        description: description.trim(),
        createdAt: now,
        updatedAt: now
      };
      saveTransaction(tx);
      navigate("dashboard");
    }
    populateCategorias();
    updateSaveEnabled();
    requestAnimationFrame(() => {
      try {
        importeInput.focus({ preventScroll: true });
      } catch (_) {
        importeInput.focus();
      }
    });
  }
  function h(tag, attrs, children) {
    const el4 = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "className") el4.className = v;
      else if (k === "dataset" && typeof v === "object") Object.assign(el4.dataset, v);
      else el4.setAttribute(k, String(v));
    }
    if (children !== void 0 && children !== null) {
      if (Array.isArray(children)) for (const c of children) el4.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      else el4.appendChild(typeof children === "string" ? document.createTextNode(children) : children);
    }
    return el4;
  }
  var buildField = (label, input, errorEl) => {
    const wrap = h("div", { className: "field" });
    const l = h("label", { className: "field__label" }, label);
    if (input.id) l.htmlFor = input.id;
    wrap.appendChild(l);
    wrap.appendChild(input);
    if (errorEl) wrap.appendChild(errorEl);
    return wrap;
  };
  var errPara = () => {
    const p = h("p", { className: "field__error", "aria-live": "polite", id: `err-${Math.random().toString(36).slice(2, 9)}` });
    p.hidden = true;
    return p;
  };
  var showErr = (el4, msg) => {
    el4.textContent = msg;
    el4.hidden = false;
  };

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/views/history.js
  function renderHistoryView(root) {
    root.innerHTML = "";
    const allTxs = loadTransactions();
    const months = aggregateMonths(allTxs);
    const screen = el2("section", "history-view");
    screen.setAttribute("aria-labelledby", "history-title");
    const header = el2("header", "history-view__header");
    const back = el2("button", "history-view__back", "\u2190 Atr\xE1s");
    back.type = "button";
    back.setAttribute("aria-label", "Volver al inicio");
    back.addEventListener("click", () => {
      navigate("dashboard");
    });
    header.appendChild(back);
    header.appendChild(el2("h1", "history-view__title", "Historial mensual"));
    screen.appendChild(header);
    if (months.length === 0) {
      const empty = el2("div", "empty-state");
      empty.appendChild(el2("p", "empty-state__title", "A\xFAn no hay datos para mostrar"));
      screen.appendChild(empty);
      root.appendChild(screen);
      return;
    }
    const chartSection = el2("section", "history-view__chart-section");
    chartSection.appendChild(el2("h2", "history-view__section-title", "Gastos por mes"));
    const chartContainer = el2("div", "bar-chart");
    const canvas = document.createElement("canvas");
    canvas.className = "bar-chart__canvas";
    canvas.width = 600;
    canvas.height = 300;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Gr\xE1fico de barras de gastos mensuales");
    chartContainer.appendChild(canvas);
    chartSection.appendChild(chartContainer);
    screen.appendChild(chartSection);
    const summarySection = el2("section", "history-view__summary-section");
    summarySection.appendChild(el2("h2", "history-view__section-title", "Resumen mensual"));
    const summaryList = el2("div", "month-summary-list");
    let cumulativeSavings = 0;
    for (const month of months) {
      cumulativeSavings += month.net;
      const row = el2("div", "month-summary");
      const labelCol = el2("div", "month-summary__label");
      labelCol.appendChild(el2("span", "month-summary__month", month.label));
      labelCol.appendChild(el2("span", "month-summary__count", `${month.count} movimiento${month.count !== 1 ? "s" : ""}`));
      row.appendChild(labelCol);
      const valuesCol = el2("div", "month-summary__values");
      valuesCol.appendChild(el2("span", "month-summary__income", `+${formatEUR(month.income)}`));
      valuesCol.appendChild(el2("span", "month-summary__expenses", `-${formatEUR(month.expenses)}`));
      row.appendChild(valuesCol);
      const netCol = el2("div", "month-summary__net");
      netCol.appendChild(el2("span", `month-summary__net-value ${month.net >= 0 ? "month-summary__net-value--positive" : "month-summary__net-value--negative"}`, formatEUR(month.net)));
      row.appendChild(netCol);
      summaryList.appendChild(row);
    }
    summarySection.appendChild(summaryList);
    const savingsRow = el2("div", "history-view__savings");
    savingsRow.appendChild(el2("span", "history-view__savings-label", "Ahorro acumulado"));
    const lastSavings = cumulativeSavings;
    savingsRow.appendChild(el2("span", `history-view__savings-value ${lastSavings >= 0 ? "history-view__savings-value--positive" : "history-view__savings-value--negative"}`, formatEUR(Math.abs(lastSavings))));
    summarySection.appendChild(savingsRow);
    screen.appendChild(summarySection);
    root.appendChild(screen);
    requestAnimationFrame(() => drawBarChart(canvas, months));
  }
  function aggregateMonths(txs) {
    const map = /* @__PURE__ */ new Map();
    for (const tx of txs) {
      if (typeof tx.dateISO !== "string" || tx.dateISO.length < 7) continue;
      const key = tx.dateISO.slice(0, 7);
      const cur = map.get(key) ?? { income: 0, expenses: 0, count: 0 };
      cur.count += 1;
      if (tx.type === "income") cur.income += tx.amountCents;
      else if (tx.type === "expense") cur.expenses += tx.amountCents;
      map.set(key, cur);
    }
    const sortedKeys = [...map.keys()].sort().reverse().slice(0, 12).reverse();
    return sortedKeys.map((key) => {
      const data = map.get(key) ?? { income: 0, expenses: 0, count: 0 };
      const [y, m] = key.split("-");
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const label = `${monthNames[Number(m) - 1]} ${y.slice(2)}`;
      return { key, label, income: data.income, expenses: data.expenses, net: data.income - data.expenses, count: data.count };
    });
  }
  function drawBarChart(canvas, months) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 50, left: 60 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const maxVal = Math.max(
      ...months.map((m) => Math.max(m.income, m.expenses)),
      1
    );
    const groupCount = months.length;
    const groupWidth = chartW / groupCount;
    const barWidth = Math.max(8, groupWidth * 0.7 / 2);
    const gap = Math.max(2, groupWidth * 0.1);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + chartH / gridLines * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      const val = maxVal - maxVal / gridLines * i;
      ctx.fillStyle = "#6B7280";
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(formatEUR(Math.round(val)), pad.left - 8, y);
    }
    const incomeColor = "#1F8F61";
    const expenseColor = "#C73E3A";
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      const x0 = pad.left + groupWidth * i + gap;
      const incomeH = maxVal > 0 ? m.income / maxVal * chartH : 0;
      ctx.fillStyle = incomeColor;
      ctx.fillRect(x0, pad.top + chartH - incomeH, barWidth, incomeH);
      const expenseH = maxVal > 0 ? m.expenses / maxVal * chartH : 0;
      ctx.fillStyle = expenseColor;
      ctx.fillRect(x0 + barWidth + 2, pad.top + chartH - expenseH, barWidth, expenseH);
      ctx.fillStyle = "#6B7280";
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(m.label, x0 + barWidth, pad.top + chartH + 8);
    }
    const legendY = H - 12;
    ctx.fillStyle = incomeColor;
    ctx.fillRect(pad.left, legendY - 4, 12, 12);
    ctx.fillStyle = "#1A1F2B";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Ingresos", pad.left + 16, legendY + 2);
    ctx.fillStyle = expenseColor;
    ctx.fillRect(pad.left + 90, legendY - 4, 12, 12);
    ctx.fillStyle = "#1A1F2B";
    ctx.fillText("Gastos", pad.left + 106, legendY + 2);
  }
  function el2(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0 && text !== null) node.textContent = String(text);
    return node;
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/views/edit.js
  var categoriesFor2 = (tipo) => loadAllCategories().filter((c) => tipo === "Gasto" ? c.type === "expense" || c.type === "ambos" : c.type === "income" || c.type === "ambos");
  function renderEditView(root) {
    root.innerHTML = "";
    const route = currentRoute();
    const txId = route.params.get("id");
    if (!txId) {
      navigate("dashboard");
      return;
    }
    const allTxs = loadTransactions();
    const tx = allTxs.find((t) => t.id === txId);
    if (!tx) {
      navigate("dashboard");
      return;
    }
    let tipo = tx.type === "income" ? "Ingreso" : "Gasto";
    let fecha = tx.dateISO;
    let description = tx.description || "";
    const screen = h2("section", { className: "add-view", "aria-labelledby": "edit-title" });
    const back = h2("button", { className: "add-view__back", type: "button", "aria-label": "Volver al inicio" }, "\u2190 Atr\xE1s");
    back.addEventListener("click", () => {
      navigate("dashboard");
    });
    const title = h2("h1", { className: "add-view__title", id: "edit-title" }, "Editar transacci\xF3n");
    screen.appendChild(h2("header", { className: "add-view__header" }, [back, title]));
    const form = h2("form", { className: "add-view__form", noValidate: true, "aria-label": "Formulario de edici\xF3n" });
    const segBtns = [];
    const seg = h2("div", { className: "segmented", role: "group", "aria-label": "Tipo de movimiento" });
    for (
      const opt of
      /** @type {const} */
      ["Gasto", "Ingreso"]
    ) {
      const b = h2("button", { className: "segmented__option", type: "button", "aria-pressed": opt === tipo ? "true" : "false", dataset: { tipo: opt } }, opt);
      if (opt === tipo) b.classList.add("segmented__option--active");
      b.addEventListener("click", () => {
        setTipo(opt);
      });
      seg.appendChild(b);
      segBtns.push({ value: opt, node: b });
    }
    const tipoError = errPara2();
    form.appendChild(h2("div", { className: "field field--segmented" }, [h2("span", { className: "field__label" }, "Tipo"), seg, tipoError]));
    const importeInput = h2("input", { className: "field__input", type: "text", id: "edit-importe", inputMode: "decimal", autocomplete: "off", placeholder: "0,00", value: formatEUR(tx.amountCents).replace(" \u20AC", "") });
    const importeError = errPara2();
    importeInput.setAttribute("aria-describedby", importeError.id);
    form.appendChild(buildField2("Importe (\u20AC)", importeInput, importeError));
    const catSelect = h2("select", { className: "field__input field__input--select", id: "edit-categoria" });
    const catError = errPara2();
    form.appendChild(buildField2("Categor\xEDa", catSelect, catError));
    const fechaInput = h2("input", { className: "field__input", type: "date", id: "edit-fecha", value: fecha });
    fechaInput.addEventListener("change", () => {
      fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaInput.value) ? fechaInput.value : tx.dateISO;
    });
    form.appendChild(buildField2("Fecha", fechaInput));
    const descInput = h2("input", { className: "field__input", type: "text", id: "edit-desc", maxLength: 120, placeholder: "Descripci\xF3n (opcional)", value: description });
    descInput.addEventListener("input", () => {
      description = descInput.value;
    });
    form.appendChild(buildField2("Descripci\xF3n (opcional)", descInput));
    const saveBtn = h2("button", { className: "btn btn--primary add-view__save", type: "button" }, "Guardar cambios");
    saveBtn.disabled = false;
    const cancelBtn = h2("button", { className: "btn btn--secondary add-view__cancel", type: "button" }, "Cancelar");
    cancelBtn.addEventListener("click", () => {
      navigate("dashboard");
    });
    form.appendChild(h2("div", { className: "add-view__actions" }, [saveBtn, cancelBtn]));
    saveBtn.addEventListener("click", () => {
      if (!saveBtn.disabled) handleSave();
    });
    screen.appendChild(form);
    root.appendChild(screen);
    catSelect.addEventListener("change", () => {
      catError.hidden = true;
      updateSaveEnabled();
    });
    importeInput.addEventListener("input", () => {
      importeError.hidden = true;
      updateSaveEnabled();
    });
    function populateCategorias() {
      catSelect.innerHTML = "";
      for (const c of categoriesFor2(tipo)) {
        const opt = h2("option", { value: c.id }, `${c.icon}  ${c.name}`);
        catSelect.appendChild(opt);
      }
      const match = [...catSelect.options].find((o) => o.value === tx.categoryId);
      if (match) catSelect.value = tx.categoryId;
      else if (catSelect.options.length > 0) catSelect.value = catSelect.options[0].value;
    }
    function setTipo(next) {
      if (next === tipo || next !== "Gasto" && next !== "Ingreso") return;
      tipo = next;
      for (const s of segBtns) {
        const active = s.value === next;
        s.node.setAttribute("aria-pressed", active ? "true" : "false");
        s.node.classList.toggle("segmented__option--active", active);
      }
      populateCategorias();
      updateSaveEnabled();
    }
    function updateSaveEnabled() {
      const cents = parseEURInput(importeInput.value);
      saveBtn.disabled = !(cents !== null && cents > 0 && catSelect.value !== "");
    }
    function handleSave() {
      const cents = parseEURInput(importeInput.value);
      if (cents === null || cents <= 0) {
        showErr2(importeError, "Introduce un importe v\xE1lido.");
        importeInput.focus();
        return;
      }
      if (catSelect.value === "") {
        showErr2(catError, "Selecciona una categor\xEDa.");
        catSelect.focus();
        return;
      }
      updateTransaction(tx.id, {
        type: tipo === "Gasto" ? "expense" : "income",
        amountCents: cents,
        categoryId: catSelect.value,
        dateISO: fecha,
        description: description.trim()
      });
      navigate("dashboard");
    }
    populateCategorias();
    updateSaveEnabled();
    requestAnimationFrame(() => {
      try {
        importeInput.focus({ preventScroll: true });
      } catch (_) {
        importeInput.focus();
      }
    });
  }
  function h2(tag, attrs, children) {
    const el4 = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "className") el4.className = v;
      else if (k === "dataset" && typeof v === "object") Object.assign(el4.dataset, v);
      else el4.setAttribute(k, String(v));
    }
    if (children !== void 0 && children !== null) {
      if (Array.isArray(children)) for (const c of children) el4.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      else el4.appendChild(typeof children === "string" ? document.createTextNode(children) : children);
    }
    return el4;
  }
  var buildField2 = (label, input, errorEl) => {
    const wrap = h2("div", { className: "field" });
    const l = h2("label", { className: "field__label" }, label);
    if (input.id) l.htmlFor = input.id;
    wrap.appendChild(l);
    wrap.appendChild(input);
    if (errorEl) wrap.appendChild(errorEl);
    return wrap;
  };
  var errPara2 = () => {
    const p = h2("p", { className: "field__error", "aria-live": "polite", id: `err-${Math.random().toString(36).slice(2, 9)}` });
    p.hidden = true;
    return p;
  };
  var showErr2 = (el4, msg) => {
    el4.textContent = msg;
    el4.hidden = false;
  };

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/views/settings.js
  function renderSettingsView(root) {
    root.innerHTML = "";
    const screen = el3("section", "settings-view");
    screen.setAttribute("aria-labelledby", "settings-title");
    const header = el3("header", "settings-view__header");
    const back = el3("button", "settings-view__back", "\u2190 Atr\xE1s");
    back.type = "button";
    back.setAttribute("aria-label", "Volver al inicio");
    back.addEventListener("click", () => {
      navigate("dashboard");
    });
    header.appendChild(back);
    header.appendChild(el3("h1", "settings-view__title", "Configuraci\xF3n"));
    screen.appendChild(header);
    const exportSection = el3("section", "settings-section");
    exportSection.appendChild(el3("h2", "settings-section__title", "Exportar datos"));
    const exportDesc = el3("p", "settings-section__desc", "Descarga tus datos para hacer una copia de seguridad.");
    exportSection.appendChild(exportDesc);
    const exportBtns = el3("div", "settings-section__actions");
    const csvBtn = el3("button", "btn btn--secondary", "Exportar CSV");
    csvBtn.type = "button";
    csvBtn.addEventListener("click", () => {
      exportCSV();
    });
    exportBtns.appendChild(csvBtn);
    const jsonBtn = el3("button", "btn btn--secondary", "Exportar JSON");
    jsonBtn.type = "button";
    jsonBtn.addEventListener("click", () => {
      exportJSON();
    });
    exportBtns.appendChild(jsonBtn);
    exportSection.appendChild(exportBtns);
    screen.appendChild(exportSection);
    const importSection = el3("section", "settings-section");
    importSection.appendChild(el3("h2", "settings-section__title", "Importar datos"));
    const importDesc = el3("p", "settings-section__desc", "Importa datos desde un archivo CSV o JSON. Los duplicados se omitir\xE1n.");
    importSection.appendChild(importDesc);
    const fileInput = el3("input", "settings-section__file-input");
    fileInput.type = "file";
    fileInput.accept = ".csv,.json";
    fileInput.setAttribute("aria-label", "Seleccionar archivo para importar");
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        handleImport(fileInput.files[0], msgEl);
      }
    });
    importSection.appendChild(fileInput);
    const msgEl = el3("p", "settings-section__msg");
    msgEl.hidden = true;
    importSection.appendChild(msgEl);
    screen.appendChild(importSection);
    const budgetSection = el3("section", "settings-section");
    budgetSection.appendChild(el3("h2", "settings-section__title", "Presupuestos"));
    const budgetDesc = el3("p", "settings-section__desc", "Establece un presupuesto mensual por categor\xEDa. 0 = sin presupuesto.");
    budgetSection.appendChild(budgetDesc);
    const budgetList = el3("div", "budget-config-list");
    budgetSection.appendChild(budgetList);
    screen.appendChild(budgetSection);
    root.appendChild(screen);
    renderBudgetConfig(budgetList);
  }
  function exportCSV() {
    const txs = loadTransactions();
    const cats = loadAllCategories();
    const catMap = new Map(cats.map((c) => [c.id, c.name]));
    const header = "Fecha,Tipo,Categor\xEDa,Cuenta,Importe,Descripci\xF3n";
    const rows = txs.map((tx) => {
      const date = tx.dateISO;
      const tipo = tx.type === "income" ? "Ingreso" : "Gasto";
      const cat = catMap.get(tx.categoryId) || tx.categoryId;
      const amount = (tx.amountCents / 100).toFixed(2).replace(".", ",");
      const desc = (tx.description || "").replace(/"/g, '""');
      return `${date},${tipo},"${cat}",,${amount},"${desc}"`;
    });
    const csv = [header, ...rows].join("\n");
    downloadFile(csv, `control-gastos-${todayISO()}.csv`, "text/csv;charset=utf-8");
  }
  function exportJSON() {
    const txs = loadTransactions();
    const customCats = [];
    const hiddenCats = [];
    const KEY_CUSTOM = "cg:v1:custom-categories";
    const KEY_HIDDEN = "cg:v1:hidden-categories";
    try {
      const raw = localStorage.getItem(KEY_CUSTOM);
      if (raw) customCats.push(...JSON.parse(raw));
    } catch (_) {
    }
    try {
      const raw = localStorage.getItem(KEY_HIDDEN);
      if (raw) hiddenCats.push(...JSON.parse(raw));
    } catch (_) {
    }
    const data = {
      transactions: txs,
      customCategories: customCats,
      hiddenCategories: hiddenCats
    };
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `control-gastos-${todayISO()}.json`, "application/json");
  }
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function handleImport(file, msgEl) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      try {
        if (file.name.endsWith(".json")) {
          importJSON(text);
        } else if (file.name.endsWith(".csv")) {
          importCSV(text);
        } else {
          showMsg(msgEl, "Formato no soportado. Usa .csv o .json.", "error");
          return;
        }
        showMsg(msgEl, "Datos importados correctamente.", "success");
      } catch (err) {
        console.error("[settings] import error:", err);
        showMsg(msgEl, `Error al importar: ${err.message || "formato inv\xE1lido"}`, "error");
      }
    };
    reader.onerror = () => {
      showMsg(msgEl, "Error al leer el archivo.", "error");
    };
    reader.readAsText(file);
  }
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.transactions)) {
      throw new Error("Estructura JSON inv\xE1lida: falta 'transactions'");
    }
    const existing = loadTransactions();
    const existingIds = new Set(existing.map((t) => t.id));
    let imported = 0;
    for (const tx of data.transactions) {
      if (!tx || typeof tx.id !== "string" || existingIds.has(tx.id)) continue;
      try {
        saveTransaction(tx);
        existingIds.add(tx.id);
        imported++;
      } catch (_) {
      }
    }
    if (Array.isArray(data.customCategories)) {
      const KEY_CUSTOM = "cg:v1:custom-categories";
      let customs = [];
      try {
        const raw = localStorage.getItem(KEY_CUSTOM);
        if (raw) customs = JSON.parse(raw);
      } catch (_) {
      }
      const existingCustomIds = new Set(customs.map((c) => c.id));
      for (const cat of data.customCategories) {
        if (cat && typeof cat.id === "string" && !existingCustomIds.has(cat.id)) {
          customs.push(cat);
          existingCustomIds.add(cat.id);
        }
      }
      localStorage.setItem(KEY_CUSTOM, JSON.stringify(customs));
    }
    if (Array.isArray(data.hiddenCategories)) {
      const KEY_HIDDEN = "cg:v1:hidden-categories";
      let hidden = [];
      try {
        const raw = localStorage.getItem(KEY_HIDDEN);
        if (raw) hidden = JSON.parse(raw);
      } catch (_) {
      }
      const hiddenSet = new Set(hidden);
      for (const id of data.hiddenCategories) {
        if (typeof id === "string") hiddenSet.add(id);
      }
      localStorage.setItem(KEY_HIDDEN, JSON.stringify([...hiddenSet]));
    }
  }
  function importCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) throw new Error("El CSV est\xE1 vac\xEDo o no tiene datos.");
    const header = lines[0];
    const expected = "Fecha,Tipo,Categor\xEDa,Cuenta,Importe,Descripci\xF3n";
    if (!header.startsWith("Fecha")) {
      throw new Error("El CSV debe empezar con: " + expected);
    }
    const cats = loadAllCategories();
    const catNameMap = /* @__PURE__ */ new Map();
    for (const c of cats) {
      catNameMap.set(c.name.toLowerCase(), c.id);
    }
    const existing = loadTransactions();
    const existingIds = new Set(existing.map((t) => t.id));
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 5) continue;
      const [date, tipo, catName, _account, amountStr, desc] = cols;
      const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
      if (!dateISO) continue;
      const type = tipo === "Ingreso" ? "income" : "expense";
      const normalizedAmount = amountStr.replace(",", ".");
      const cents = Math.round(parseFloat(normalizedAmount) * 100);
      if (!Number.isFinite(cents) || cents <= 0) continue;
      const catId = catNameMap.get(catName.toLowerCase().trim()) || "otros";
      const id = crypto.randomUUID ? crypto.randomUUID() : `imported-${Date.now()}-${i}`;
      if (existingIds.has(id)) continue;
      const tx = {
        id,
        type,
        amountCents: cents,
        categoryId: catId,
        dateISO,
        description: (desc || "").replace(/^"|"$/g, "").replace(/""/g, '"'),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      saveTransaction(tx);
      existingIds.add(id);
      imported++;
    }
  }
  function parseCSVLine(line) {
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          cols.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }
    cols.push(current);
    return cols;
  }
  function renderBudgetConfig(container) {
    container.innerHTML = "";
    const { selectedMonth: monthKey } = loadUIState();
    const budgets = loadBudgets(monthKey);
    const cats = loadAllCategories().filter((c) => c.type === "expense" || c.type === "ambos");
    const allTxs = loadTransactions();
    const spent = /* @__PURE__ */ new Map();
    for (const tx of allTxs) {
      if (tx.type !== "expense" || !tx.dateISO.startsWith(monthKey)) continue;
      spent.set(tx.categoryId, (spent.get(tx.categoryId) || 0) + tx.amountCents);
    }
    for (const cat of cats) {
      const row = el3("div", "budget-config-item");
      const label = el3("span", "budget-config-item__label", `${cat.icon} ${cat.name}`);
      row.appendChild(label);
      const input = el3("input", "budget-config-item__input");
      input.type = "text";
      input.inputMode = "decimal";
      input.placeholder = "0,00";
      input.setAttribute("aria-label", `Presupuesto para ${cat.name}`);
      const currentBudget = budgets.get(cat.id) || 0;
      if (currentBudget > 0) {
        input.value = formatEUR(currentBudget).replace(" \u20AC", "");
      }
      const saveBtn = el3("button", "budget-config-item__btn", "OK");
      saveBtn.type = "button";
      saveBtn.setAttribute("aria-label", `Guardar presupuesto para ${cat.name}`);
      saveBtn.addEventListener("click", () => {
        const cents = parseEURInput(input.value);
        if (cents === null || cents < 0) return;
        saveBudget(monthKey, cat.id, cents);
        saveBtn.textContent = "\u2713";
        setTimeout(() => {
          saveBtn.textContent = "OK";
          renderBudgetConfig(container);
        }, 1e3);
      });
      row.appendChild(input);
      row.appendChild(saveBtn);
      if (currentBudget > 0) {
        const spentAmount = spent.get(cat.id) || 0;
        const pct = Math.min(100, Math.round(spentAmount / currentBudget * 100));
        const actualPct = Math.round(spentAmount / currentBudget * 100);
        const tone = actualPct >= 100 ? "danger" : actualPct >= 80 ? "warning" : "ok";
        const remaining = currentBudget - spentAmount;
        const progressWrap = el3("div", "budget-config-item__progress");
        const barBg = el3("div", "budget-config-item__bar");
        const barFill = el3("div", `budget-config-item__bar-fill budget-config-item__bar-fill--${tone}`);
        barFill.style.width = `${pct}%`;
        barBg.appendChild(barFill);
        progressWrap.appendChild(barBg);
        const info = el3("div", "budget-config-item__info");
        const remainingText = remaining >= 0 ? `Quedan ${formatEUR(remaining)}` : `Te pasaste ${formatEUR(Math.abs(remaining))}`;
        info.appendChild(el3("span", null, `${formatEUR(spentAmount)} / ${formatEUR(currentBudget)}`));
        const remainingSpan = el3("span", null, remainingText);
        remainingSpan.style.color = tone === "ok" ? "var(--income)" : tone === "warning" ? "var(--warning)" : "var(--expense)";
        info.appendChild(remainingSpan);
        progressWrap.appendChild(info);
        row.appendChild(progressWrap);
      }
      container.appendChild(row);
    }
  }
  function showMsg(el4, text, type) {
    el4.textContent = text;
    el4.hidden = false;
    el4.className = `settings-section__msg settings-section__msg--${type}`;
  }
  function el3(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0 && text !== null) node.textContent = String(text);
    return node;
  }

  // Users/rocan/OneDrive/Escritorio/control-gastos/app/js/main.js
  function mount(root, route) {
    if (route.name === "add") {
      renderAddView(root);
    } else if (route.name === "history") {
      renderHistoryView(root);
    } else if (route.name === "edit") {
      renderEditView(root);
    } else if (route.name === "settings") {
      renderSettingsView(root);
    } else {
      renderDashboard(root);
    }
  }
  function boot() {
    const root = document.getElementById("app");
    if (!root) {
      console.error("[main] #app root not found");
      return;
    }
    loadUIState();
    loadTransactions();
    const initial = currentRoute();
    if (typeof location !== "undefined" && location.hash !== `#${initial.name}`) {
      try {
        history.replaceState(null, "", `#${initial.name}`);
      } catch (_) {
        location.hash = `#${initial.name}`;
      }
    }
    onRouteChange((route) => mount(root, route));
    mount(root, currentRoute());
    if ("serviceWorker" in navigator) {
      try {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("./sw.js").catch(() => {
          });
        });
      } catch (_) {
      }
    }
    console.info("ahorrio: boot ok");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  if (typeof window !== "undefined") {
    window.__cg_app = { mount, navigate };
  }
})();
