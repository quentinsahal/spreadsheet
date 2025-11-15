import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createMatrix } from "./helpers";
import type { ICell, Matrix } from "../../typings";

interface SpreadsheetContextValue {
  matrix: Matrix;
  selectedCell: ICell | null;
  lastSelectedCell: ICell | null;
  updateSelectedCell: (cell: ICell) => void;
  updateCellContent: (
    coords: Pick<ICell, "row" | "col">,
    value: string | number
  ) => void;
}

interface SpreadsheetProviderProps {
  children: ReactNode;
  onCellUpdate?: (row: number, col: number, value: string) => void;
  onCellFocus?: (row: number, col: number) => void;
  onCellSelect?: (cell: ICell) => void;
}

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null);

export function SpreadsheetProvider({
  children,
  onCellUpdate,
  onCellFocus,
  onCellSelect,
}: SpreadsheetProviderProps) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const matrixRef = useRef<Matrix>(createMatrix(100, 26));
  const [lastSelectedCell, setLastSelectedCell] = useState<ICell | null>(null);
  const [selectedCell, setSelectedCell] = useState<ICell | null>(null);

  const updateCellContent = (
    coords: Pick<ICell, "row" | "col">,
    value: string | number
  ) => {
    matrixRef.current[coords.col][coords.row] = value;
    setLastSelectedCell(selectedCell);
    setSelectedCell((prev) => ({ ...prev, value } as ICell));
    forceUpdate();

    // Notify callback
    onCellUpdate?.(coords.row, coords.col, value.toString());
  };

  const updateSelectedCell = (cell: ICell): void => {
    setSelectedCell(cell);

    // Notify callbacks
    onCellSelect?.(cell);
    onCellFocus?.(cell.row, cell.col);
  };

  const value: SpreadsheetContextValue = {
    matrix: matrixRef.current,
    selectedCell,
    lastSelectedCell,
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
