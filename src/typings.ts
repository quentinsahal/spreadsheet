export type Coords = {
  x: number;
  y: number;
};

export type Position = {
  col: number;
  row: number;
};

// Base cell type - minimal data representation
export type Cell = Position & {
  value: string;
};

// Active user representation
export type ActiveUser = {
  id: string;
  name: string;
};

// Remote user selection with visual indicator
export type UserSelection = Position & {
  userId: string;
  userName: string;
  color: string;
};

// View layer - Cell with rendering properties for UI
export type CellView = Coords &
  Position & {
    width: number;
    height: number;
    value?: string | number;
    name: string;
  };

export type Matrix = (number | string)[][];

export enum Direction {
  Up = "Up",
  Down = "Down",
  Left = "Left",
  Right = "Right",
}

export interface WebSocketMessage {
  type:
    | "initialData"
    | "cellUpdated"
    | "cellFocused"
    | "cellSelected"
    | "userJoined"
    | "userLeft"
    | "pong";
  cells?: Cell[];
  activeUsers?: ActiveUser[];
  selections?: UserSelection[];
  row?: number;
  col?: number;
  value?: string;
  userId?: string;
  userName?: string;
  color?: string;
}

export interface RemoteUserSelection {
  userName: string;
  row: number;
  col: number;
  color: string;
}
