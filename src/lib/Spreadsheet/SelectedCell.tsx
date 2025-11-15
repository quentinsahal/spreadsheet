import { useEffect, useRef } from "react";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { move } from "./helpers";
import { Direction } from "../../typings";

type Mode = "edit" | "view";
export type SelectedCellProps = {
  mode: Mode;
  switchMode: (mode: Mode) => void;
};
export function SelectedCell({ mode, switchMode }: SelectedCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { matrix, selectedCell, updateSelectedCell, updateCellContent } =
    useSpreadsheet();
  useEffect(() => {
    if (mode === "edit" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  useEffect(() => {
    const handleEnterKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedCell) {
        e.preventDefault();
        switchMode(mode === "edit" ? "view" : "edit");

        if (mode === "edit") {
          updateSelectedCell(
            move(
              matrix,
              { x: selectedCell.col, y: selectedCell.row },
              Direction.Down
            )
          );
        }
      }
    };
    document.addEventListener("keydown", handleEnterKey);
    return () => {
      document.removeEventListener("keydown", handleEnterKey);
    };
  }, [selectedCell, mode, matrix, switchMode, updateSelectedCell]);

  if (mode === "edit") {
    return (
      <input
        ref={inputRef}
        value={selectedCell?.value ?? ""}
        onChange={(e) => {
          if (selectedCell) {
            updateCellContent(
              { row: selectedCell.row, col: selectedCell.col },
              e.target.value
            );
          }
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
