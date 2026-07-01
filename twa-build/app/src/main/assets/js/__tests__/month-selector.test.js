import { describe, it, expect } from "vitest";
import { previousMonthKey, nextMonthKey, currentMonthKey, monthLabel } from "../views/month-selector.js";

describe("previousMonthKey", () => {
  it("goes to previous month", () => {
    expect(previousMonthKey("2026-06")).toBe("2026-05");
    expect(previousMonthKey("2026-01")).toBe("2025-12");
  });

  it("handles invalid input", () => {
    expect(previousMonthKey("")).toBe("");
    expect(previousMonthKey("invalid")).toBe("invalid");
  });
});

describe("nextMonthKey", () => {
  it("goes to next month", () => {
    expect(nextMonthKey("2026-06")).toBe("2026-07");
    expect(nextMonthKey("2026-12")).toBe("2027-01");
  });

  it("handles invalid input", () => {
    expect(nextMonthKey("")).toBe("");
    expect(nextMonthKey("invalid")).toBe("invalid");
  });
});

describe("currentMonthKey", () => {
  it("returns YYYY-MM format", () => {
    const result = currentMonthKey();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("monthLabel", () => {
  it("formats month key to Spanish label", () => {
    expect(monthLabel("2026-06")).toBe("Junio 2026");
    expect(monthLabel("2026-01")).toBe("Enero 2026");
    expect(monthLabel("2026-12")).toBe("Diciembre 2026");
  });

  it("returns input for invalid format", () => {
    expect(monthLabel("invalid")).toBe("invalid");
    expect(monthLabel("")).toBe("");
  });
});
