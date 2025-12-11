import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHotkeys } from "@/hooks/use-hotkeys";

type Shortcut = {
  keys: string[];
  description: string;
  context?: string;
};

const shortcuts: Shortcut[] = [
  { keys: ["Ctrl", "Enter"], description: "Send message", context: "Chat" },
  { keys: ["Escape"], description: "Cancel streaming", context: "Chat" },
  {
    keys: ["Ctrl", "Shift", "J"],
    description: "New chat",
    context: "Chat",
  },
  {
    keys: ["Ctrl", "Shift", "F"],
    description: "Focus search",
    context: "Chat",
  },
  {
    keys: ["Ctrl", "Shift", "U"],
    description: "Upload file",
    context: "Files",
  },
  { keys: ["Ctrl", "Shift", "?"], description: "Show keyboard shortcuts" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-medium font-mono text-muted-foreground text-xs">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  const hotkeys = useMemo(
    () => [
      {
        key: "?",
        ctrl: true,
        shift: true,
        callback: () => setOpen((prev) => !prev),
      },
    ],
    []
  );

  useHotkeys(hotkeys);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              className="flex items-center justify-between gap-4"
              key={shortcut.description}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{shortcut.description}</span>
                {shortcut.context && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                    {shortcut.context}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key, index) => (
                  <span className="flex items-center gap-1" key={key}>
                    {index > 0 && (
                      <span className="text-muted-foreground text-xs">+</span>
                    )}
                    <Kbd>{key}</Kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
