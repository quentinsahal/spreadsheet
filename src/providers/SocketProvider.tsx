import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { debug } from "../lib/debug";
import { config } from "../config";

interface SocketContextValue {
  sendMessage: (message: unknown) => void;
  subscribe: (handler: (event: MessageEvent) => void) => () => void;
  isConnected: boolean;
  error: string | null;
}

interface SocketProviderProps {
  children: ReactNode;
  url?: string;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({
  children,
  url = config.wsUrl,
}: SocketProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscribersRef = useRef<Set<(event: MessageEvent) => void>>(new Set());
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      debug.ws.log("Connected");
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      subscribersRef.current.forEach((handler) => handler(event));
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("WebSocket connection error");
    };

    ws.onclose = () => {
      debug.ws.log("Disconnected");
      setIsConnected(false);

      if (shouldReconnectRef.current) {
        debug.ws.log("Reconnecting in 3000ms");
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      }
    };
  }, [url]);

  useEffect(() => {
    connect();

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

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((handler: (event: MessageEvent) => void) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  const value: SocketContextValue = {
    sendMessage,
    subscribe,
    isConnected,
    error,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}
