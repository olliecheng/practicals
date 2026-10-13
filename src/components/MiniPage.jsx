// Page shell of the standalone Minis: title, a link back to the Minis list, a blurb and the content in a panel
export default function MiniPage({ title, blurb, children }) {
  return (
    <div className="wrap qz">
      <header>
        <h1>{title}</h1>
        <a className="link" href="/recall-drill/">
          ← Minis
        </a>
      </header>
      {blurb && <p className="note qz-blurb">{blurb}</p>}
      <div className="panel">{children}</div>
    </div>
  );
}
