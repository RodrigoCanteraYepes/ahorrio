import { describe, it, expect, beforeEach } from "vitest";
import { CATEGORIES, getCategoryById, loadAllCategories, saveCustomCategory, deleteCategory, restoreHiddenCategories } from "../categories.js";

describe("CATEGORIES", () => {
  it("has 8 default categories", () => {
    expect(CATEGORIES).toHaveLength(8);
  });

  it("has correct structure", () => {
    for (const cat of CATEGORIES) {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("type");
      expect(cat).toHaveProperty("icon");
      expect(cat).toHaveProperty("color");
      expect(["expense", "income", "ambos"]).toContain(cat.type);
    }
  });
});

describe("getCategoryById", () => {
  it("finds existing category", () => {
    const cat = getCategoryById("comida");
    expect(cat).toBeDefined();
    expect(cat.name).toBe("Comida");
  });

  it("returns undefined for unknown id", () => {
    expect(getCategoryById("unknown")).toBeUndefined();
  });
});

describe("loadAllCategories", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when no custom data", () => {
    const cats = loadAllCategories();
    expect(cats).toHaveLength(8);
  });

  it("includes custom categories", () => {
    localStorage.setItem("cg:v1:custom-categories", JSON.stringify([
      { id: "custom1", name: "Custom", type: "expense", icon: "🎯", color: "#000" }
    ]));
    const cats = loadAllCategories();
    expect(cats).toHaveLength(9);
    expect(cats.find(c => c.id === "custom1")).toBeDefined();
  });

  it("excludes hidden categories", () => {
    localStorage.setItem("cg:v1:hidden-categories", JSON.stringify(["ocio"]));
    const cats = loadAllCategories();
    expect(cats).toHaveLength(7);
    expect(cats.find(c => c.id === "ocio")).toBeUndefined();
  });
});

describe("saveCustomCategory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves a new custom category", () => {
    const cat = { id: "test", name: "Test", type: "expense", icon: "🧪", color: "#000" };
    saveCustomCategory(cat);
    const cats = loadAllCategories();
    expect(cats.find(c => c.id === "test")).toBeDefined();
  });

  it("does not save duplicate id", () => {
    const cat = { id: "test", name: "Test", type: "expense", icon: "🧪", color: "#000" };
    saveCustomCategory(cat);
    saveCustomCategory(cat);
    const raw = JSON.parse(localStorage.getItem("cg:v1:custom-categories"));
    expect(raw).toHaveLength(1);
  });

  it("does not save default category id", () => {
    const cat = { id: "comida", name: "Duplicate", type: "expense", icon: "🧪", color: "#000" };
    saveCustomCategory(cat);
    const raw = JSON.parse(localStorage.getItem("cg:v1:custom-categories"));
    expect(raw || []).toHaveLength(0);
  });
});

describe("deleteCategory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hides default category", () => {
    deleteCategory("ocio");
    const cats = loadAllCategories();
    expect(cats.find(c => c.id === "ocio")).toBeUndefined();
  });

  it("permanently deletes custom category", () => {
    const cat = { id: "custom", name: "Custom", type: "expense", icon: "🧪", color: "#000" };
    saveCustomCategory(cat);
    deleteCategory("custom");
    const cats = loadAllCategories();
    expect(cats.find(c => c.id === "custom")).toBeUndefined();
  });
});

describe("restoreHiddenCategories", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("restores all hidden categories", () => {
    deleteCategory("ocio");
    deleteCategory("comida");
    restoreHiddenCategories();
    const cats = loadAllCategories();
    expect(cats).toHaveLength(8);
  });
});
