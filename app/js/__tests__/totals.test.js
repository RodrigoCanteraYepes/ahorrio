import { describe, it, expect } from "vitest";
import { computeTotals, groupByCategory } from "../totals.js";

const makeTx = (overrides) => ({
  id: "test-id",
  type: "expense",
  amountCents: 1000,
  categoryId: "comida",
  dateISO: "2026-06-15",
  description: "Test",
  createdAt: "2026-06-15T10:00:00Z",
  updatedAt: "2026-06-15T10:00:00Z",
  ...overrides,
});

describe("computeTotals", () => {
  it("returns zeros for empty array", () => {
    const result = computeTotals([], "2026-06");
    expect(result).toEqual({ income: 0, expenses: 0, net: 0, count: 0 });
  });

  it("computes totals for a single expense", () => {
    const txs = [makeTx({ amountCents: 2500 })];
    const result = computeTotals(txs, "2026-06");
    expect(result).toEqual({ income: 0, expenses: 2500, net: -2500, count: 1 });
  });

  it("computes totals for mixed transactions", () => {
    const txs = [
      makeTx({ type: "expense", amountCents: 1000 }),
      makeTx({ type: "income", amountCents: 5000, categoryId: "sueldo" }),
      makeTx({ type: "expense", amountCents: 2000, dateISO: "2026-06-20" }),
    ];
    const result = computeTotals(txs, "2026-06");
    expect(result).toEqual({ income: 5000, expenses: 3000, net: 2000, count: 3 });
  });

  it("filters by month key", () => {
    const txs = [
      makeTx({ dateISO: "2026-06-15" }),
      makeTx({ dateISO: "2026-07-15" }),
    ];
    const result = computeTotals(txs, "2026-06");
    expect(result.count).toBe(1);
  });
});

describe("groupByCategory", () => {
  it("returns empty map for no transactions", () => {
    const result = groupByCategory([], "2026-06");
    expect(result.size).toBe(0);
  });

  it("groups by category", () => {
    const txs = [
      makeTx({ categoryId: "comida", amountCents: 1000 }),
      makeTx({ categoryId: "comida", amountCents: 2000 }),
      makeTx({ categoryId: "ocio", amountCents: 3000 }),
    ];
    const result = groupByCategory(txs, "2026-06");
    expect(result.get("comida")).toEqual({ amountCents: 3000, count: 2 });
    expect(result.get("ocio")).toEqual({ amountCents: 3000, count: 1 });
  });

  it("filters by month", () => {
    const txs = [
      makeTx({ categoryId: "comida", dateISO: "2026-06-15" }),
      makeTx({ categoryId: "comida", dateISO: "2026-07-15" }),
    ];
    const result = groupByCategory(txs, "2026-06");
    expect(result.get("comida").count).toBe(1);
  });
});
