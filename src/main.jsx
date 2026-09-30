import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./AppRoot";
import { applyTextSize, readTextSize } from "./state/textSize";

// Apply the saved text size before the first paint, so the page never
// renders at one size and then jumps to another.
applyTextSize(readTextSize());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
