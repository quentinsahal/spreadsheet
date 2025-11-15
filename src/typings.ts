export type ICell = Coords &
  Position & {
    width: number;
    height: number;
    value?: string | number;
    name: string;
  };

export type Matrix = (number | string)[][];

export type Coords = {
  x: number;
  y: number;
};

export type Position = {
  col: number;
  row: number;
};

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
    | "userJoined"
    | "userLeft"
    | "pong";
  cells?: Array<{ row: number; col: number; value: string }>;
  row?: number;
  col?: number;
  value?: string;
  userId?: string;
  userName?: string;
}

export type WebSocketMessageType = WebSocketMessage["type"];
