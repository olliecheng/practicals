import { useLayoutEffect, useRef, useState } from "react";

// The tab slider (`.segmented` in recall-drill.css): a tablist whose raised "thumb" slides to the selected tab.
//   tabs      [[key, text], ...]
//   value     the selected key
//   onChange  called with the key of the tab clicked
//   label     the tablist's aria-label (optional)
// The thumb is measured from the selected button, so tabs of any width work; it is not drawn until measured, and it only
// animates after that, so the first paint doesn't slide in from the left. It slides whatever the reduced-motion setting is.
export default function Segmented({ tabs, value, onChange, label }) {
  const track = useRef(null);
  const [thumb, setThumb] = useState(null); // {left, width}
  const [slide, setSlide] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const on = track.current?.querySelector('[aria-selected="true"]');
      if (on) setThumb({ left: on.offsetLeft, width: on.offsetWidth });
    };
    measure();
    // Fonts loading or a resize change the tab widths
    const watch = new ResizeObserver(measure);
    watch.observe(track.current);
    return () => watch.disconnect();
  }, [value, tabs.length]);

  // Turn the transition on once the first position has been painted
  useLayoutEffect(() => {
    if (thumb && !slide) {
      const frame = requestAnimationFrame(() => setSlide(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [thumb, slide]);

  return (
    <div className="segmented" role="tablist" aria-label={label} ref={track}>
      {thumb && (
        <span
          className={"seg-thumb" + (slide ? " slide" : "")}
          aria-hidden="true"
          style={{
            width: thumb.width,
            transform: `translateX(${thumb.left}px)`,
          }}
        />
      )}
      {tabs.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
