import { useEffect, useRef, useState } from "react";
import logo from "../assets/medpunk-logo.svg?raw";

// Inserting the <svg> is what starts its animation, so it is added after the first paint, when the page is up.
// Layout stays mounted across navigation and the markup never changes, so the animation plays once per page
// load and then rests on its final frame.
// The logo's base state is hidden and only the SMIL animation reveals it. Safari pauses SMIL at 0 when Reduce Motion
// is on, so in that case (or if the timeline otherwise never advances) the animation is removed and CSS
// (`svg[data-static]`) shows the final frame.
const reduceMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function makeStatic(svg) {
  svg
    .querySelectorAll("animate, animateTransform, set")
    .forEach((n) => n.remove());
  svg.setAttribute("data-static", "");
}

export default function MedpunkLogo() {
  const [ready, setReady] = useState(false);
  const box = useRef(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!ready) return;
    const svg = box.current?.querySelector("svg");
    if (!svg) return;
    if (reduceMotion()) {
      makeStatic(svg);
      return;
    }
    const t = setTimeout(() => {
      if (svg.getCurrentTime?.() === 0) makeStatic(svg);
    }, 400);
    return () => clearTimeout(t);
  }, [ready]);
  return (
    <span
      ref={box}
      className="mp-logo"
      dangerouslySetInnerHTML={ready ? { __html: logo } : undefined}
    />
  );
}
