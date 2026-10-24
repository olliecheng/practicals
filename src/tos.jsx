import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/hanken-grotesk";
import "./recall-drill/recall-drill.css";
import LegalPage from "./components/LegalPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LegalPage title="Terms of service">
      <p>
        MedPunk is a free study aid, provided as is, with no guarantee that its
        content is accurate, complete or up to date. It is not medical advice
        and must not be used to make decisions about patient care.
      </p>
      <p>
        Signing in is optional. Quizzes and playlists are shared, so anything
        you add or edit is visible to every user. Please use the site fairly:
        don't disrupt it or try to access anyone else's account. Accounts may be
        removed for abuse, and the site may change or close at any time.
      </p>
    </LegalPage>
  </StrictMode>,
);
