// LocalStorage layer for v0.1.
// Two keys only: cg:v1:transactions (Transaction[]) and cg:v1:ui-state (UIState).
// On read, parse failure or shape mismatch logs a console.warn and resets
// the key to its default. Data loss is accepted for v0.1 (no IndexedDB
// migration path; that is a future change).
// Pure module: no DOM. ES module.

import { todayISO } from "./format.js";

const KEY_TX = "cg:v1:transactions";
const KEY_UI = "cg:v1:ui-state";
const KEY_BUDGETS = "cg:v1:budgets";

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {"expense" | "income"} type
 * @property {number} amountCents  Integer > 0.
 * @property {string} categoryId
 * @property {string} dateISO      "YYYY-MM-DD".
 * @property {string} description
 * @property {string} createdAt    ISO 8601 with time.
 * @property {string} updatedAt    ISO 8601 with time.
 */

/**
 * @typedef {Object} UIState
 * @property {string} selectedMonth  "YYYY-MM".
 */

const VALID_TYPES = new Set(["expense", "income"]);

/**
 * Lightweight shape check for a Transaction. Returns true if every
 * required field is present and has the expected type.
 * @param {unknown} item
 * @returns {boolean}
 */
function isValidTransaction(item) {
  if (item === null || typeof item !== "object") return false;
  const t = /** @type {Record<string, unknown>} */ (item);
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

/**
 * Read + validate the transactions key. Invalid items are dropped with
 * a console.warn; on parse failure the key is reset to its default.
 * Also deduplicates by content (same type, amount, category, date, description).
 * @returns {Transaction[]}
 */
export function loadTransactions() {
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
  /** @type {Transaction[]} */
  const result = [];
  const seenIds = new Set();
  const seenContent = new Set();
  let changed = false;
  for (const item of parsed) {
    if (!isValidTransaction(item)) {
      console.warn(`[storage] dropping invalid transaction:`, item);
      changed = true;
      continue;
    }
    // Deduplicate by ID
    if (seenIds.has(item.id)) {
      changed = true;
      continue;
    }
    seenIds.add(item.id);
    // Deduplicate by content (same type + amount + category + date + description)
    const contentKey = `${item.type}|${item.amountCents}|${item.categoryId}|${item.dateISO}|${item.description}`;
    if (seenContent.has(contentKey)) {
      changed = true;
      continue;
    }
    seenContent.add(contentKey);
    result.push(/** @type {Transaction} */ (item));
  }
  // Save cleaned list back if anything was removed
  if (changed) {
    console.warn(`[storage] cleaned ${parsed.length - result.length} duplicate/invalid transactions`);
    localStorage.setItem(KEY_TX, JSON.stringify(result));
  }
  return result;
}

/**
 * Append a single transaction to the stored list and write it back.
 * @param {Transaction} tx
 */
export function saveTransaction(tx) {
  if (!isValidTransaction(tx)) {
    console.warn(`[storage] refusing to save invalid transaction:`, tx);
    return;
  }
  const list = loadTransactions();
  list.push(tx);
  localStorage.setItem(KEY_TX, JSON.stringify(list));
}

/**
 * Remove a transaction by id. No-op if the id is not present.
 * @param {string} id
 */
export function deleteTransaction(id) {
  const list = loadTransactions();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return;
  localStorage.setItem(KEY_TX, JSON.stringify(next));
}

/**
 * Update an existing transaction by id. Merges the given updates into
 * the matching transaction and writes the list back. No-op if the id
 * is not present or the resulting transaction would be invalid.
 * @param {string} id
 * @param {Partial<Pick<Transaction, "amountCents"|"categoryId"|"dateISO"|"description"|"type"|"updatedAt">>} updates
 */
export function updateTransaction(id, updates) {
  const list = loadTransactions();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const merged = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  if (!isValidTransaction(merged)) {
    console.warn(`[storage] refusing to update to invalid transaction:`, merged);
    return;
  }
  list[idx] = merged;
  localStorage.setItem(KEY_TX, JSON.stringify(list));
}

/**
 * Read + validate the ui-state key. On missing/corrupt, return the
 * default ({ selectedMonth: current "YYYY-MM" }) and reset the key.
 * @returns {UIState}
 */
export function loadUIState() {
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
  return /** @type {UIState} */ (parsed);
}

/**
 * Write the UIState object back to storage.
 * @param {UIState} state
 */
export function saveUIState(state) {
  if (!state || typeof state !== "object" || typeof state.selectedMonth !== "string") {
    console.warn(`[storage] refusing to save invalid ui-state:`, state);
    return;
  }
  localStorage.setItem(KEY_UI, JSON.stringify(state));
}

/**
 * @returns {UIState}
 */
function defaultUIState() {
  return { selectedMonth: todayISO().slice(0, 7) };
}

// --- Budget management ---

/**
 * Load budgets for a given month.
 * @param {string} monthKey  "YYYY-MM".
 * @returns {Map<string, number>}  Map<categoryId, amountCents>.
 */
export function loadBudgets(monthKey) {
  /** @type {Map<string, number>} */
  const out = new Map();
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
  } catch (_) {}
  return out;
}

/**
 * Save or update a budget for a category in a given month.
 * @param {string} monthKey      "YYYY-MM".
 * @param {string} categoryId
 * @param {number} amountCents   Integer >= 0. 0 means remove the budget.
 */
export function saveBudget(monthKey, categoryId, amountCents) {
  let all = {};
  const raw = localStorage.getItem(KEY_BUDGETS);
  if (raw) {
    try { all = JSON.parse(raw) || {}; } catch (_) {}
  }
  if (!all[monthKey] || typeof all[monthKey] !== "object") all[monthKey] = {};
  if (amountCents <= 0) {
    delete all[monthKey][categoryId];
  } else {
    all[monthKey][categoryId] = Math.round(amountCents);
  }
  localStorage.setItem(KEY_BUDGETS, JSON.stringify(all));
}

/**
 * Delete a budget for a category in a given month.
 * @param {string} monthKey
 * @param {string} categoryId
 */
export function deleteBudget(monthKey, categoryId) {
  saveBudget(monthKey, categoryId, 0);
}

// Manual verification helper for the user (no test runner).
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
    },
  };
}
