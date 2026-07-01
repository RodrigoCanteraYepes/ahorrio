// Pure totals calculator for v0.1.
// Both functions are pure: they take a transactions array and a month
// key, and return derived data. No storage I/O. ES module.

/**
 * @typedef {import("./storage.js").Transaction} Transaction
 */

/**
 * Compute income, expenses, net, and count for a given month.
 * `monthKey` is "YYYY-MM". Only transactions whose `dateISO` starts
 * with `monthKey` are counted.
 * @param {Transaction[]} transactions
 * @param {string} monthKey  "YYYY-MM".
 * @returns {{ income: number, expenses: number, net: number, count: number }}
 *   All monetary fields are integer cents; `net = income - expenses`.
 */
export function computeTotals(transactions, monthKey) {
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

/**
 * Group the month's transactions by categoryId. Each entry contains
 * the summed amount in cents and the row count for that category.
 * @param {Transaction[]} transactions
 * @param {string} monthKey  "YYYY-MM".
 * @returns {Map<string, { amountCents: number, count: number }>}
 */
export function groupByCategory(transactions, monthKey) {
  /** @type {Map<string, { amountCents: number, count: number }>} */
  const out = new Map();
  for (const t of transactions) {
    if (typeof t.dateISO !== "string" || !t.dateISO.startsWith(monthKey)) continue;
    const cur = out.get(t.categoryId) ?? { amountCents: 0, count: 0 };
    cur.amountCents += t.amountCents;
    cur.count += 1;
    out.set(t.categoryId, cur);
  }
  return out;
}

// Manual verification helper for the user (no test runner).
if (typeof window !== "undefined") {
  window.__cg_totals = { computeTotals, groupByCategory };
}
