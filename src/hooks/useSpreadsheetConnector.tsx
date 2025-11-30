import { useCallback, useEffect } from "react";
import { useSocket } from "../providers/SocketProvider";
import type {
  WebSocketMessage,
  Cell,
  ActiveUser,
  UserSelection,
  Position,
} from "../typings";
import { debug } from "../lib/debug";

interface UseSpreadsheetConnectorOptions {
  spreadsheetId: string;
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
  onInitialData,
  onCellUpdate,
  onUserJoined,
  onUserLeft,
  onUserSelection,
  onCellLocked,
  onCellUnlocked,
}: UseSpreadsheetConnectorOptions) {
  const { sendMessage, subscribe, isConnected, error } = useSocket();

  // Join spreadsheet room when connected
  useEffect(() => {
    if (!isConnected) return;

    const userName = sessionStorage.getItem("userName") || "Anonymous";
    const userId = sessionStorage.getItem("userId") || crypto.randomUUID();

    if (!sessionStorage.getItem("userId")) {
      sessionStorage.setItem("userId", userId);
    }

    debug.ws.log("Joining spreadsheet", spreadsheetId);
    sendMessage({
      type: "join",
      spreadsheetId,
      userId,
      userName,
    });
  }, [isConnected, spreadsheetId, sendMessage]);

  // Leave room on spreadsheetId change or unmount (separate from connection state)
  useEffect(() => {
    const userId = sessionStorage.getItem("userId");

    return () => {
      if (!userId) return;
      debug.ws.log("Leaving spreadsheet", spreadsheetId);
      sendMessage({
        type: "leave",
        spreadsheetId,
        userId,
      });
    };
  }, [spreadsheetId, sendMessage]);

  // Subscribe to messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case "initialData":
            debug.ws.log("Initial data received", {
              cells: message.cells?.length,
              users: message.activeUsers?.length,
            });
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
            break;
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    return subscribe(handleMessage);
  }, [
    subscribe,
    onInitialData,
    onCellUpdate,
    onUserJoined,
    onUserLeft,
    onUserSelection,
    onCellLocked,
    onCellUnlocked,
  ]);

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
