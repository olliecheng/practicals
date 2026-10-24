// Standalone minigames and case quizzes, separate from the drills (each is its own page, see vite.config.js); `icon` is an optional picture shown to the left of the text
const MINIS = [
  {
    href: "/mini/dermatome-ninja",
    icon: "/dermatome.jpg",
    title: "Dermatome Ninja",
    blurb: "Learn the dermatomes: locate a region or name a point.",
  },
  {
    href: "/mini/dexamethasone",
    icon: "/cushing.jpg",
    title: "Dexamethasone Suppression",
    blurb:
      "Cushing's syndrome diagnosis using low and high dose dexamethasone suppression tests.",
  },
  {
    href: "/mini/parathyroid",
    icon: "/parathyroid.jpg",
    title: "Parathyroid Function",
    blurb:
      "Interpret calcium, PTH and phosphate to diagnose parathyroid disorders.",
  },
  {
    href: "/mini/hepatitis-b",
    icon: "/hep_b.jpg",
    title: "Hepatitis B Serology",
    blurb: "Interpret HBsAg, anti-HBc and anti-HBs patterns.",
  },
  {
    href: "/mini/liver-function",
    icon: "/liver.jpg",
    title: "Liver Function Tests",
    blurb: "Recognise hepatocellular, cholestatic and other LFT patterns.",
  },
  {
    href: "/mini/bacteria",
    icon: "/bacteria.jpg",
    title: "Bacterial Identification",
    blurb: "Identify bacterial species from lab tests.",
  },
];

export default function Minis() {
  return (
    <div className="condlist">
      {MINIS.map((m) => (
        <a key={m.href} className="mini" href={m.href}>
          {m.icon && <img className="mini-icon" src={m.icon} alt="" />}
          <div className="mini-text">
            <b>{m.title}</b>
            <span>{m.blurb}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
