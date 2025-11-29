import { useEffect, useRef } from "react";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { move } from "./helpers";
import { Direction, type Position } from "../../typings";

type Mode = "edit" | "view";
export type SelectedCellProps = {
  mode: Mode;
  onLockCell: (pos: Position) => void;
  onUnlockCell: (pos: Position) => void;
};
export function SelectedCell({
  mode,
  onLockCell,
  onUnlockCell,
}: SelectedCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    matrix,
    selectedCell,
    updateSelectedCell,
    draftValue,
    setDraftValue,
    updateCellContent,
    discardDraftValue,
  } = useSpreadsheet();

  useEffect(() => {
    if (mode === "edit" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  useEffect(() => {
    // Handle Enter key to switch between edit and view modes
    // Handle Escape to cancel editing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (mode === "view") {
          onLockCell({ row: selectedCell.row, col: selectedCell.col });
        }
        if (mode === "edit") {
          updateCellContent();
          onUnlockCell({ row: selectedCell.row, col: selectedCell.col });
          updateSelectedCell(
            move(
              matrix,
              { x: selectedCell.col, y: selectedCell.row },
              Direction.Down
            )
          );
        }
      }

      if (e.key === "Escape" && mode === "edit") {
        e.preventDefault();
        discardDraftValue(); // Cancel without saving
        onUnlockCell({ row: selectedCell.row, col: selectedCell.col });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedCell,
    mode,
    matrix,
    onLockCell,
    onUnlockCell,
    updateSelectedCell,
    updateCellContent,
    discardDraftValue,
  ]);

  if (mode === "edit") {
    return (
      <input
        ref={inputRef}
        value={draftValue ?? ""}
        onChange={(e) => {
          setDraftValue(e.target.value);
        }}
        onBlur={() => {
          // Commit when clicking outside the input
          updateCellContent();
          onUnlockCell({ row: selectedCell!.row, col: selectedCell!.col });
        }}
        style={{
          position: "absolute",
          left: selectedCell?.x,
          top: selectedCell?.y,
          width: selectedCell?.width,
          height: selectedCell?.height,
          border: "2px solid blue",
          fontSize: "16px",
          padding: "0",
          margin: "0",
          boxSizing: "border-box",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: selectedCell?.x,
        top: selectedCell?.y,
        width: selectedCell?.width,
        height: selectedCell?.height,
        border: "2px solid #1a73e8",
        backgroundColor: "#fff",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      {selectedCell?.value ?? ""}
      <div
        style={{
          position: "absolute",
          bottom: -4,
          right: -4,
          width: 8,
          height: 8,
          backgroundColor: "#1a73e8",
          border: "2px solid #fff",
          cursor: "crosshair",
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}
