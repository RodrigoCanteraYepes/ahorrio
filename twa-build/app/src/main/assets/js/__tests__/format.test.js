import { describe, it, expect } from "vitest";
import { formatEUR, parseEURInput, formatDateES, parseDateInput, todayISO } from "../format.js";

describe("formatEUR", () => {
  it("formats cents to euro string", () => {
    expect(formatEUR(0)).toBe("0,00 €");
    expect(formatEUR(100)).toBe("1,00 €");
    expect(formatEUR(2550)).toBe("25,50 €");
    expect(formatEUR(150000)).toBe("1.500,00 €");
    expect(formatEUR(1234567890)).toBe("12.345.678,90 €");
  });

  it("rounds to nearest cent", () => {
    expect(formatEUR(1)).toBe("0,01 €");
    expect(formatEUR(99)).toBe("0,99 €");
  });
});

describe("parseEURInput", () => {
  it("parses valid inputs", () => {
    expect(parseEURInput("25,50")).toBe(2550);
    expect(parseEURInput("25.50")).toBe(2550);
    expect(parseEURInput("1.500,00")).toBe(150000);
    expect(parseEURInput("1,500.00")).toBe(150000);
    expect(parseEURInput("100")).toBe(10000);
  });

  it("returns null for invalid inputs", () => {
    expect(parseEURInput("")).toBeNull();
    expect(parseEURInput("abc")).toBeNull();
    expect(parseEURInput(null)).toBeNull();
    expect(parseEURInput(undefined)).toBeNull();
  });

  it("handles whitespace", () => {
    expect(parseEURInput(" 25,50 ")).toBe(2550);
  });
});

describe("formatDateES", () => {
  it("formats ISO date to Spanish format", () => {
    expect(formatDateES("2026-06-15")).toBe("15/06/2026");
    expect(formatDateES("2026-01-01")).toBe("01/01/2026");
  });

  it("returns empty string for invalid input", () => {
    expect(formatDateES("")).toBe("");
    expect(formatDateES("invalid")).toBe("");
    expect(formatDateES(null)).toBe("");
  });
});

describe("parseDateInput", () => {
  it("parses ISO format", () => {
    expect(parseDateInput("2026-06-15")).toBe("2026-06-15");
  });

  it("parses Spanish format", () => {
    expect(parseDateInput("15/06/2026")).toBe("2026-06-15");
  });

  it("rejects invalid dates", () => {
    expect(parseDateInput("31/02/2026")).toBeNull();
    expect(parseDateInput("2026-13-01")).toBeNull();
    expect(parseDateInput("abc")).toBeNull();
  });
});

describe("todayISO", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
