// Money and date formatters for v0.1.
// All functions are pure; no DOM, no storage. ES module.
//
// Conventions:
//   - Money is stored as integer cents; "25,50" is the user-facing form.
//   - formatEUR uses a regular (non-breaking) space before the euro sign
//     for readability; the design originally suggested a thin space, but
//     the orchestrator's Batch A brief asked for a regular space and
//     documented the choice. Both are acceptable for v0.1.
//   - Dates are stored canonically as "YYYY-MM-DD" and displayed as
//     "dd/MM/yyyy".

/**
 * Format integer cents as a Spanish euro string.
 * @param {number} cents  Non-negative integer.
 * @returns {string}      Example: 2550 -> "25,50 €", 150000 -> "1.500,00 €".
 */
export function formatEUR(cents) {
  const value = (Math.round(cents) / 100).toFixed(2);
  const [intPart, decPart] = value.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${decPart} €`;
}

/**
 * Parse a Spanish/European money string into integer cents.
 * Accepts both "," and "." as the decimal separator and "." as the
 * thousands separator. An integer input ("25") is treated as euros.
 * @param {string} input
 * @returns {number | null}  Integer cents, or null on invalid input.
 */
export function parseEURInput(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;

  let normalized = trimmed;
  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    // The rightmost separator is the decimal one; strip the other.
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }
  // If only "." is present, treat it as the decimal separator.

  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

/**
 * Format a canonical ISO date "YYYY-MM-DD" as Spanish "dd/MM/yyyy".
 * @param {string} iso
 * @returns {string}
 */
export function formatDateES(iso) {
  if (typeof iso !== "string") return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Parse a user-entered date in either "dd/MM/yyyy" or "YYYY-MM-DD" form
 * and return the canonical "YYYY-MM-DD". Returns null on invalid input
 * (malformed, impossible dates like 31/02/2026, etc.).
 * @param {string} input
 * @returns {string | null}
 */
export function parseDateInput(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  let year, month, day;

  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (m) {
    year = Number(m[1]); month = Number(m[2]); day = Number(m[3]);
  } else {
    m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (!m) return null;
    day = Number(m[1]); month = Number(m[2]); year = Number(m[3]);
  }

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  // Round-trip the date to validate (rejects 2026-02-31, etc.).
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) return null;

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Return today's date as "YYYY-MM-DD" in the user's local timezone.
 * @returns {string}
 */
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Expose a tiny verification helper on window for the manual
// acceptance check in Chrome DevTools (the user has no test runner).
if (typeof window !== "undefined") {
  window.__cg_format = { formatEUR, parseEURInput, formatDateES, parseDateInput, todayISO };
}
