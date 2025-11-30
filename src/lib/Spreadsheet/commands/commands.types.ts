import type { CellView, Position } from "../../../typings";

// ============================================
// Action Types (user intents)
// ============================================

export type SelectCellAction = {
  type: "SELECT_CELL";
  cell: CellView;
};

export type LockCellAction = {
  type: "LOCK_CELL";
  pos: Position;
};

export type UnlockCellAction = {
  type: "UNLOCK_CELL";
  pos: Position;
};

export type SetDraftValueAction = {
  type: "SET_DRAFT_VALUE";
  value: string;
};

export type CommitCellAction = {
  type: "COMMIT_CELL";
};

export type DiscardDraftAction = {
  type: "DISCARD_DRAFT";
};

export type UndoAction = {
  type: "UNDO";
};

export type RedoAction = {
  type: "REDO";
};

export type SpreadsheetAction =
  | SelectCellAction
  | LockCellAction
  | UnlockCellAction
  | SetDraftValueAction
  | CommitCellAction
  | DiscardDraftAction
  | UndoAction
  | RedoAction;

// ============================================
// History Command Types (for undo/redo stack)
// ============================================

export type CellUpdateCommand = {
  type: "cell_update";
  col: number;
  row: number;
  oldValue: string;
  newValue: string;
};

export type SelectionCommand = {
  type: "selection";
  prevCell: CellView;
  newCell: CellView;
};

export type HistoryCommand = CellUpdateCommand | SelectionCommand;
