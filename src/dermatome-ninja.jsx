import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "./recall-drill/recall-drill.css";
import "./dermatome-ninja/dermatome-ninja.css";
import DermatomeNinja from "./dermatome-ninja/DermatomeNinja.jsx";

createRoot(document.getElementById("root")).render(<DermatomeNinja />);
