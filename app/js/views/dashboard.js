// Dashboard view for v0.1. Renders the main screen: header, month
// selector, totals card, pie chart by category, transaction list.
// Pure render: re-invoke on every route change. ES module.

import { getCategoryById, loadAllCategories, saveCustomCategory, deleteCategory, restoreHiddenCategories } from "../categories.js";
import { computeTotals, groupByCategory } from "../totals.js";
import { formatDateES, formatEUR, parseEURInput } from "../format.js";
import { deleteTransaction, loadTransactions, loadUIState, saveUIState, loadBudgets, saveBudget, deleteBudget } from "../storage.js";
import { navigate } from "../router.js";
import { renderMonthSelector, monthLabel } from "./month-selector.js";

/** @param {HTMLElement} root */
export function renderDashboard(root) {
  root.innerHTML = "";

  const { selectedMonth: monthKey } = loadUIState();
  const allTxs = loadTransactions();
  const monthTxs = allTxs
    .filter((t) => typeof t.dateISO === "string" && t.dateISO.startsWith(monthKey))
    .slice()
    .sort((a, b) => a.dateISO !== b.dateISO ? (a.dateISO < b.dateISO ? 1 : -1) : (a.createdAt < b.createdAt ? 1 : -1));
  const totals = computeTotals(monthTxs, monthKey);

  const screen = el("section", "dashboard");
  screen.setAttribute("aria-labelledby", "dashboard-title");

  // --- header ---
  const header = el("header", "dashboard__header");
  const titleWrap = el("div", "dashboard__title-wrap");
  titleWrap.appendChild(el("h1", "dashboard__title", "Ahorrio"));
  header.appendChild(titleWrap);

  const addBtn = el("button", "fab", "+ A\u00f1adir");
  addBtn.type = "button";
  addBtn.setAttribute("aria-label", "A\u00f1adir transacci\u00f3n");
  addBtn.addEventListener("click", () => { navigate("add"); });

  const hamburgerBtn = el("button", "hamburger-btn", "\u2630");
  hamburgerBtn.type = "button";
  hamburgerBtn.setAttribute("aria-label", "Abrir men\u00fa");
  header.appendChild(addBtn);
  header.appendChild(hamburgerBtn);
  screen.appendChild(header);

  // --- month selector ---
  const selectorHost = el("div", "dashboard__selector");
  screen.appendChild(selectorHost);
  renderMonthSelector(selectorHost, monthKey, (newKey) => {
    saveUIState({ selectedMonth: newKey });
    renderDashboard(root);
  });

  // --- totals card ---
  const card = el("section", "totals-card");
  card.setAttribute("aria-label", "Totales del mes");
  card.appendChild(totalsRow("Ingresos", formatEUR(totals.income), "income", totals.income === 0 ? "Sin ingresos este mes" : null));
  card.appendChild(totalsRow("Gastos", formatEUR(totals.expenses), "expense", totals.expenses === 0 ? "Sin gastos este mes" : null));
  card.appendChild(totalsRow("Neto", formatEUR(totals.net), totals.net >= 0 ? "income" : "expense", totals.count === 0 ? "Sin movimientos" : null));
  screen.appendChild(card);

  // --- pie chart by category (only if there are expenses) ---
  const expenseTxsForBudget = monthTxs.filter((t) => t.type === "expense");
  const byCatForBudget = groupByCategory(expenseTxsForBudget, monthKey);

  if (expenseTxsForBudget.length > 0) {
    const entries = [...byCatForBudget.entries()]
      .map(([catId, data]) => {
        const cat = getCategoryById(catId) || { name: catId, icon: "?", color: "#6B7280" };
        return { catId, name: cat.name, icon: cat.icon, color: cat.color, amount: data.amountCents };
      })
      .sort((a, b) => b.amount - a.amount);

    const chartSection = el("section", "chart-section");
    chartSection.setAttribute("aria-label", "Gr\u00e1fico de gastos por categor\u00eda");
    chartSection.appendChild(el("h2", "chart-section__title", "Gastos por categor\u00eda"));
    const chartWrap = el("div", "chart-wrap");

    // Canvas for pie chart
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 240;
    canvas.className = "pie-chart";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Gr\u00e1fico circular de gastos por categor\u00eda");
    chartWrap.appendChild(canvas);

    // Legend
    const legend = el("div", "chart-legend");
    const totalExpenses = entries.reduce((sum, e) => sum + e.amount, 0);
    for (const entry of entries) {
      const pct = totalExpenses > 0 ? Math.round((entry.amount / totalExpenses) * 100) : 0;
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

    // Draw pie chart after DOM is ready
    requestAnimationFrame(() => drawPieChart(canvas, entries));
  }

  // --- budgets section (below pie chart) ---
  renderBudgetSection(screen, monthKey, byCatForBudget, root);

  // --- list or empty state ---
  if (monthTxs.length === 0) {
    const empty = el("div", "empty-state");
    const emptyIcon = el("div", "empty-state__icon", "\uD83D\uDCB0");
    empty.appendChild(emptyIcon);
    empty.appendChild(el("p", "empty-state__title", "A\u00fan no hay movimientos este mes"));
    const cta = el("button", "btn btn--primary empty-state__cta", "+ A\u00f1adir transacci\u00f3n");
    cta.type = "button";
    cta.addEventListener("click", () => { navigate("add"); });
    empty.appendChild(cta);
    screen.appendChild(empty);
  } else {
    const list = el("ul", "tx-list");
    list.setAttribute("aria-label", "Movimientos del mes");
    for (const tx of monthTxs) list.appendChild(txItem(tx, root));
    screen.appendChild(list);
  }

  // --- menu panel ---
  const menuPanel = createMenuPanel(root);
  screen.appendChild(menuPanel.overlay);
  screen.appendChild(menuPanel.panel);

  hamburgerBtn.addEventListener("click", () => { menuPanel.open();
  });

  root.appendChild(screen);
}

// --- Budget section ---
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
    const pct = budgetCents > 0 ? Math.min(100, Math.round((spent / budgetCents) * 100)) : 0;
    const actualPct = budgetCents > 0 ? Math.round((spent / budgetCents) * 100) : 0;
    const tone = actualPct >= 100 ? "danger" : actualPct >= 80 ? "warning" : "ok";
    const remaining = budgetCents - spent;

    const row = el("div", "budget-row");

    // Label row with icon, name, and percentage
    const labelRow = el("div", "budget-row__label");
    labelRow.appendChild(el("span", "budget-row__icon", cat.icon));
    labelRow.appendChild(el("span", "budget-row__name", cat.name));
    const pctSpan = el("span", `budget-row__pct budget-row__pct--${tone}`, `${actualPct}%`);
    labelRow.appendChild(pctSpan);
    row.appendChild(labelRow);

    // Progress bar
    const barBg = el("div", "budget-bar");
    const barFill = el("div", `budget-bar__fill budget-bar__fill--${tone}`);
    barFill.style.width = `${pct}%`;
    barBg.appendChild(barFill);
    row.appendChild(barBg);

    // Amounts
    const amounts = el("span", "budget-row__amounts", `${formatEUR(spent)} / ${formatEUR(budgetCents)}`);
    row.appendChild(amounts);

    // Remaining text
    const remainingClass = `budget-row__remaining budget-row__remaining--${tone}`;
    const remainingText = remaining >= 0 
      ? `quedan ${formatEUR(remaining)}` 
      : `te pasaste ${formatEUR(Math.abs(remaining))}`;
    row.appendChild(el("span", remainingClass, remainingText));

    // Delete button
    const delBtn = el("button", "budget-row__delete", "\u2715");
    delBtn.type = "button";
    delBtn.setAttribute("aria-label", `Eliminar presupuesto de ${cat.name}`);
    delBtn.addEventListener("click", () => {
      deleteBudget(monthKey, catId);
      renderDashboard(root);
    });
    row.appendChild(delBtn);

    budgetSection.appendChild(row);
  }

  // Add budget button
  const addBudgetBtn = el("button", "budget-add-btn", "+ A\u00f1adir presupuesto");
  addBudgetBtn.type = "button";
  addBudgetBtn.addEventListener("click", () => { // Toggle inline form
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

// --- Budget add inline form ---
function createBudgetAddForm(monthKey, root, allCats, existingBudgets) {
  const form = el("div", "budget-add-form");

  const row = el("div", "budget-add-form__row");

  // Category select
  const select = el("select", "budget-add-form__select");
  select.setAttribute("aria-label", "Categor\u00eda");
  const defaultOpt = el("option", null, "Seleccionar categor\u00eda");
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

  // Amount input
  const input = el("input", "budget-add-form__input");
  input.type = "text";
  input.inputMode = "decimal";
  input.placeholder = "0,00 \u20AC";
  input.setAttribute("aria-label", "Importe del presupuesto");
  row.appendChild(input);

  // Save button
  const saveBtn = el("button", "budget-add-form__btn", "Guardar");
  saveBtn.type = "button";
  saveBtn.addEventListener("click", () => { const catId = select.value;
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

// --- Totals row ---
function totalsRow(label, value, tone, subCopy) {
  const row = el("div", "totals-card__row");
  const labelCol = el("div", "totals-card__label-col");
  labelCol.appendChild(el("span", "totals-card__label", label));
  if (subCopy) labelCol.appendChild(el("span", "totals-card__sub", subCopy));
  row.appendChild(labelCol);
  row.appendChild(el("span", `totals-card__value totals-card__value--${tone}`, value));
  return row;
}

// --- Transaction item ---
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
    nameRow.appendChild(el("span", "tx-item__sep", " \u00b7 "));
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
  editBtn.addEventListener("click", () => { navigate("edit", { id: tx.id });
  });
  actions.appendChild(editBtn);

  const del = el("button", "tx-item__delete");
  del.type = "button";
  del.textContent = "Borrar";
  del.setAttribute("aria-label", `Borrar ${cat.name} de ${formatEUR(tx.amountCents)}`);
  del.addEventListener("click", () => { if (!window.confirm("\u00bfBorrar este movimiento?")) return;
    deleteTransaction(tx.id);
    renderDashboard(root);
  });
  actions.appendChild(del);

  li.appendChild(actions);

  return li;
}

// --- Pie chart drawing ---
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
    const sliceAngle = (entry.amount / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = entry.color;
    ctx.fill();
    startAngle += sliceAngle;
  }

  // White circle in center for donut effect
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, 2 * Math.PI);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Total in center
  ctx.fillStyle = "#1A1F2B";
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatEUR(total), cx, cy - 6);
  ctx.font = "11px -apple-system, sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.fillText("Total", cx, cy + 10);
}

// --- DOM helper ---
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

// --- Menu panel ---
function createMenuPanel(root) {
  const overlay = el("div", "menu-overlay");
  overlay.hidden = true;
  const panel = el("div", "menu-panel");
  panel.hidden = true;

  // Header
  const header = el("div", "menu-panel__header");
  header.appendChild(el("h2", "menu-panel__title", "Men\u00fa"));
  const closeBtn = el("button", "menu-panel__close", "\u2715");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Cerrar men\u00fa");
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // --- Section: Categorías ---
  const catSection = el("div", "menu-section");
  catSection.appendChild(el("h3", "menu-section__title", "Categor\u00edas"));

  // Add category form
  const catForm = el("form", "category-form");
  catForm.setAttribute("aria-label", "A\u00f1adir categor\u00eda");
  const nameInput = el("input", "category-form__input");
  nameInput.type = "text";
  nameInput.placeholder = "Nombre";
  nameInput.setAttribute("aria-label", "Nombre de categor\u00eda");
  const typeSelect = el("select", "category-form__select");
  typeSelect.setAttribute("aria-label", "Tipo de categor\u00eda");
  const optExpense = el("option", null, "Gasto");
  optExpense.value = "expense";
  const optIncome = el("option", null, "Ingreso");
  optIncome.value = "income";
  const optBoth = el("option", null, "Ambos");
  optBoth.value = "ambos";
  typeSelect.appendChild(optExpense);
  typeSelect.appendChild(optIncome);
  typeSelect.appendChild(optBoth);
  const addCatBtn = el("button", "category-form__btn", "A\u00f1adir");
  addCatBtn.type = "button";
  catForm.appendChild(nameInput);
  catForm.appendChild(typeSelect);
  catForm.appendChild(addCatBtn);
  catSection.appendChild(catForm);

  // Category list
  const catList = el("div", "category-list");
  catSection.appendChild(catList);
  panel.appendChild(catSection);

  // --- Section: Historial mensual ---
  const historySection = el("div", "menu-section");
  const historyLink = el("button", "menu-section__link", "Ver historial mensual");
  historyLink.type = "button";
  historyLink.addEventListener("click", () => { close();
    navigate("history");
  });
  historySection.appendChild(el("h3", "menu-section__title", "Historial mensual"));
  historySection.appendChild(historyLink);
  panel.appendChild(historySection);

  // --- Section: Configuración ---
  const settingsSection = el("div", "menu-section");
  const settingsLink = el("button", "menu-section__link", "Configuraci\u00f3n");
  settingsLink.type = "button";
  settingsLink.addEventListener("click", () => { close();
    navigate("settings");
  });
  settingsSection.appendChild(el("h3", "menu-section__title", "Ajustes"));
  settingsSection.appendChild(settingsLink);
  panel.appendChild(settingsSection);

  // --- Section: Borrar todos los datos ---
  const dangerSection = el("div", "menu-section");
  const clearBtn = el("button", "menu-section__danger-btn", "Borrar todos los datos");
  clearBtn.type = "button";
  clearBtn.addEventListener("click", () => { if (!window.confirm("\u00bfEst\u00e1s seguro? Se borrar\u00e1n TODOS los datos. Esta acci\u00f3n no se puede deshacer.")) return;
    localStorage.clear();
    close();
    renderDashboard(root);
  });
  dangerSection.appendChild(el("h3", "menu-section__title", "Datos"));
  dangerSection.appendChild(clearBtn);
  panel.appendChild(dangerSection);

  // --- Functions ---
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

      // Delete button for ALL categories
      const delBtn = el("button", "category-item__delete", "\u2715");
      delBtn.type = "button";
      delBtn.setAttribute("aria-label", `Eliminar ${cat.name}`);
      delBtn.addEventListener("click", () => { if (!window.confirm(`\u00bfEliminar la categor\u00eda "${cat.name}"?`)) return;
        deleteCategory(cat.id);
        renderCategoryList();
      });
      item.appendChild(delBtn);
      catList.appendChild(item);
    }

    // Restore hidden defaults button
    const restoreBtn = el("button", "category-restore-btn", "Restaurar categor\u00edas por defecto");
    restoreBtn.type = "button";
    restoreBtn.addEventListener("click", () => { restoreHiddenCategories();
      renderCategoryList();
    });
    catList.appendChild(restoreBtn);
  }

  // Add category handler
  addCatBtn.addEventListener("click", () => { const name = nameInput.value.trim();
    if (!name) return;
    const type = typeSelect.value;
    const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!id) return;
    const icon = type === "income" ? "\uD83D\uDCB5" : "\uD83C\uDFF7\uFE0F";
    saveCustomCategory({ id, name, type, icon, color: "#6B7280" });
    nameInput.value = "";
    renderCategoryList();
  });

  // Close handlers
  closeBtn.addEventListener("click", () => { close(); });
  overlay.addEventListener("click", () => { close(); });

  return { overlay, panel, open, close };
}
