import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n

// Load React Scan in debug mode (before React mounts)
if (import.meta.env.VITE_DEBUG === "true") {
  const script = document.createElement("script");
  script.src = "https://unpkg.com/react-scan/dist/auto.global.js";
  document.head.appendChild(script);
}

createRoot(document.getElementById("root")!).render(<App />);
