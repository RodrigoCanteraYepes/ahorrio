import { describe, it, expect, beforeEach } from "vitest";
import { currentRoute, navigate, onRouteChange, notify } from "../router.js";

describe("currentRoute", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("returns dashboard for empty hash", () => {
    expect(currentRoute().name).toBe("dashboard");
  });

  it("parses valid route", () => {
    window.location.hash = "#add";
    expect(currentRoute().name).toBe("add");
  });

  it("returns dashboard for unknown route", () => {
    window.location.hash = "#unknown";
    expect(currentRoute().name).toBe("dashboard");
  });

  it("parses query params", () => {
    window.location.hash = "#edit?id=123";
    const route = currentRoute();
    expect(route.name).toBe("edit");
    expect(route.params.get("id")).toBe("123");
  });
});

describe("onRouteChange", () => {
  it("registers and calls handler", () => {
    let called = false;
    const unsub = onRouteChange(() => { called = true; });
    notify({ name: "add", params: new URLSearchParams() });
    expect(called).toBe(true);
    unsub();
  });

  it("unsubscribes handler", () => {
    let callCount = 0;
    const unsub = onRouteChange(() => { callCount++; });
    notify({ name: "add", params: new URLSearchParams() });
    unsub();
    notify({ name: "add", params: new URLSearchParams() });
    expect(callCount).toBe(1);
  });
});
