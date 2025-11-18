// Runtime configuration - injected at container startup for 12-factor compliance
// __VITE_API_URL__ is a placeholder replaced by docker-entrypoint.sh

const envUrl = import.meta.env.VITE_API_URL;
const runtimeUrl = "__VITE_API_URL__";
const API_URL =
  envUrl ||
  (runtimeUrl.startsWith("__") ? "http://localhost:4000" : runtimeUrl);

export const config = {
  apiUrl: API_URL.replace(/\/$/, ""), // Remove trailing slash
  wsUrl: API_URL.replace(/^http/, "ws"), // Convert http(s) to ws(s)
} as const;
