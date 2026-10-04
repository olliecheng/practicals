export function confetti() {
  const w = window.innerWidth,
    cols = ["--teal", "--amber", "--ok", "--miss", "--bad"];
  for (let i = 0; i < 200; i++) {
    const c = document.createElement("i");
    c.className = "cf";
    c.style.cssText = `left:${Math.random() * w}px;background:var(${cols[i % cols.length]});--dx:${Math.random() * 160 - 80}px;--r:${Math.random() * 720 - 360}deg;animation-duration:${1.5 + Math.random() * 1.1}s;animation-delay:${Math.random() * 0.6}s`;
    document.body.appendChild(c);
    c.addEventListener("animationend", () => c.remove());
  }
}
