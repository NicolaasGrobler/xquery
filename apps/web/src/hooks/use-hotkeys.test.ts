import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHotkeys } from "./use-hotkeys";

describe("useHotkeys", () => {
  beforeEach(() => {
    vi.spyOn(document, "addEventListener");
    vi.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers keydown event listener on mount", () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys([{ key: "a", callback }]));

    expect(document.addEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });

  it("removes keydown event listener on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useHotkeys([{ key: "a", callback }]));

    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });

  it("calls callback when matching key is pressed", () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys([{ key: "a", callback }]));

    const event = new KeyboardEvent("keydown", { key: "a" });
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not call callback for non-matching key", () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys([{ key: "a", callback }]));

    const event = new KeyboardEvent("keydown", { key: "b" });
    document.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it("handles ctrl modifier correctly", () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys([{ key: "s", ctrl: true, callback }]));

    // Without ctrl - should not trigger
    const eventWithoutCtrl = new KeyboardEvent("keydown", { key: "s" });
    document.dispatchEvent(eventWithoutCtrl);
    expect(callback).not.toHaveBeenCalled();

    // With ctrl - should trigger
    const eventWithCtrl = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(eventWithCtrl);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("handles shift modifier correctly", () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys([{ key: "a", shift: true, callback }]));

    // Without shift - should not trigger
    const eventWithoutShift = new KeyboardEvent("keydown", { key: "a" });
    document.dispatchEvent(eventWithoutShift);
    expect(callback).not.toHaveBeenCalled();

    // With shift - should trigger
    const eventWithShift = new KeyboardEvent("keydown", {
      key: "a",
      shiftKey: true,
    });
    document.dispatchEvent(eventWithShift);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("respects enabled flag", () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useHotkeys([{ key: "a", callback, enabled }]),
      { initialProps: { enabled: true } }
    );

    // When enabled
    const event1 = new KeyboardEvent("keydown", { key: "a" });
    document.dispatchEvent(event1);
    expect(callback).toHaveBeenCalledTimes(1);

    // When disabled
    rerender({ enabled: false });
    const event2 = new KeyboardEvent("keydown", { key: "a" });
    document.dispatchEvent(event2);
    expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  it("is case-insensitive for key matching", () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys([{ key: "A", callback }]));

    const event = new KeyboardEvent("keydown", { key: "a" });
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("always triggers Escape even when input is focused", () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys([{ key: "Escape", callback }]));

    // Create an input and focus it
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    Object.defineProperty(event, "target", { value: input });
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });
});
