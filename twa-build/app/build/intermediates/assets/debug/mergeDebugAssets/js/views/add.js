// Add Transaction view for v0.1. Pure render: it owns the form, but
// delegates persistence to storage.js and navigation to router.js.
// main.js re-mounts this view on every navigation; we do not run a
// diff (same trade-off as dashboard.js).
//
// Resolves TBD-5: Gasto shows type === "expense" || "ambos"; Ingreso
// shows type === "income" || "ambos". Sueldo is hidden in Gasto; the
// five expense-only categories are hidden in Ingreso; Otros is always
// visible. ES module.

import { loadAllCategories } from "../categories.js";
import { parseEURInput, todayISO } from "../format.js";
import { saveTransaction } from "../storage.js";
import { navigate } from "../router.js";
import { showToast } from "../toast.js";

/** @param {"Gasto"|"Ingreso"} tipo */
const categoriesFor = (tipo) =>
  loadAllCategories().filter((c) => tipo === "Gasto" ? c.type === "expense" || c.type === "ambos"
                                          : c.type === "income" || c.type === "ambos");

/** @returns {string} crypto.randomUUID() with a v4-shaped fallback. */
const newId = () => {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

/** @param {HTMLElement} root */
export function renderAddView(root) {
  root.innerHTML = "";
  /** @type {"Gasto"|"Ingreso"} */ let tipo = "Gasto";
  let fecha = todayISO();
  let description = "";

  const screen = h("section", { className: "add-view", "aria-labelledby": "add-title" });

  // header
  const back = h("button", { className: "add-view__back", type: "button", "aria-label": "Volver al inicio" }, "\u2190 Atr\u00e1s");
  back.addEventListener("click", () => { navigate("dashboard"); });
  const title = h("h1", { className: "add-view__title", id: "add-title" }, "A\u00f1adir transacci\u00f3n");
  screen.appendChild(h("header", { className: "add-view__header" }, [back, title]));

  // form
  const form = h("form", { className: "add-view__form", noValidate: true, "aria-label": "Formulario de transacci\u00f3n" });

  // Tipo (segmented)
  const segBtns = [];
  const seg = h("div", { className: "segmented", role: "group", "aria-label": "Tipo de movimiento" });
  for (const opt of /** @type {const} */ (["Gasto", "Ingreso"])) {
    const b = h("button", { className: "segmented__option", type: "button", "aria-pressed": opt === tipo ? "true" : "false", dataset: { tipo: opt } }, opt);
    if (opt === tipo) b.classList.add("segmented__option--active");
    b.addEventListener("click", () => { setTipo(opt); });
    seg.appendChild(b);
    segBtns.push({ value: opt, node: b });
  }
  const tipoError = errPara();
  form.appendChild(h("div", { className: "field field--segmented" }, [h("span", { className: "field__label" }, "Tipo"), seg, tipoError]));

  // Importe
  const importeInput = h("input", { className: "field__input", type: "text", id: "add-importe", inputMode: "decimal", autocomplete: "off", placeholder: "0,00" });
  const importeError = errPara();
  importeInput.setAttribute("aria-describedby", importeError.id);
  form.appendChild(buildField("Importe (\u20ac)", importeInput, importeError));

  // Categor\u00eda
  const catSelect = h("select", { className: "field__input field__input--select", id: "add-categoria" });
  const catError = errPara();
  form.appendChild(buildField("Categor\u00eda", catSelect, catError));

  // Fecha
  const fechaInput = h("input", { className: "field__input", type: "date", id: "add-fecha", value: fecha });
  fechaInput.addEventListener("change", () => { fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaInput.value) ? fechaInput.value : todayISO(); });
  form.appendChild(buildField("Fecha", fechaInput));

  // Descripci\u00f3n
  const descInput = h("input", { className: "field__input", type: "text", id: "add-desc", maxLength: 120, placeholder: "Descripci\u00f3n (opcional)" });
  descInput.addEventListener("input", () => { description = descInput.value; });
  form.appendChild(buildField("Descripci\u00f3n (opcional)", descInput));

  // Save / Cancel
  const saveBtn = h("button", { className: "btn btn--primary add-view__save", type: "button" }, "Guardar");
  saveBtn.disabled = true;
  const cancelBtn = h("button", { className: "btn btn--secondary add-view__cancel", type: "button" }, "Cancelar");
  cancelBtn.addEventListener("click", () => { navigate("dashboard"); });
  form.appendChild(h("div", { className: "add-view__actions" }, [saveBtn, cancelBtn]));

  saveBtn.addEventListener("click", () => { if (!saveBtn.disabled) handleSave(); });
  screen.appendChild(form);
  root.appendChild(screen);

  // wiring
  catSelect.addEventListener("change", () => { catError.hidden = true; updateSaveEnabled(); });
  importeInput.addEventListener("input", () => { importeError.hidden = true; updateSaveEnabled(); });

  function populateCategorias() {
    catSelect.innerHTML = "";
    for (const c of categoriesFor(tipo)) {
      const opt = h("option", { value: c.id }, `${c.icon}  ${c.name}`);
      catSelect.appendChild(opt);
    }
    if (catSelect.options.length > 0) catSelect.value = catSelect.options[0].value;
  }
  function setTipo(next) {
    if (next === tipo || (next !== "Gasto" && next !== "Ingreso")) return;
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
    if (cents === null || cents <= 0) { showErr(importeError, "Introduce un importe v\u00e1lido."); importeInput.focus(); return; }
    if (catSelect.value === "") { showErr(catError, "Selecciona una categor\u00eda."); catSelect.focus(); return; }
    const now = new Date().toISOString();
    const tx = {
      id: newId(),
      type: tipo === "Gasto" ? "expense" : "income",
      amountCents: cents,
      categoryId: catSelect.value,
      dateISO: fecha,
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
    };
    saveTransaction(tx);
    showToast("Transacción guardada", "success");
    navigate("dashboard");
  }

  populateCategorias();
  updateSaveEnabled();
  requestAnimationFrame(() => { try { importeInput.focus({ preventScroll: true }); } catch (_) { importeInput.focus(); } });
}

// --- DOM helpers (compact h() builder) ---
/**
 * @param {string} tag
 * @param {Record<string, any>} [attrs]
 * @param {string | HTMLElement | Array<string | HTMLElement>} [children]
 */
function h(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "className") el.className = v;
    else if (k === "dataset" && typeof v === "object") Object.assign(el.dataset, v);
    else el.setAttribute(k, String(v));
  }
  if (children !== undefined && children !== null) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    else el.appendChild(typeof children === "string" ? document.createTextNode(children) : children);
  }
  return el;
}

const buildField = (label, input, errorEl) => {
  const wrap = h("div", { className: "field" });
  const l = h("label", { className: "field__label" }, label);
  if (input.id) l.htmlFor = input.id;
  wrap.appendChild(l);
  wrap.appendChild(input);
  if (errorEl) wrap.appendChild(errorEl);
  return wrap;
};

const errPara = () => {
  const p = h("p", { className: "field__error", "aria-live": "polite", id: `err-${Math.random().toString(36).slice(2, 9)}` });
  p.hidden = true;
  return p;
};
const showErr = (el, msg) => { el.textContent = msg; el.hidden = false; };
