// Default categories for v0.1.
//
// Decision (Batch A, 2026-06-05): the orchestrator brief was internally
// inconsistent on the count (6 in some places, 7 in the slug list) and
// on whether "Otros" belongs. The most useful interpretation that
// satisfies the explicit "Otros is the catch-all" directive and keeps
// "Sueldo" as the only income is 7 categories: 5 expense + 1 income +
// 1 "ambos" (Otros). The type field therefore supports 'ambos' as a
// third value alongside 'expense' and 'income'; this is a small
// extension to the brief's "type is 'expense' or 'income'" and is
// the minimum change needed to keep Otros available in both forms.
// Flagged as an open item in apply-progress.md so the user can
// confirm or revise in Batch B verification.
//
// Pure module: no DOM, no storage. ES module.

/**
 * @typedef {'expense' | 'income' | 'ambos'} CategoryType
 */

/**
 * @typedef {Object} Category
 * @property {string} id     Short slug, unique across the list.
 * @property {string} name   Display name in Spanish.
 * @property {CategoryType} type  'expense', 'income', or 'ambos' (catch-all).
 * @property {string} icon   Short emoji used as a visual cue in the list.
 * @property {string} color  Hex color for the row accent (v0.1 unused by UI).
 */

/** @type {ReadonlyArray<Readonly<Category>>} */
export const CATEGORIES = Object.freeze([
  Object.freeze({ id: "ocio",     name: "Ocio",     type: "expense", icon: "🎬", color: "#8B5CF6" }),
  Object.freeze({ id: "compras",  name: "Compras",  type: "expense", icon: "🛒", color: "#EC4899" }),
  Object.freeze({ id: "comida",   name: "Comida",   type: "expense", icon: "🍔", color: "#F59E0B" }),
  Object.freeze({ id: "alquiler", name: "Alquiler", type: "expense", icon: "🏠", color: "#3B82F6" }),
  Object.freeze({ id: "ahorro",   name: "Ahorro",   type: "expense", icon: "💰", color: "#10B981" }),
  Object.freeze({ id: "sueldo",   name: "Sueldo",   type: "income",  icon: "💼", color: "#1F8F61" }),
  Object.freeze({ id: "viajes",   name: "Viajes",   type: "expense", icon: "✈️", color: "#0EA5E9" }),
  Object.freeze({ id: "otros",    name: "Otros",    type: "ambos",   icon: "📦", color: "#6B7280" }),
]);

/**
 * Look up a category by id. Returns undefined if not found.
 * @param {string} id
 * @returns {Readonly<Category> | undefined}
 */
export function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id === id);
}

// --- Custom category management (localStorage) ---

const KEY_CUSTOM_CATS = "cg:v1:custom-categories";
const KEY_HIDDEN_CATS = "cg:v1:hidden-categories";

/**
 * Load custom categories from localStorage.
 * @returns {Category[]}
 */
function loadCustomCategories() {
  const raw = localStorage.getItem(KEY_CUSTOM_CATS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) =>
      c && typeof c.id === "string" && c.id !== "" &&
      typeof c.name === "string" && c.name !== "" &&
      (c.type === "expense" || c.type === "income" || c.type === "ambos")
    );
  } catch (_) {
    return [];
  }
}

/**
 * Load hidden default category IDs from localStorage.
 * @returns {Set<string>}
 */
function loadHiddenCategories() {
  const raw = localStorage.getItem(KEY_HIDDEN_CATS);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string"));
  } catch (_) {
    return new Set();
  }
}

/**
 * Load all categories: defaults (minus hidden) + custom ones from localStorage.
 * @returns {Category[]}
 */
export function loadAllCategories() {
  const hidden = loadHiddenCategories();
  const customs = loadCustomCategories();
  const defaults = CATEGORIES.filter((c) => !hidden.has(c.id));
  return [...defaults, ...customs];
}

/**
 * Save a new custom category to localStorage.
 * @param {Category} cat
 */
export function saveCustomCategory(cat) {
  if (!cat || typeof cat.id !== "string" || typeof cat.name !== "string") return;
  const customs = loadCustomCategories();
  const exists = customs.some((c) => c.id === cat.id) || CATEGORIES.some((c) => c.id === cat.id);
  if (exists) return;
  customs.push(cat);
  localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify(customs));
}

/**
 * Delete a category by id. Default categories are hidden (can be restored).
 * Custom categories are permanently deleted.
 * @param {string} id
 */
export function deleteCategory(id) {
  // If it's a custom category, delete it permanently
  const customs = loadCustomCategories();
  const isCustom = customs.some((c) => c.id === id);
  if (isCustom) {
    const next = customs.filter((c) => c.id !== id);
    localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify(next));
    return;
  }
  // If it's a default category, hide it
  if (CATEGORIES.some((c) => c.id === id)) {
    const hidden = loadHiddenCategories();
    hidden.add(id);
    localStorage.setItem(KEY_HIDDEN_CATS, JSON.stringify([...hidden]));
  }
}

/**
 * Restore all hidden default categories.
 */
export function restoreHiddenCategories() {
  localStorage.removeItem(KEY_HIDDEN_CATS);
}

/**
 * Check if a category is hidden.
 * @param {string} id
 * @returns {boolean}
 */
export function isCategoryHidden(id) {
  return loadHiddenCategories().has(id);
}

// Backward-compatible alias
export const deleteCustomCategory = deleteCategory;
