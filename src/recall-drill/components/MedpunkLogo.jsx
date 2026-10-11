import { useEffect, useState } from "react";
import logo from "../assets/medpunk-logo.svg?raw";

// Inserting the <svg> is what starts its animation, so it is added after the first paint, when the page is up.
// Layout stays mounted across navigation and the markup never changes, so the animation plays once per page
// load and then rests on its final frame.
export default function MedpunkLogo() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <span
      className="mp-logo"
      dangerouslySetInnerHTML={ready ? { __html: logo } : undefined}
    />
  );
}
