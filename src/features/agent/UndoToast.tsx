import { Undo2, X } from "lucide-react";
import type { UndoState } from "./hooks";

/**
 * Floating toast shown after a stage advance. Sits above the mobile tab bar.
 * Rendered by pages that use useAdvanceStage; null when there's nothing to undo.
 */
export function UndoToast({
  undoState,
  onUndo,
  onDismiss,
}: {
  undoState: UndoState | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!undoState) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6">
      <div className="flex w-full max-w-md items-center gap-3 rounded-lg bg-sidebar px-4 py-3 text-sm text-sidebar-foreground shadow-lg">
        <span className="min-w-0 flex-1 truncate">{undoState.message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-primary-foreground hover:bg-white/10"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
