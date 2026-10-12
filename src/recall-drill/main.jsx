import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import { BrowserRouter } from "react-router-dom";
import "./recall-drill.css";
import App from "./App";

// iOS Safari ignores user-scalable=no; its pinch gesture events must be cancelled to keep the app from zooming
for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(type, (e) => e.preventDefault(), {
    passive: false,
  });
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/recall-drill">
    <App />
  </BrowserRouter>,
);
