import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "./recall-drill/recall-drill.css";
import LegalPage from "./components/LegalPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LegalPage title="Privacy">
      <p>
        MedPunk works without an account. If you sign in with Google, the only
        information we store from Google is your name, email address and profile
        picture. We never see your Google password.
      </p>
      <p>
        The only things linked to your account are your drill progress (scores,
        items found, ignored items and stars) and your account preferences, such
        as your username. Your email address is not shown to other users. We
        don't sell or share your information, and we use no analytics or
        advertising cookies; signing in sets a single session cookie so you stay
        logged in.
      </p>
      <p>
        Your data is stored in a database on Cloudflare. To have your account
        and everything linked to it deleted, contact the site owner.
      </p>
    </LegalPage>
  </StrictMode>,
);
