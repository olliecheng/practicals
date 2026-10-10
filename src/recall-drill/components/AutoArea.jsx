import { useEffect, useLayoutEffect, useRef } from "react";

// A text box that is as tall as its text, so long values wrap instead of being cut off. Line breaks become spaces.
// fitKey: change it when the box's styling changes (e.g. a card opening), so the height is measured again
export default function AutoArea({ value, onChange, fitKey, ...rest }) {
  const ref = useRef(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height =
      el.scrollHeight + (el.offsetHeight - el.clientHeight) + "px";
  };
  useLayoutEffect(fit, [value, fitKey]);
  // The text wraps differently once the mono font has loaded or the card changes width, so fit again then
  useEffect(() => {
    let width = ref.current.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (ref.current.offsetWidth !== width) {
        width = ref.current.offsetWidth;
        fit();
      }
    });
    ro.observe(ref.current);
    document.fonts?.ready.then(fit);
    document.fonts?.addEventListener("loadingdone", fit);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, []);
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
    />
  );
}
