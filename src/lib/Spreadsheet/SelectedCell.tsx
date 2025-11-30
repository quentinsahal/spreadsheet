import { useEffect, useRef } from "react";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { move } from "./helpers";
import { Direction } from "../../typings";

export function SelectedCell() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { matrix, selectedCell, localLockedCell, draftValue, dispatch } =
    useSpreadsheet();

  // Derive mode from state - no props needed
  const isEditing = localLockedCell !== null;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    // Handle Enter key to switch between edit and view modes
    // Handle Escape to cancel editing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (!isEditing) {
          // View mode → Edit mode
          dispatch({
            type: "LOCK_CELL",
            pos: { row: selectedCell.row, col: selectedCell.col },
          });
        } else {
          // Edit mode → View mode + move down
          dispatch({ type: "COMMIT_CELL" });
          dispatch({
            type: "UNLOCK_CELL",
            pos: { row: selectedCell.row, col: selectedCell.col },
          });
          dispatch({
            type: "SELECT_CELL",
            cell: move(
              matrix,
              { x: selectedCell.col, y: selectedCell.row },
              Direction.Down
            ),
          });
        }
      }

      if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        dispatch({ type: "DISCARD_DRAFT" });
        dispatch({
          type: "UNLOCK_CELL",
          pos: { row: selectedCell.row, col: selectedCell.col },
        });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedCell, isEditing, matrix, dispatch]);

  if (isEditing) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const modifier = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (modifier && key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      } else if (modifier && ((key === "z" && e.shiftKey) || key === "y")) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    };

    return (
      <input
        ref={inputRef}
        value={draftValue ?? ""}
        onChange={(e) => {
          dispatch({ type: "SET_DRAFT_VALUE", value: e.target.value });
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Commit when clicking outside the input
          dispatch({ type: "COMMIT_CELL" });
          dispatch({
            type: "UNLOCK_CELL",
            pos: { row: selectedCell!.row, col: selectedCell!.col },
          });
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
