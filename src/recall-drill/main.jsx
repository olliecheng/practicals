import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./recall-drill.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/recall-drill">
    <App />
  </BrowserRouter>,
);
