import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import { BrowserRouter } from "react-router-dom";
import "./recall-drill.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/recall-drill">
    <App />
  </BrowserRouter>,
);
