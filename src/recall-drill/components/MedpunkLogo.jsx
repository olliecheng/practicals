import { useEffect, useRef, useState } from "react";
import logo from "../assets/medpunk-logo.svg?raw";

// Inserting the <svg> is what starts its animation, so it is added after the first paint, when the page is up.
// Layout stays mounted across navigation and the markup never changes, so the animation plays once per page
// load and then rests on its final frame.
// Safari pauses SMIL at time 0 when Reduce Motion is on, and the logo's base state is hidden, so it would never
// appear: unpause the timeline so the animation plays there too.
export default function MedpunkLogo() {
  const [ready, setReady] = useState(false);
  const box = useRef(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!ready) return;
    const svg = box.current?.querySelector("svg");
    if (svg?.animationsPaused?.()) svg.unpauseAnimations();
  }, [ready]);
  return (
    <span
      ref={box}
      className="mp-logo"
      dangerouslySetInnerHTML={ready ? { __html: logo } : undefined}
    />
  );
}
