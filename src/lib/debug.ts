const DEBUG = import.meta.env.VITE_DEBUG === "true";

type LogLevel = "log" | "warn" | "error";

const createLogger = (namespace: string) => {
  const log = (level: LogLevel, ...args: unknown[]) => {
    if (DEBUG || level === "error") {
      console[level](`[${namespace}]`, ...args);
    }
  };

  return {
    log: (...args: unknown[]) => log("log", ...args),
    warn: (...args: unknown[]) => log("warn", ...args),
    error: (...args: unknown[]) => log("error", ...args), // Always log errors
  };
};

export const debug = {
  provider: createLogger("Provider"),
  ws: createLogger("WebSocket"),
  canvas: createLogger("Canvas"),
};
