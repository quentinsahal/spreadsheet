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
} from "../../typings";
import { useSpreadsheetConnector } from "../../hooks/useSpreadsheetConnector";
import { createMatrixFromCells } from "./helpers";

interface SpreadsheetContextValue {
  matrix: Matrix;
  matrixVersion: number;
  spreadsheetId: string | undefined;
  selectedCell: CellView | null;
  lastSelectedCell: CellView | null;
  remoteSelections: Map<string, RemoteUserSelection>;
  activeUsers: ActiveUser[];
  isConnected: boolean;
  updateSelectedCell: (cell: CellView) => void;
  updateCellContent: (
    coords: Pick<CellView, "row" | "col">,
    value: string | number
  ) => void;
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
  wsUrl = "ws://localhost:4000",
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

  // WebSocket connector callbacks
  const handleInitialData = useCallback(
    (cells: Cell[], activeUsers: ActiveUser[], selections: UserSelection[]) => {
      console.log("Loading initial data from Redis:", {
        cells,
        activeUsers,
        selections,
      });

      // Initialize matrix from Redis cells - always create proper matrix
      matrixRef.current = createMatrixFromCells(cells);

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
      matrixRef.current[col][row] = value;
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

  // Integrate WebSocket connector
  const { updateCell, selectCell, isConnected } = useSpreadsheetConnector({
    spreadsheetId: spreadsheetId ?? "",
    url: wsUrl,
    onInitialData: handleInitialData,
    onCellUpdate: handleCellUpdate,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onUserSelection: handleUserSelection,
  });

  const updateCellContent = (
    coords: Pick<CellView, "row" | "col">,
    value: string | number
  ) => {
    matrixRef.current[coords.col][coords.row] = value;
    setLastSelectedCell(selectedCell);
    // Send WebSocket update
    updateCell(coords.row, coords.col, value.toString());
    setSelectedCell((prev) => ({ ...prev, value } as CellView));
    setMatrixVersion((v) => v + 1);
    forceUpdate();
  };

  const updateSelectedCell = (cell: CellView): void => {
    setSelectedCell(cell);
    // Send selection to WebSocket
    selectCell(cell.row, cell.col);
  };

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
