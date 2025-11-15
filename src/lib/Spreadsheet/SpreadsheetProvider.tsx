import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type {
  ICell,
  Matrix,
  RemoteUpdate,
  RemoteUserSelection,
} from "../../typings";

interface SpreadsheetContextValue {
  matrix: Matrix;
  matrixVersion: number;
  spreadsheetId: string | undefined;
  selectedCell: ICell | null;
  lastSelectedCell: ICell | null;
  remoteSelections: Map<string, RemoteUserSelection>;
  updateSelectedCell: (cell: ICell) => void;
  updateCellContent: (
    coords: Pick<ICell, "row" | "col">,
    value: string | number
  ) => void;
}

interface SpreadsheetProviderProps {
  children: ReactNode;
  initialMatrix: Matrix;
  spreadsheetId?: string;
  remoteUpdate?: RemoteUpdate | null;
  onCellUpdate?: (row: number, col: number, value: string) => void;
  onCellFocus?: (row: number, col: number) => void;
  onCellSelect?: (cell: ICell) => void;
  onCellClick?: (row: number, col: number) => void;
}

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null);

export function SpreadsheetProvider({
  children,
  initialMatrix,
  spreadsheetId,
  remoteUpdate,
  onCellUpdate,
  onCellFocus,
  onCellSelect,
  onCellClick,
}: SpreadsheetProviderProps) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const matrixRef = useRef<Matrix>(initialMatrix);
  const [matrixVersion, setMatrixVersion] = useState(0);
  const [lastSelectedCell, setLastSelectedCell] = useState<ICell | null>(null);
  const [selectedCell, setSelectedCell] = useState<ICell | null>(null);
  const [remoteSelections, setRemoteSelections] = useState<
    Map<string, RemoteUserSelection>
  >(new Map());

  // Handle all types of remote updates
  useEffect(() => {
    if (!remoteUpdate) return;

    switch (remoteUpdate.type) {
      case "cellUpdate":
        console.log("Applying remote cell updates:", remoteUpdate.updates);
        remoteUpdate.updates.forEach(({ row, col, value }) => {
          matrixRef.current[col][row] = value;
        });
        setMatrixVersion((v) => v + 1);
        forceUpdate();
        break;

      case "userSelection":
        console.log(
          "Remote user selection:",
          remoteUpdate.userName,
          remoteUpdate.row,
          remoteUpdate.col
        );
        setRemoteSelections((prev) => {
          const next = new Map(prev);
          next.set(remoteUpdate.userId, {
            userName: remoteUpdate.userName,
            row: remoteUpdate.row,
            col: remoteUpdate.col,
            color: remoteUpdate.color,
          });
          return next;
        });
        break;

      case "userLeft":
        console.log("User left:", remoteUpdate.userId);
        setRemoteSelections((prev) => {
          const next = new Map(prev);
          next.delete(remoteUpdate.userId);
          return next;
        });
        break;
    }
  }, [remoteUpdate]);

  const updateCellContent = (
    coords: Pick<ICell, "row" | "col">,
    value: string | number
  ) => {
    matrixRef.current[coords.col][coords.row] = value;
    setLastSelectedCell(selectedCell);
    // Notify callback to send WebSocket update
    onCellUpdate?.(coords.row, coords.col, value.toString());
    setSelectedCell((prev) => ({ ...prev, value } as ICell));
    setMatrixVersion((v) => v + 1); // Increment version
    forceUpdate();
  };

  const updateSelectedCell = (cell: ICell): void => {
    setSelectedCell(cell);

    // Notify callbacks
    onCellSelect?.(cell);
    onCellFocus?.(cell.row, cell.col);
    onCellClick?.(cell.row, cell.col); // Notify parent about cell click for WebSocket
  };

  const value: SpreadsheetContextValue = {
    matrix: matrixRef.current,
    matrixVersion,
    spreadsheetId,
    selectedCell,
    lastSelectedCell,
    remoteSelections,
    updateSelectedCell,
    updateCellContent,
  };

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
