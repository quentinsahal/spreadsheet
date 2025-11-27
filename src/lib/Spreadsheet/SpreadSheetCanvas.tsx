import { useCallback, useEffect, useRef, useState } from "react";
import { getCellFromPageCoord, keyToDirection, move, config } from "./helpers";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { useRedraw } from "./hooks/useRedraw";
import { useResize } from "./hooks/useResize";
import { SelectedCell } from "./SelectedCell";
import { ColumnHeaders } from "./ColumnHeaders";
import { RowHeaders } from "./RowHeaders";
import { RemoteSelections } from "./RemoteSelections";
import type { Position } from "../../typings";
import { debug } from "../debug";

export function SpreadsheetCanvas() {
  const [action, setAction] = useState<"view" | "edit">("view");
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clickTimerRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnHeaderRef = useRef<HTMLDivElement>(null);
  const rowHeaderRef = useRef<HTMLDivElement>(null);

  const {
    localLockedCell,
    matrix,
    matrixVersion,
    selectedCell,
    lockCell,
    unlockCell,
    updateSelectedCell,
  } = useSpreadsheet();

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const scrollTop = scrollContainerRef.current.scrollTop;

      if (columnHeaderRef.current) {
        columnHeaderRef.current.scrollLeft = scrollLeft;
      }
      if (rowHeaderRef.current) {
        rowHeaderRef.current.scrollTop = scrollTop;
      }
    }
  };

  const handleColumnHeaderScroll = () => {
    if (columnHeaderRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft =
        columnHeaderRef.current.scrollLeft;
    }
  };

  const handleRowHeaderScroll = () => {
    if (rowHeaderRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = rowHeaderRef.current.scrollTop;
    }
  };

  useRedraw({ canvas: canvasRef.current, redrawTrigger });

  useResize(
    canvasRef.current,
    matrix,
    useCallback(() => {
      setRedrawTrigger((prev) => prev + 1);
    }, [setRedrawTrigger])
  );

  // Trigger redraw when selection or matrix changes
  useEffect(() => {
    setRedrawTrigger((prev) => prev + 1);
  }, [selectedCell, matrixVersion]);

  // Auto-unlock when selection changes to a different cell
  useEffect(() => {
    if (
      localLockedCell &&
      selectedCell &&
      (localLockedCell.row !== selectedCell.row ||
        localLockedCell.col !== selectedCell.col)
    ) {
      debug.canvas.log("Selection changed, unlocking", localLockedCell);
      unlockCell(localLockedCell);
      setAction("view");
    }
  }, [selectedCell, localLockedCell, unlockCell]);

  useEffect(() => {
    // Event pour se balader avec le clavier dans les cellules
    const handleKeyPress = (e: KeyboardEvent) => {
      if (selectedCell && action === "view") {
        e.preventDefault();
        const nextCell = move(
          matrix,
          { x: selectedCell.col, y: selectedCell.row },
          keyToDirection(e.key)
        );

        updateSelectedCell({ ...nextCell });
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [selectedCell, action, matrix, updateSelectedCell]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = window.setTimeout(() => {
      // offsetX/offsetY gives position within canvas element
      const cell = getCellFromPageCoord(matrix, {
        x: e.nativeEvent.offsetX + config.rowHeaderWidth,
        y: e.nativeEvent.offsetY + config.columnHeaderHeight,
      });
      debug.canvas.log("Single click", cell);
      setAction("view");
      updateSelectedCell({ ...cell });
      clickTimerRef.current = null;
    }, 150);
  };

  const handleLockCell = (pos: Position) => {
    debug.canvas.log("Locking cell", pos);
    lockCell({ row: pos.row, col: pos.col });
    setAction("edit");
  };

  const handleUnlockCell = () => {
    debug.canvas.log("Unlocking cell");
    unlockCell({ row: selectedCell!.row, col: selectedCell!.col });
    setAction("view");
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    // offsetX/offsetY already gives position within canvas, just add header offsets
    const cell = getCellFromPageCoord(matrix, {
      x: e.nativeEvent.offsetX + config.rowHeaderWidth,
      y: e.nativeEvent.offsetY + config.columnHeaderHeight,
    });

    // Check if cell is locked by another user
    const cellData = matrix[cell.col]?.[cell.row];
    const userId = sessionStorage.getItem("userId");
    if (cellData?.lockedBy && cellData.lockedBy !== userId) {
      debug.canvas.warn("Cell locked by another user", cellData.lockedBy);
      return;
    }

    updateSelectedCell({ ...cell });
    handleLockCell({ row: cell.row, col: cell.col });
  };

  return (
    <div
      style={{
        position: "relative",
        height: "calc(100vh - 140px)",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {/* Top-left corner cell */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: config.rowHeaderWidth,
          height: config.columnHeaderHeight,
          backgroundColor: "#fff",
          borderRight: "1px solid #c0bebeff",
          borderBottom: "1px solid #c0bebeff",
          zIndex: 20,
        }}
      />

      {/* Column headers - fixed at top */}
      <div
        ref={columnHeaderRef}
        className="hide-scrollbar"
        style={{
          position: "absolute",
          top: 0,
          left: config.rowHeaderWidth,
          right: 0,
          height: config.columnHeaderHeight,
          overflowX: "scroll",
          overflowY: "hidden",
          zIndex: 15,
        }}
        onScroll={handleColumnHeaderScroll}
      >
        <ColumnHeaders />
      </div>

      {/* Row headers - fixed at left */}
      <div
        ref={rowHeaderRef}
        className="hide-scrollbar"
        style={{
          position: "absolute",
          top: config.columnHeaderHeight,
          left: 0,
          bottom: 0,
          width: config.rowHeaderWidth,
          overflowY: "scroll",
          overflowX: "hidden",
          zIndex: 15,
        }}
        onScroll={handleRowHeaderScroll}
      >
        <RowHeaders />
      </div>

      {/* Scrollable canvas container */}
      <div
        ref={scrollContainerRef}
        style={{
          position: "absolute",
          top: config.columnHeaderHeight,
          left: config.rowHeaderWidth,
          right: 0,
          bottom: 0,
          overflow: "scroll",
        }}
        onScroll={handleScroll}
      >
        <div style={{ position: "relative" }}>
          <canvas
            id="spreadsheet"
            ref={canvasRef}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          ></canvas>
          <RemoteSelections />
          {action && (
            <SelectedCell
              mode={action}
              onLockCell={handleLockCell}
              onUnlockCell={handleUnlockCell}
            />
          )}
        </div>
      </div>
    </div>
  );
}
