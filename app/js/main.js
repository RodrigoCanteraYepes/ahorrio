// Entry point. T9 wires boot: hydrate storage, register the router,
// mount the right view on every route change, and (later in T11)
// register the service worker.
//
// Re-render strategy: simplest possible. On every route change, we
// re-invoke the right `render*` function. Views wipe the root
// element and rebuild; that is cheap (a dozen DOM nodes for v0.1)
// and keeps the code path linear and easy to follow.

import { currentRoute, navigate, notify, onRouteChange } from "./router.js";
import { loadUIState, loadTransactions } from "./storage.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderAddView } from "./views/add.js";
import { renderHistoryView } from "./views/history.js";
import { renderEditView } from "./views/edit.js";
import { renderSettingsView } from "./views/settings.js";

/**
 * Mount the view for the current route. Called on boot, on every
 * `hashchange`, and after every storage write (the caller is
 * responsible for invoking this from the relevant place — for v0.1
 * the storage writes already happen via `navigate("dashboard")` after
 * save, which re-fires the route change handler).
 * @param {HTMLElement} root
 */
export function mount(root, route) {
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

  // Hydrate storage once. No-op if already hydrated (loadUIState is
  // idempotent and creates the key on first run).
  loadUIState();
  loadTransactions();

  // Normalize the URL: if the hash is empty or unknown, snap to
  // #dashboard BEFORE we register the listener so we don't get a
  // spurious first event. This satisfies the T6 acceptance criterion
  // "the URL bar shows ...#dashboard" on a fresh open.
  const initial = currentRoute();
  if (typeof location !== "undefined" && location.hash !== `#${initial.name}`) {
    // history.replaceState keeps this from polluting back-history and
    // does not reload the page under file:// (hash-only change).
    try {
      history.replaceState(null, "", `#${initial.name}`);
    } catch (_) {
      location.hash = `#${initial.name}`;
    }
  }

  // Wire the router: every hashchange re-mounts the right view.
  onRouteChange((route) => mount(root, route));

  // Initial render based on the (now normalized) current route.
  mount(root, currentRoute());

  // Service worker registration (NO-OP until T11). Silent on failure
  // (the SW file does not exist yet, and SW is unavailable under
  // file:// — the app still works in online mode).
  if ("serviceWorker" in navigator) {
    try {
      // Defer to window.load to keep first paint fast.
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => { /* no-op for T9 */ });
      });
    } catch (_) {
      // Defensive: never let SW registration break the app.
    }
  }

  console.info("control-gastos: boot ok");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

// Expose for manual verification in the DevTools console.
if (typeof window !== "undefined") {
  window.__cg_app = { mount, navigate, notify };
}
