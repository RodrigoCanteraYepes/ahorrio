// Settings view. Export/Import data + Budget configuration.
// Pure render: re-invoke on every route change. ES module.

import { loadAllCategories } from "../categories.js";
import { formatEUR, parseEURInput, todayISO } from "../format.js";
import { loadTransactions, saveTransaction, loadUIState, loadBudgets, saveBudget } from "../storage.js";
import { navigate } from "../router.js";

/** @param {HTMLElement} root */
export function renderSettingsView(root) {
  root.innerHTML = "";

  const screen = el("section", "settings-view");
  screen.setAttribute("aria-labelledby", "settings-title");

  // header
  const header = el("header", "settings-view__header");
  const back = el("button", "settings-view__back", "\u2190 Atr\u00e1s");
  back.type = "button";
  back.setAttribute("aria-label", "Volver al inicio");
  back.addEventListener("click", () => { navigate("dashboard"); });
  header.appendChild(back);
  header.appendChild(el("h1", "settings-view__title", "Configuraci\u00f3n"));
  screen.appendChild(header);

  // --- Export section ---
  const exportSection = el("section", "settings-section");
  exportSection.appendChild(el("h2", "settings-section__title", "Exportar datos"));

  const exportDesc = el("p", "settings-section__desc", "Descarga tus datos para hacer una copia de seguridad.");
  exportSection.appendChild(exportDesc);

  const exportBtns = el("div", "settings-section__actions");
  const csvBtn = el("button", "btn btn--secondary", "Exportar CSV");
  csvBtn.type = "button";
  csvBtn.addEventListener("click", () => { exportCSV(); });
  exportBtns.appendChild(csvBtn);

  const jsonBtn = el("button", "btn btn--secondary", "Exportar JSON");
  jsonBtn.type = "button";
  jsonBtn.addEventListener("click", () => { exportJSON(); });
  exportBtns.appendChild(jsonBtn);
  exportSection.appendChild(exportBtns);
  screen.appendChild(exportSection);

  // --- Import section ---
  const importSection = el("section", "settings-section");
  importSection.appendChild(el("h2", "settings-section__title", "Importar datos"));

  const importDesc = el("p", "settings-section__desc", "Importa datos desde un archivo CSV o JSON. Los duplicados se omitir\u00e1n.");
  importSection.appendChild(importDesc);

  const fileInput = el("input", "settings-section__file-input");
  fileInput.type = "file";
  fileInput.accept = ".csv,.json";
  fileInput.setAttribute("aria-label", "Seleccionar archivo para importar");
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) {
      handleImport(fileInput.files[0], msgEl);
    }
  });
  importSection.appendChild(fileInput);

  const msgEl = el("p", "settings-section__msg");
  msgEl.hidden = true;
  importSection.appendChild(msgEl);
  screen.appendChild(importSection);

  // --- Budgets section ---
  const budgetSection = el("section", "settings-section");
  budgetSection.appendChild(el("h2", "settings-section__title", "Presupuestos"));

  const budgetDesc = el("p", "settings-section__desc", "Establece un presupuesto mensual por categor\u00eda. 0 = sin presupuesto.");
  budgetSection.appendChild(budgetDesc);

  const budgetList = el("div", "budget-config-list");
  budgetSection.appendChild(budgetList);
  screen.appendChild(budgetSection);

  root.appendChild(screen);

  renderBudgetConfig(budgetList);
}

// --- Export functions ---

function exportCSV() {
  const txs = loadTransactions();
  const cats = loadAllCategories();
  const catMap = new Map(cats.map((c) => [c.id, c.name]));

  const header = "Fecha,Tipo,Categor\u00eda,Cuenta,Importe,Descripci\u00f3n";
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

  // Reconstruct custom and hidden from categories.js logic
  const KEY_CUSTOM = "cg:v1:custom-categories";
  const KEY_HIDDEN = "cg:v1:hidden-categories";
  try {
    const raw = localStorage.getItem(KEY_CUSTOM);
    if (raw) customCats.push(...JSON.parse(raw));
  } catch (_) {}
  try {
    const raw = localStorage.getItem(KEY_HIDDEN);
    if (raw) hiddenCats.push(...JSON.parse(raw));
  } catch (_) {}

  const data = {
    transactions: txs,
    customCategories: customCats,
    hiddenCategories: hiddenCats,
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

// --- Import functions ---

/**
 * @param {File} file
 * @param {HTMLElement} msgEl
 */
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
      showMsg(msgEl, `Error al importar: ${err.message || "formato inv\u00e1lido"}`, "error");
    }
  };
  reader.onerror = () => { showMsg(msgEl, "Error al leer el archivo.", "error"); };
  reader.readAsText(file);
}

