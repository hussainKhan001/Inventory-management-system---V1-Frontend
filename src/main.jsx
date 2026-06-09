import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { wakeServer } from "./services/api.js";
import "./index.css";
wakeServer();
if (import.meta.env.PROD) {
  console.log = () => {
  };
  console.debug = () => {
  };
  console.info = () => {
  };
  console.warn = () => {
  };
}
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
