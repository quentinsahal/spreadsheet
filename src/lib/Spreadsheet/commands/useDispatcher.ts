import { useCallback, useRef } from "react";
import type { Matrix, CellView, Position } from "../../../typings";
import type {
  SpreadsheetAction,
  HistoryCommand,
  CellUpdateCommand,
} from "./commands.types";
import { debug } from "../../debug";

const MAX_HISTORY_SIZE = 50;

type WsActions = {
  updateCell: (row: number, col: number, value: string) => void;
  selectCell: (row: number, col: number) => void;
  lockCell: (pos: Position, userId: string) => void;
  unlockCell: (pos: Position, userId: string) => void;
};

type StateSetters = {
  setSelectedCell: React.Dispatch<React.SetStateAction<CellView | null>>;
  setLocalLockedCell: React.Dispatch<React.SetStateAction<Position | null>>;
  setDraftValue: React.Dispatch<React.SetStateAction<string | null>>;
  setMatrixVersion: React.Dispatch<React.SetStateAction<number>>;
};

type UseDispatcherOptions = {
  matrixRef: React.RefObject<Matrix>;
  wsActions: WsActions;
  userId: string;
  state: {
    selectedCell: CellView | null;
    localLockedCell: Position | null;
    draftValue: string | null;
  };
  setters: StateSetters;
};

function createCellUpdateCommand(
  col: number,
  row: number,
  oldValue: string,
  newValue: string
): CellUpdateCommand {
  return { type: "cell_update", col, row, oldValue, newValue };
}

export function useDispatcher({
  matrixRef,
  wsActions,
  userId,
  state,
  setters,
}: UseDispatcherOptions) {
  const undoStackRef = useRef<HistoryCommand[]>([]);
  const redoStackRef = useRef<HistoryCommand[]>([]);

  const pushToHistory = useCallback((cmd: HistoryCommand) => {
    undoStackRef.current.push(cmd);
    if (undoStackRef.current.length > MAX_HISTORY_SIZE) {
      undoStackRef.current.shift();
    }
    // Clear redo stack on new action
    redoStackRef.current = [];
  }, []);

  const dispatch = useCallback(
    (action: SpreadsheetAction) => {
      debug.provider.log("Dispatch", action.type, action);

      switch (action.type) {
        case "SELECT_CELL": {
          const prevCell = state.selectedCell;
          // Only push to history if there was a previous selection and it's different
          if (
            prevCell &&
            (prevCell.row !== action.cell.row ||
              prevCell.col !== action.cell.col)
          ) {
            pushToHistory({
              type: "selection",
              prevCell,
              newCell: action.cell,
            });
          }
          setters.setSelectedCell(action.cell);
          wsActions.selectCell(action.cell.row, action.cell.col);
          break;
        }

        case "LOCK_CELL": {
          const { pos } = action;

          // Release previous lock if any
          if (state.localLockedCell) {
            debug.provider.log(
              "Releasing previous lock",
              state.localLockedCell
            );
            wsActions.unlockCell(state.localLockedCell, userId);
          }

          debug.provider.log("Locking cell", pos);
          wsActions.lockCell(pos, userId);
          setters.setLocalLockedCell(pos);

          // Initialize draft with current cell value
          const currentValue =
            matrixRef.current[pos.col]?.[pos.row]?.value ?? "";
          setters.setDraftValue(currentValue.toString());
          break;
        }

        case "UNLOCK_CELL": {
          debug.provider.log("Unlocking cell", action.pos);
          wsActions.unlockCell(action.pos, userId);
          setters.setLocalLockedCell(null);
          break;
        }

        case "SET_DRAFT_VALUE": {
          setters.setDraftValue(action.value);
          break;
        }

        case "COMMIT_CELL": {
          const { selectedCell, draftValue } = state;
          if (selectedCell && draftValue !== null) {
            // Read old value from matrix (source of truth)
            const oldValue =
              matrixRef.current[selectedCell.col]?.[
                selectedCell.row
              ]?.value?.toString() ?? "";
            const newValue = draftValue;

            debug.provider.log("Committing cell content", {
              cell: selectedCell,
              oldValue,
              newValue,
            });

            // Only push to history if value actually changed
            if (oldValue !== newValue) {
              const cmd = createCellUpdateCommand(
                selectedCell.col,
                selectedCell.row,
                oldValue,
                newValue
              );
              pushToHistory(cmd);
            }

            // Update matrix
            matrixRef.current[selectedCell.col][selectedCell.row].value =
              newValue;

            // Send to server
            wsActions.updateCell(selectedCell.row, selectedCell.col, newValue);

            // Update selected cell value
            setters.setSelectedCell((prev) =>
              prev ? { ...prev, value: newValue } : null
            );
            setters.setMatrixVersion((v) => v + 1);
          }

          // Clear draft
          setters.setDraftValue(null);
          break;
        }

        case "DISCARD_DRAFT": {
          setters.setDraftValue(null);
          break;
        }

        case "UNDO": {
          const cmd = undoStackRef.current.pop();
          if (!cmd) return;

          debug.provider.log("Undo", cmd);

          // Push to redo stack
          redoStackRef.current.push(cmd);

          if (cmd.type === "cell_update") {
            // Apply inverse (restore old value)
            matrixRef.current[cmd.col][cmd.row].value = cmd.oldValue;
            setters.setMatrixVersion((v) => v + 1);
            wsActions.updateCell(cmd.row, cmd.col, cmd.oldValue);
          } else if (cmd.type === "selection") {
            // Restore previous selection
            setters.setSelectedCell(cmd.prevCell);
            wsActions.selectCell(cmd.prevCell.row, cmd.prevCell.col);
          }
          break;
        }

        case "REDO": {
          const cmd = redoStackRef.current.pop();
          if (!cmd) return;

          debug.provider.log("Redo", cmd);

          // Push back to undo stack
          undoStackRef.current.push(cmd);

          if (cmd.type === "cell_update") {
            // Re-apply (restore new value)
            matrixRef.current[cmd.col][cmd.row].value = cmd.newValue;
            setters.setMatrixVersion((v) => v + 1);
            wsActions.updateCell(cmd.row, cmd.col, cmd.newValue);
          } else if (cmd.type === "selection") {
            // Restore new selection
            setters.setSelectedCell(cmd.newCell);
            wsActions.selectCell(cmd.newCell.row, cmd.newCell.col);
          }
          break;
        }
      }
    },
    [matrixRef, wsActions, userId, state, setters, pushToHistory]
  );

  return { dispatch };
}