/** @param {string} text */
function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.transactions)) {
    throw new Error("Estructura JSON inv\u00e1lida: falta 'transactions'");
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
    } catch (_) {}
  }

  // Import custom categories if present
  if (Array.isArray(data.customCategories)) {
    const KEY_CUSTOM = "cg:v1:custom-categories";
    let customs = [];
    try {
      const raw = localStorage.getItem(KEY_CUSTOM);
      if (raw) customs = JSON.parse(raw);
    } catch (_) {}
    const existingCustomIds = new Set(customs.map((c) => c.id));
    for (const cat of data.customCategories) {
      if (cat && typeof cat.id === "string" && !existingCustomIds.has(cat.id)) {
        customs.push(cat);
        existingCustomIds.add(cat.id);
      }
    }
    localStorage.setItem(KEY_CUSTOM, JSON.stringify(customs));
  }

  // Import hidden categories if present
  if (Array.isArray(data.hiddenCategories)) {
    const KEY_HIDDEN = "cg:v1:hidden-categories";
    let hidden = [];
    try {
      const raw = localStorage.getItem(KEY_HIDDEN);
      if (raw) hidden = JSON.parse(raw);
    } catch (_) {}
    const hiddenSet = new Set(hidden);
    for (const id of data.hiddenCategories) {
      if (typeof id === "string") hiddenSet.add(id);
    }
    localStorage.setItem(KEY_HIDDEN, JSON.stringify([...hiddenSet]));
  }
}

/** @param {string} text */
function importCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("El CSV est\u00e1 vac\u00edo o no tiene datos.");

  const header = lines[0];
  const expected = "Fecha,Tipo,Categor\u00eda,Cuenta,Importe,Descripci\u00f3n";
  if (!header.startsWith("Fecha")) {
    throw new Error("El CSV debe empezar con: " + expected);
  }

  const cats = loadAllCategories();
  const catNameMap = new Map();
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTransaction(tx);
    existingIds.add(id);
    imported++;
  }
}

/** Minimal CSV line parser (handles quoted fields). */
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

// --- Budget config ---

/** @param {HTMLElement} container */
function renderBudgetConfig(container) {
  container.innerHTML = "";
  const { selectedMonth: monthKey } = loadUIState();
  const budgets = loadBudgets(monthKey);
  const cats = loadAllCategories().filter((c) => c.type === "expense" || c.type === "ambos");
  const allTxs = loadTransactions();

  // Compute spent per category this month
  const spent = new Map();
  for (const tx of allTxs) {
    if (tx.type !== "expense" || !tx.dateISO.startsWith(monthKey)) continue;
    spent.set(tx.categoryId, (spent.get(tx.categoryId) || 0) + tx.amountCents);
  }

  for (const cat of cats) {
    const row = el("div", "budget-config-item");
    const label = el("span", "budget-config-item__label", `${cat.icon} ${cat.name}`);
    row.appendChild(label);

    const input = el("input", "budget-config-item__input");
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "0,00";
    input.setAttribute("aria-label", `Presupuesto para ${cat.name}`);
    const currentBudget = budgets.get(cat.id) || 0;
    if (currentBudget > 0) {
      input.value = formatEUR(currentBudget).replace(" \u20AC", "");
    }

    const saveBtn = el("button", "budget-config-item__btn", "OK");
    saveBtn.type = "button";
    saveBtn.setAttribute("aria-label", `Guardar presupuesto para ${cat.name}`);
    saveBtn.addEventListener("click", () => { const cents = parseEURInput(input.value);
      if (cents === null || cents < 0) return;
      saveBudget(monthKey, cat.id, cents);
      // Visual feedback
      saveBtn.textContent = "\u2713";
      setTimeout(() => { saveBtn.textContent = "OK"; renderBudgetConfig(container); }, 1000);
    });

    row.appendChild(input);
    row.appendChild(saveBtn);

    // Show progress bar if budget is set
    if (currentBudget > 0) {
      const spentAmount = spent.get(cat.id) || 0;
      const pct = Math.min(100, Math.round((spentAmount / currentBudget) * 100));
      const actualPct = Math.round((spentAmount / currentBudget) * 100);
      const tone = actualPct >= 100 ? "danger" : actualPct >= 80 ? "warning" : "ok";
      const remaining = currentBudget - spentAmount;

      const progressWrap = el("div", "budget-config-item__progress");
      const barBg = el("div", "budget-config-item__bar");
      const barFill = el("div", `budget-config-item__bar-fill budget-config-item__bar-fill--${tone}`);
      barFill.style.width = `${pct}%`;
      barBg.appendChild(barFill);
      progressWrap.appendChild(barBg);

      const info = el("div", "budget-config-item__info");
      const remainingText = remaining >= 0 
        ? `Quedan ${formatEUR(remaining)}` 
        : `Te pasaste ${formatEUR(Math.abs(remaining))}`;
      info.appendChild(el("span", null, `${formatEUR(spentAmount)} / ${formatEUR(currentBudget)}`));
      const remainingSpan = el("span", null, remainingText);
      remainingSpan.style.color = tone === "ok" ? "var(--income)" : tone === "warning" ? "var(--warning)" : "var(--expense)";
      info.appendChild(remainingSpan);
      progressWrap.appendChild(info);

      row.appendChild(progressWrap);
    }

    container.appendChild(row);
  }
}

// --- Message helper ---

function showMsg(el, text, type) {
  el.textContent = text;
  el.hidden = false;
  el.className = `settings-section__msg settings-section__msg--${type}`;
}

// --- DOM helper ---
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
