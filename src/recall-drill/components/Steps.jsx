import { cap } from "../lib/data";

// Group a section's item indexes by consecutive category: [[cat, [i...]]]
export const groups = (drill, idx) =>
  idx.reduce((out, i) => {
    const cat = drill.items[i].cat,
      last = out[out.length - 1];
    if (last && last[0] === cat) last[1].push(i);
    else out.push([cat, [i]]);
    return out;
  }, []);

// Every item of a quiz face-up, grouped by section and category (the condensed view the drill shows after Reveal)
export default function StepsView({ drill }) {
  const tile = (i) => (
    <div key={i} className="tile on">
      <div className="in">
        <div className="b">{drill.items[i].label}</div>
      </div>
    </div>
  );
  return drill.sections.map((sec) => {
    const idx = drill.items.flatMap((it, i) =>
      it.section === sec.name ? [i] : [],
    );
    return (
      <section className="sect" key={sec.name}>
        <h3 className="sh">
          <span className="nm">
            {sec.icon && (
              <span
                className="ic"
                aria-hidden="true"
                style={{ "--ic": `url("${sec.icon}")` }}
              />
            )}
            {cap(sec.name)}
          </span>
          <span className="sc">{idx.length}</span>
        </h3>
        {groups(drill, idx).some(([cat]) => cat) ? (
          <div className="cats">
            {groups(drill, idx).map(([cat, list]) => (
              <fieldset className="cat" key={cat || ""}>
                {cat && <legend>{cat}</legend>}
                <div className="board">{list.map(tile)}</div>
              </fieldset>
            ))}
          </div>
        ) : (
          <div className="board">{idx.map(tile)}</div>
        )}
      </section>
    );
  });
}
