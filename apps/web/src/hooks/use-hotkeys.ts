import { useEffect } from "react";

type HotkeyCallback = (event: KeyboardEvent) => void;

type HotkeyConfig = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  callback: HotkeyCallback;
  enabled?: boolean;
};

export function useHotkeys(hotkeys: HotkeyConfig[]) {
  useEffect(() => {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: hotkey matching requires multiple conditions
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const hotkey of hotkeys) {
        if (hotkey.enabled === false) {
          continue;
        }

        const keyMatch = event.key.toLowerCase() === hotkey.key.toLowerCase();
        const ctrlMatch = hotkey.ctrl
          ? event.ctrlKey || event.metaKey
          : !(event.ctrlKey || event.metaKey);
        const metaMatch = hotkey.meta ? event.metaKey : true;
        const shiftMatch = hotkey.shift ? event.shiftKey : !event.shiftKey;

        const needsModifier = hotkey.ctrl || hotkey.meta;
        const isEscape = hotkey.key.toLowerCase() === "escape";

        if (isInputFocused && !needsModifier && !isEscape) {
          continue;
        }

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          event.preventDefault();
          hotkey.callback(event);
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hotkeys]);
}
