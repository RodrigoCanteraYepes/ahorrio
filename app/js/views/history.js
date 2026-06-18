// Monthly history view. Shows a bar chart of expenses per month (last 12 months)
// and a list of monthly summaries with income, expenses, net, and cumulative savings.
// Pure render: re-invoke on every route change. ES module.

import { loadTransactions } from "../storage.js";
import { formatEUR } from "../format.js";
import { navigate } from "../router.js";

/** @param {HTMLElement} root */
export function renderHistoryView(root) {
  root.innerHTML = "";

  const allTxs = loadTransactions();
  const months = aggregateMonths(allTxs);

  const screen = el("section", "history-view");
  screen.setAttribute("aria-labelledby", "history-title");

  // --- header ---
  const header = el("header", "history-view__header");
  const back = el("button", "history-view__back", "\u2190 Atr\u00e1s");
  back.type = "button";
  back.setAttribute("aria-label", "Volver al inicio");
  back.addEventListener("click", (ev) => { ev.preventDefault(); navigate("dashboard"); });
  header.appendChild(back);
  header.appendChild(el("h1", "history-view__title", "Historial mensual"));
  screen.appendChild(header);

  if (months.length === 0) {
    const empty = el("div", "empty-state");
    empty.appendChild(el("p", "empty-state__title", "A\u00fan no hay datos para mostrar"));
    screen.appendChild(empty);
    root.appendChild(screen);
    return;
  }

  // --- bar chart ---
  const chartSection = el("section", "history-view__chart-section");
  chartSection.appendChild(el("h2", "history-view__section-title", "Gastos por mes"));
  const chartContainer = el("div", "bar-chart");
  const canvas = document.createElement("canvas");
  canvas.className = "bar-chart__canvas";
  canvas.width = 600;
  canvas.height = 300;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Gráfico de barras de gastos mensuales");
  chartContainer.appendChild(canvas);
  chartSection.appendChild(chartContainer);
  screen.appendChild(chartSection);

  // --- monthly summary list ---
  const summarySection = el("section", "history-view__summary-section");
  summarySection.appendChild(el("h2", "history-view__section-title", "Resumen mensual"));
  const summaryList = el("div", "month-summary-list");

  let cumulativeSavings = 0;
  for (const month of months) {
    cumulativeSavings += month.net;
    const row = el("div", "month-summary");

    const labelCol = el("div", "month-summary__label");
    labelCol.appendChild(el("span", "month-summary__month", month.label));
    labelCol.appendChild(el("span", "month-summary__count", `${month.count} movimiento${month.count !== 1 ? "s" : ""}`));
    row.appendChild(labelCol);

    const valuesCol = el("div", "month-summary__values");
    valuesCol.appendChild(el("span", "month-summary__income", `+${formatEUR(month.income)}`));
    valuesCol.appendChild(el("span", "month-summary__expenses", `-${formatEUR(month.expenses)}`));
    row.appendChild(valuesCol);

    const netCol = el("div", "month-summary__net");
    netCol.appendChild(el("span", `month-summary__net-value ${month.net >= 0 ? "month-summary__net-value--positive" : "month-summary__net-value--negative"}`, formatEUR(month.net)));
    row.appendChild(netCol);

    summaryList.appendChild(row);
  }
  summarySection.appendChild(summaryList);

  // --- cumulative savings ---
  const savingsRow = el("div", "history-view__savings");
  savingsRow.appendChild(el("span", "history-view__savings-label", "Ahorro acumulado"));
  const lastSavings = cumulativeSavings;
  savingsRow.appendChild(el("span", `history-view__savings-value ${lastSavings >= 0 ? "history-view__savings-value--positive" : "history-view__savings-value--negative"}`, formatEUR(Math.abs(lastSavings))));
  summarySection.appendChild(savingsRow);

  screen.appendChild(summarySection);
  root.appendChild(screen);

  // Draw bar chart after DOM is ready
  requestAnimationFrame(() => drawBarChart(canvas, months));
}

/**
 * @typedef {{ key: string, label: string, income: number, expenses: number, net: number, count: number }} MonthData
 */

/**
 * Aggregate transactions by month, returning the last 12 months with data.
 * @param {import("../storage.js").Transaction[]} txs
 * @returns {MonthData[]}
 */
function aggregateMonths(txs) {
  /** @type {Map<string, { income: number, expenses: number, count: number }>} */
  const map = new Map();

  for (const tx of txs) {
    if (typeof tx.dateISO !== "string" || tx.dateISO.length < 7) continue;
    const key = tx.dateISO.slice(0, 7);
    const cur = map.get(key) ?? { income: 0, expenses: 0, count: 0 };
    cur.count += 1;
    if (tx.type === "income") cur.income += tx.amountCents;
    else if (tx.type === "expense") cur.expenses += tx.amountCents;
    map.set(key, cur);
  }

  // Sort keys descending and take last 12
  const sortedKeys = [...map.keys()].sort().reverse().slice(0, 12).reverse();

  return sortedKeys.map((key) => {
    const data = map.get(key) ?? { income: 0, expenses: 0, count: 0 };
    const [y, m] = key.split("-");
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const label = `${monthNames[Number(m) - 1]} ${y.slice(2)}`;
    return { key, label, income: data.income, expenses: data.expenses, net: data.income - data.expenses, count: data.count };
  });
}

/**
 * Draw a grouped bar chart (income vs expenses) on a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {MonthData[]} months
 */
function drawBarChart(canvas, months) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const pad = { top: 20, right: 20, bottom: 50, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  // Find max value for scale
  const maxVal = Math.max(
    ...months.map((m) => Math.max(m.income, m.expenses)),
    1
  );

  const groupCount = months.length;
  const groupWidth = chartW / groupCount;
  const barWidth = Math.max(8, (groupWidth * 0.7) / 2);
  const gap = Math.max(2, groupWidth * 0.1);

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (chartH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();

    // Y-axis labels
    const val = maxVal - (maxVal / gridLines) * i;
    ctx.fillStyle = "#6B7280";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatEUR(Math.round(val)), pad.left - 8, y);
  }

  // Bars
  const incomeColor = "#1F8F61";
  const expenseColor = "#C73E3A";

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const x0 = pad.left + groupWidth * i + gap;

    // Income bar
    const incomeH = maxVal > 0 ? (m.income / maxVal) * chartH : 0;
    ctx.fillStyle = incomeColor;
    ctx.fillRect(x0, pad.top + chartH - incomeH, barWidth, incomeH);

    // Expense bar
    const expenseH = maxVal > 0 ? (m.expenses / maxVal) * chartH : 0;
    ctx.fillStyle = expenseColor;
    ctx.fillRect(x0 + barWidth + 2, pad.top + chartH - expenseH, barWidth, expenseH);

    // X-axis label
    ctx.fillStyle = "#6B7280";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(m.label, x0 + barWidth, pad.top + chartH + 8);
  }

  // Legend
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

// --- DOM helper ---
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
