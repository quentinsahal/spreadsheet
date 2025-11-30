import { useCallback, useEffect, useRef, useState } from "react";
import { getCellFromPageCoord, keyToDirection, move, config } from "./helpers";
import { useSpreadsheet } from "./SpreadsheetProvider";
import { useRedraw } from "./hooks/useRedraw";
import { useResize } from "./hooks/useResize";
import { SelectedCell } from "./SelectedCell";
import { ColumnHeaders } from "./ColumnHeaders";
import { RowHeaders } from "./RowHeaders";
import { RemoteSelections } from "./RemoteSelections";
import { debug } from "../debug";

export function SpreadsheetCanvas() {
  // Local UI state for canvas rendering
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clickTimerRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnHeaderRef = useRef<HTMLDivElement>(null);
  const rowHeaderRef = useRef<HTMLDivElement>(null);

  // Get state and dispatch from context
  const { localLockedCell, matrix, matrixVersion, selectedCell, dispatch } =
    useSpreadsheet();

  // Derive editing state from localLockedCell
  const isEditing = localLockedCell !== null;

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
      dispatch({ type: "UNLOCK_CELL", pos: localLockedCell });
    }
  }, [selectedCell, localLockedCell, dispatch]);

  useEffect(() => {
    // Event pour se balader avec le clavier dans les cellules
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only allow navigation when not editing
      if (selectedCell && !isEditing) {
        const direction = keyToDirection(e.key);
        // Only handle arrow keys for navigation
        if (direction !== null) {
          e.preventDefault();
          const nextCell = move(
            matrix,
            { x: selectedCell.col, y: selectedCell.row },
            direction
          );
          dispatch({ type: "SELECT_CELL", cell: nextCell });
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [selectedCell, isEditing, matrix, dispatch]);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Support both Cmd (Mac) and Ctrl (Windows/Linux)
      const modifier = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (modifier && key === "z" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: "UNDO" });
      } else if (modifier && ((key === "z" && e.shiftKey) || key === "y")) {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: "REDO" });
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [dispatch]);

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
      dispatch({ type: "SELECT_CELL", cell });
      clickTimerRef.current = null;
    }, 150);
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

    debug.canvas.log("Double click - selecting and locking", cell);
    dispatch({ type: "SELECT_CELL", cell });
    dispatch({ type: "LOCK_CELL", pos: { row: cell.row, col: cell.col } });
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
          overscrollBehavior: "none",
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
          {selectedCell && <SelectedCell />}
        </div>
      </div>
    </div>
  );
}
