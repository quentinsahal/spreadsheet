import { useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import type {
  WebSocketMessage,
  Cell,
  ActiveUser,
  UserSelection,
  Position,
} from "../typings";
import { config } from "../config";
import { debug } from "../lib/debug";

interface UseSpreadsheetConnectorOptions {
  spreadsheetId: string;
  url?: string;
  onInitialData?: (
    cells: Cell[],
    activeUsers: ActiveUser[],
    selections: UserSelection[],
    locks: { row: number; col: number; lockedBy: string }[]
  ) => void;
  onCellUpdate?: (row: number, col: number, value: string) => void;
  onUserJoined?: (userId: string, userName: string) => void;
  onUserLeft?: (userId: string) => void;
  onCellLocked?: (pos: Position, userId: string) => void;
  onCellUnlocked?: (pos: Position, userId: string) => void;
  onUserSelection?: (
    userId: string,
    userName: string,
    row: number,
    col: number,
    color: string
  ) => void;
}

export function useSpreadsheetConnector({
  spreadsheetId,
  url = config.wsUrl,
  onInitialData,
  onCellUpdate,
  onUserJoined,
  onUserLeft,
  onUserSelection,
  onCellLocked,
  onCellUnlocked,
}: UseSpreadsheetConnectorOptions) {
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case "initialData":
            debug.ws.log("Initial data received", {
              cells: message.cells?.length,
              users: message.activeUsers?.length,
            });

            // Pass all initial data to single callback
            onInitialData?.(
              message.cells || [],
              message.activeUsers || [],
              message.selections || [],
              message.locks || []
            );
            break;
          case "cellLocked":
            onCellLocked?.(
              { row: message.row!, col: message.col! },
              message.userId!
            );
            break;
          case "cellUnlocked":
            onCellUnlocked?.(
              { row: message.row!, col: message.col! },
              message.userId!
            );
            break;
          case "cellUpdated":
            if (message.row !== undefined && message.col !== undefined) {
              debug.ws.log("Cell updated", {
                row: message.row,
                col: message.col,
                value: message.value,
              });
              onCellUpdate?.(message.row, message.col, message.value ?? "");
            }
            break;

          case "cellSelected":
            if (
              message.userId &&
              message.userName &&
              message.row !== undefined &&
              message.col !== undefined &&
              message.color
            ) {
              debug.ws.log("Remote selection", {
                user: message.userName,
                row: message.row,
                col: message.col,
              });
              onUserSelection?.(
                message.userId,
                message.userName,
                message.row,
                message.col,
                message.color
              );
            }
            break;
          case "cellFocused":
            if (
              message.row !== undefined &&
              message.col !== undefined &&
              message.userId
            ) {
              debug.ws.log("Cell focused", {
                row: message.row,
                col: message.col,
                userId: message.userId,
              });
            }
            break;

          case "userJoined":
            if (message.userId && message.userName) {
              onUserJoined?.(message.userId, message.userName);
              debug.ws.log("User joined", message.userName);
            }
            break;

          case "userLeft":
            if (message.userId) {
              onUserLeft?.(message.userId);
              debug.ws.log("User left", message.userId);
            }
            break;
          case "pong":
            // Handle ping response if needed
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    [
      onInitialData,
      onCellUpdate,
      onUserJoined,
      onUserLeft,
      onUserSelection,
      onCellLocked,
      onCellUnlocked,
    ]
  );
  const handleOpen = useCallback(
    (ws: WebSocket) => {
      const userName = sessionStorage.getItem("userName") || "Anonymous";
      const userId = sessionStorage.getItem("userId") || crypto.randomUUID();

      // Store userId if generated
      if (!sessionStorage.getItem("userId")) {
        sessionStorage.setItem("userId", userId);
      }

      ws.send(
        JSON.stringify({
          type: "join",
          spreadsheetId,
          userId,
          userName,
        })
      );
    },
    [spreadsheetId]
  );

  const { sendMessage, isConnected, error } = useWebSocket({
    url,
    onOpen: handleOpen,
    onMessage: handleMessage,
  });

  const updateCell = useCallback(
    (row: number, col: number, value: string) => {
      sendMessage({
        type: "updateCell",
        spreadsheetId,
        row,
        col,
        value,
      });
    },
    [sendMessage, spreadsheetId]
  );

  const lockCell = useCallback(
    (pos: Position, userId: string) => {
      sendMessage({
        type: "lockCell",
        spreadsheetId,
        row: pos.row,
        col: pos.col,
        userId,
      });
    },
    [sendMessage, spreadsheetId]
  );

  const unlockCell = useCallback(
    (pos: Position, userId: string) => {
      sendMessage({
        type: "unlockCell",
        spreadsheetId,
        row: pos.row,
        col: pos.col,
        userId,
      });
    },
    [sendMessage, spreadsheetId]
  );

  const selectCell = useCallback(
    (row: number, col: number) => {
      const userName = sessionStorage.getItem("userName") || "Anonymous";
      const userId = sessionStorage.getItem("userId") || crypto.randomUUID();

      sendMessage({
        type: "selectCell",
        spreadsheetId,
        userId,
        userName,
        row,
        col,
      });
    },
    [sendMessage, spreadsheetId]
  );

  const wsActions = {
    updateCell,
    lockCell,
    unlockCell,
    selectCell,
  };

  return {
    wsActions,
    isConnected,
    error,
  };
}
