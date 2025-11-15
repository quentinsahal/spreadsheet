import { useCallback, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import type { WebSocketMessage } from "../typings";

interface UseSpreadsheetConnectorOptions {
  spreadsheetId: string;
  url?: string;
}

export function useSpreadsheetConnector({
  spreadsheetId,
  url = "ws://localhost:4000",
}: UseSpreadsheetConnectorOptions) {
  const [activeUsers, setActiveUsers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case "initialData":
          if (message.cells) {
            console.log("Initial data received:", message.cells);
          }
          break;

        case "cellUpdated":
          if (message.row !== undefined && message.col !== undefined) {
            console.log(
              "Cell updated:",
              message.row,
              message.col,
              message.value
            );
          }
          break;

        case "cellFocused":
          if (
            message.row !== undefined &&
            message.col !== undefined &&
            message.userId
          ) {
            console.log(
              "Cell focused:",
              message.row,
              message.col,
              message.userId
            );
          }
          break;

        case "userJoined":
          if (message.userId && message.userName) {
            setActiveUsers((prev) => [
              ...prev,
              { id: message.userId!, name: message.userName! },
            ]);
            console.log("User joined:", message.userId, message.userName);
          }
          break;

        case "userLeft":
          if (message.userId) {
            setActiveUsers((prev) =>
              prev.filter((user) => user.id !== message.userId)
            );
            console.log("User left:", message.userId);
          }
          break;

        case "pong":
          // Handle ping response if needed
          break;
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }, []);

  const handleOpen = useCallback(
    (ws: WebSocket) => {
      ws.send(JSON.stringify({ type: "join", spreadsheetId }));
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

  const focusCell = useCallback(
    (row: number, col: number, userId: string) => {
      sendMessage({
        type: "focusCell",
        spreadsheetId,
        row,
        col,
        userId,
      });
    },
    [sendMessage, spreadsheetId]
  );

  return {
    updateCell,
    focusCell,
    isConnected,
    error,
    activeUsers,
  };
}
