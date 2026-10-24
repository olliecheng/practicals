// Page shell of the legal pages (/privacy, /tos): a heading, a link home and a few paragraphs in a panel
export default function LegalPage({ title, children }) {
  return (
    <div className="wrap">
      <header>
        <h1>{title}</h1>
        <a className="link" href="/">
          ← MedPunk
        </a>
      </header>
      <div className="panel legal">{children}</div>
    </div>
  );
}
