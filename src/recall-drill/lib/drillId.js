// URL form of a drill: base64url of "<system>.<name>". Names and systems contain no "." (checked against the data),
// and the split is on the first "." anyway. The presentations file's single system, "Presentation", marks that mode.
import { byKey, dk, PRES_SYSTEM } from "./data";

const toB64url = (s) => {
  const bin = String.fromCharCode(...new TextEncoder().encode(s));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s) => {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(bin, (c) => c.charCodeAt(0)),
  );
};

export const encodeDrill = (d) => toB64url(`${d.system}.${d.name}`);

// Returns the drill, or null for a malformed string or an unknown drill
export function decodeDrill(id) {
  let text;
  try {
    text = fromB64url(id);
  } catch {
    return null;
  }
  const dot = text.indexOf(".");
  if (dot < 0) return null;
  const system = text.slice(0, dot),
    name = text.slice(dot + 1);
  return (
    byKey.get(dk(system === PRES_SYSTEM ? "pres" : "cond", system, name)) ||
    null
  );
}

export const drillPath = (d) => `/q/${encodeDrill(d)}`;
