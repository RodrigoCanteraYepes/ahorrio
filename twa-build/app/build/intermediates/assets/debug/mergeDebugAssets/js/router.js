// Hash router for v0.1. Pure module: no DOM except `location.hash`.
//
// Why hash routing: under file:// the history API silently reloads
// the document because the new path does not resolve to a real file.
// Hash changes are pure client-side in both file:// and https://.
// See design.md section 1.
//
// This module exposes a tiny pub/sub. It does NOT register the
// `hashchange` listener itself; main.js (T9) wires that listener and
// calls `notify()` on every change. This keeps the router testable
// in isolation (push handlers, call `notify` by hand) and small.

const DEFAULT_ROUTE = "dashboard";
const VALID_ROUTES = new Set(["dashboard", "add", "history", "edit", "settings"]);

/** @typedef {{ name: "dashboard" | "add" | "history" | "edit" | "settings", params: URLSearchParams }} Route */

/** @type {Array<(route: Route) => void>} */
const handlers = [];

/** Parse the current `location.hash` into a Route. Unknown or missing hashes -> default. */
export function currentRoute() {
  const raw = (typeof location !== "undefined" ? location.hash : "") || "";
  const stripped = raw.startsWith("#") ? raw.slice(1) : raw;
  const [pathPart, queryPart] = stripped.split("?");
  const candidate = (pathPart || "").trim();
  if (candidate === "" || !VALID_ROUTES.has(candidate)) {
    return { name: /** @type {"dashboard"} */ (DEFAULT_ROUTE), params: new URLSearchParams() };
  }
  return {
    name: /** @type {"dashboard" | "add" | "history" | "edit" | "settings"} */ (candidate),
    params: new URLSearchParams(queryPart || ""),
  };
}

/** Notify every registered handler with the given route. */
export function notify(route) {
  for (const h of handlers) {
    try { h(route); }
    catch (err) { console.error("[router] handler threw:", err); }
  }
}

/** Subscribe to route changes. Returns an unsubscribe function. */
export function onRouteChange(handler) {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/**
 * Navigate to a named route. Updates `location.hash`, which fires
 * `hashchange` and triggers the handlers registered by main.js.
 * @param {"dashboard" | "add" | "history" | "edit" | "settings"} name
 * @param {Record<string, string>} [params]
 */
export function navigate(name, params) {
  const target = VALID_ROUTES.has(name) ? name : DEFAULT_ROUTE;
  let hash = `#${target}`;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString();
    if (qs) hash += `?${qs}`;
  }
  if (typeof location === "undefined") return;
  location.hash = hash;
  // Always notify directly — hashchange doesn't fire reliably in Cordova WebView
  notify(currentRoute());
}

// Manual verification helper for the user (no test runner).
if (typeof window !== "undefined") {
  window.__cg_router = { currentRoute, navigate, onRouteChange };
}
