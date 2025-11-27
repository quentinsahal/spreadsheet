import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  CellView,
  Matrix,
  RemoteUserSelection,
  Cell,
  ActiveUser,
  UserSelection,
  Position,
} from "../../typings";
import { useSpreadsheetConnector } from "../../hooks/useSpreadsheetConnector";
import { createMatrixFromCells } from "./helpers";
import { config } from "../../config";

interface SpreadsheetContextValue {
  matrix: Matrix;
  matrixVersion: number;
  spreadsheetId: string | undefined;
  selectedCell: CellView | null;
  lastSelectedCell: CellView | null;
  localLockedCell: Position | null;
  remoteSelections: Map<string, RemoteUserSelection>;
  activeUsers: ActiveUser[];
  isConnected: boolean;
  updateSelectedCell: (cell: CellView) => void;
  lockCell: (pos: Position) => void;
  unlockCell: (pos: Position) => void;
  updateCellContent: (pos: Position, value: string | number) => void;
}

interface SpreadsheetProviderProps {
  children: ReactNode;
  spreadsheetId?: string;
  wsUrl?: string;
}

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null);

export function SpreadsheetProvider({
  children,
  spreadsheetId,
  wsUrl = config.wsUrl,
}: SpreadsheetProviderProps) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const matrixRef = useRef<Matrix>([]);
  const [matrixVersion, setMatrixVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSelectedCell, setLastSelectedCell] = useState<CellView | null>(
    null
  );
  const [selectedCell, setSelectedCell] = useState<CellView | null>(null);
  const [remoteSelections, setRemoteSelections] = useState<
    Map<string, RemoteUserSelection>
  >(new Map());
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [localLockedCell, setLocalLockedCell] = useState<Position | null>(null);

  // WebSocket connector callbacks
  const handleInitialData = useCallback(
    (
      cells: Cell[],
      activeUsers: ActiveUser[],
      selections: UserSelection[],
      locks: { row: number; col: number; lockedBy: string }[]
    ) => {
      console.log("Loading initial data from Redis:", {
        cells,
        activeUsers,
        selections,
        locks,
      });

      // Initialize matrix from Redis cells - always create proper matrix
      matrixRef.current = createMatrixFromCells(cells);

      // Apply locks to matrix
      locks.forEach(({ row, col, lockedBy }) => {
        if (matrixRef.current[col] && matrixRef.current[col][row]) {
          matrixRef.current[col][row].lockedBy = lockedBy;
        }
      });

      // Set active users
      setActiveUsers(activeUsers);

      // Set remote selections
      const selectionsMap = new Map<string, RemoteUserSelection>();
      selections.forEach((sel) => {
        selectionsMap.set(sel.userId, {
          userName: sel.userName,
          row: sel.row,
          col: sel.col,
          color: sel.color,
        });
      });
      setRemoteSelections(selectionsMap);

      setMatrixVersion((v) => v + 1);
      setIsLoading(false); // Finish loading after data is loaded
      forceUpdate();
    },
    []
  );

  const handleCellUpdate = useCallback(
    (row: number, col: number, value: string) => {
      console.log("Remote cell update:", row, col, value);
      matrixRef.current[col][row].value = value;
      setMatrixVersion((v) => v + 1);
      forceUpdate();
    },
    []
  );

  const handleUserJoined = useCallback((userId: string, userName: string) => {
    console.log("User joined:", userId, userName);
    setActiveUsers((prev) => {
      if (prev.some((u) => u.id === userId)) return prev;
      return [...prev, { id: userId, name: userName }];
    });
  }, []);

  const handleUserLeft = useCallback((userId: string) => {
    console.log("User left:", userId);
    setActiveUsers((prev) => prev.filter((u) => u.id !== userId));
    setRemoteSelections((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const handleUserSelection = useCallback(
    (
      userId: string,
      userName: string,
      row: number,
      col: number,
      color: string
    ) => {
      console.log("Remote user selection:", userName, row, col);
      setRemoteSelections((prev) => {
        const next = new Map(prev);
        next.set(userId, { userName, row, col, color });
        return next;
      });
    },
    []
  );

  const handleCellLocked = useCallback((pos: Position) => {
    if (pos.row === undefined || pos.col === undefined) return;
    const cell = matrixRef.current[pos.col][pos.row];
    if (cell) {
      // Placeholder for future locking logic; for now just mark locally
      cell.lockedBy = "remote";
      setMatrixVersion((v) => v + 1);
      forceUpdate();
    }
  }, []);

  const handleCellUnlocked = useCallback((pos: Position) => {
    if (pos.row === undefined || pos.col === undefined) return;
    const cell = matrixRef.current[pos.col][pos.row];
    if (cell) {
      delete cell.lockedBy;
      setMatrixVersion((v) => v + 1);
      forceUpdate();
    }
  }, []);

  // Integrate WebSocket connector
  const { wsActions, isConnected } = useSpreadsheetConnector({
    spreadsheetId: spreadsheetId ?? "",
    url: wsUrl,
    onInitialData: handleInitialData,
    onCellUpdate: handleCellUpdate,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onUserSelection: handleUserSelection,
    onCellLocked: handleCellLocked,
    onCellUnlocked: handleCellUnlocked,
  });

  const updateCellContent = (
    coords: Pick<CellView, "row" | "col">,
    value: string | number
  ) => {
    matrixRef.current[coords.col][coords.row].value = value;
    setLastSelectedCell(selectedCell);
    // Send WebSocket update
    wsActions.updateCell(coords.row, coords.col, value.toString());
    setSelectedCell((prev) => ({ ...prev, value } as CellView));
    setMatrixVersion((v) => v + 1);
    forceUpdate();
  };

  const updateSelectedCell = (cell: CellView): void => {
    setSelectedCell(cell);
    // Send selection to WebSocket
    wsActions.selectCell(cell.row, cell.col);
  };

  const lockCell = useCallback(
    (pos: Position) => {
      const userId = sessionStorage.getItem("userId") || "";
      console.log("Provider lockCell called:", {
        pos,
        userId,
        localLockedCell,
      });
      // Release previous lock if any
      if (localLockedCell) {
        console.log("Releasing previous lock:", localLockedCell);
        wsActions.unlockCell(localLockedCell, userId);
      }
      console.log("Calling wsActions.lockCell:", pos);
      wsActions.lockCell(pos, userId);
      setLocalLockedCell(pos);
    },
    [localLockedCell, wsActions]
  );

  const unlockCell = useCallback(
    (pos: Position) => {
      const userId = sessionStorage.getItem("userId") || "";
      console.log("Unlocking cell:", { pos, userId, localLockedCell });
      wsActions.unlockCell(pos, userId);
      setLocalLockedCell(null);
      console.log("Cell unlocked, localLockedCell cleared");
    },
    [wsActions, localLockedCell]
  );

  const value: SpreadsheetContextValue = {
    matrix: matrixRef.current,
    matrixVersion,
    spreadsheetId,
    selectedCell,
    lastSelectedCell,
    remoteSelections,
    activeUsers,
    isConnected,
    updateSelectedCell,
    localLockedCell,
    lockCell,
    unlockCell,
    updateCellContent,
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#666",
        }}
      >
        Loading spreadsheet data...
      </div>
    );
  }

  return (
    <SpreadsheetContext.Provider value={value}>
      {children}
    </SpreadsheetContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSpreadsheet() {
  const context = useContext(SpreadsheetContext);
  if (!context) {
    throw new Error("useSpreadsheet must be used within SpreadsheetProvider");
  }
  return context;
}
