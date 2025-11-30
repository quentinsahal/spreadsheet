import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Box } from "@mui/material";
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
import { debug } from "../debug";
import { useDispatcher, type SpreadsheetAction } from "./commands";

interface SpreadsheetContextValue {
  matrix: Matrix;
  matrixVersion: number;
  spreadsheetId: string | undefined;
  selectedCell: CellView | null;
  localLockedCell: Position | null;
  remoteSelections: Map<string, RemoteUserSelection>;
  activeUsers: ActiveUser[];
  isConnected: boolean;
  draftValue: string | null;
  dispatch: (action: SpreadsheetAction) => void;
}

interface SpreadsheetProviderProps {
  children: ReactNode;
  spreadsheetId: string;
}

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null);

export function SpreadsheetProvider({
  children,
  spreadsheetId,
}: SpreadsheetProviderProps) {
  const matrixRef = useRef<Matrix>([]);
  const [matrixVersion, setMatrixVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<CellView | null>(null);
  const [remoteSelections, setRemoteSelections] = useState<
    Map<string, RemoteUserSelection>
  >(new Map());
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [localLockedCell, setLocalLockedCell] = useState<Position | null>(null);
  const [draftValue, setDraftValue] = useState<string | null>(null);

  // WebSocket connector callbacks
  const handleInitialData = useCallback(
    (
      cells: Cell[],
      activeUsers: ActiveUser[],
      selections: UserSelection[],
      locks: { row: number; col: number; lockedBy: string }[]
    ) => {
      debug.provider.log("Initial data from Redis", {
        cells: cells.length,
        activeUsers: activeUsers.length,
        selections: selections.length,
        locks: locks.length,
      });

      matrixRef.current = createMatrixFromCells(cells);

      locks.forEach(({ row, col, lockedBy }) => {
        if (matrixRef.current[col] && matrixRef.current[col][row]) {
          matrixRef.current[col][row].lockedBy = lockedBy;
        }
      });

      setActiveUsers(activeUsers);

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
      setIsLoading(false);
    },
    []
  );

  const handleCellUpdate = useCallback(
    (row: number, col: number, value: string) => {
      debug.provider.log("Remote cell update", { row, col, value });
      matrixRef.current[col][row].value = value;
      setMatrixVersion((v) => v + 1);
    },
    []
  );

  const handleUserJoined = useCallback((userId: string, userName: string) => {
    debug.provider.log("User joined", { userId, userName });
    setActiveUsers((prev) => {
      if (prev.some((u) => u.id === userId)) return prev;
      return [...prev, { id: userId, name: userName }];
    });
  }, []);

  const handleUserLeft = useCallback((userId: string) => {
    debug.provider.log("User left", { userId });
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
      debug.provider.log("Remote selection", { userName, row, col });
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
      cell.lockedBy = "remote";
      setMatrixVersion((v) => v + 1);
    }
  }, []);

  const handleCellUnlocked = useCallback((pos: Position) => {
    if (pos.row === undefined || pos.col === undefined) return;
    const cell = matrixRef.current[pos.col][pos.row];
    if (cell) {
      delete cell.lockedBy;
      setMatrixVersion((v) => v + 1);
    }
  }, []);

  // WebSocket connector
  const { wsActions, isConnected } = useSpreadsheetConnector({
    spreadsheetId,
    onInitialData: handleInitialData,
    onCellUpdate: handleCellUpdate,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onUserSelection: handleUserSelection,
    onCellLocked: handleCellLocked,
    onCellUnlocked: handleCellUnlocked,
  });

  // Get userId once at provider level
  const userId = sessionStorage.getItem("userId") || "";

  // Command dispatcher
  const { dispatch } = useDispatcher({
    matrixRef,
    wsActions,
    userId,
    state: {
      selectedCell,
      localLockedCell,
      draftValue,
    },
    setters: {
      setSelectedCell,
      setLocalLockedCell,
      setDraftValue,
      setMatrixVersion,
    },
  });

  const value: SpreadsheetContextValue = {
    matrix: matrixRef.current,
    matrixVersion,
    spreadsheetId,
    selectedCell,
    localLockedCell,
    remoteSelections,
    activeUsers,
    isConnected,
    draftValue,
    dispatch,
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: 18,
          color: "#666",
        }}
      >
        Loading spreadsheet data...
      </Box>
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
