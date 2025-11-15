import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSocketOptions {
  url: string;
  onOpen?: (ws: WebSocket) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnect?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  onOpen,
  onMessage,
  onError,
  onClose,
  onReconnect,
  autoReconnect = false,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    // Create WebSocket connection
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
      onOpen?.(ws);
    };

    ws.onmessage = (event) => {
      onMessage?.(event);
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("WebSocket connection error");
      onError?.(event);
    };

    ws.onclose = (event) => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      onClose?.(event);

      // Auto-reconnect if enabled
      if (autoReconnect && shouldReconnectRef.current) {
        console.log(`Reconnecting in ${reconnectInterval}ms...`);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          onReconnect?.();
          connect();
        }, reconnectInterval);
      }
    };
  }, [
    url,
    onOpen,
    onMessage,
    onError,
    onClose,
    autoReconnect,
    reconnectInterval,
    onReconnect,
  ]);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Send message to server
  const sendMessage = (message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    error,
    sendMessage,
  };
}
