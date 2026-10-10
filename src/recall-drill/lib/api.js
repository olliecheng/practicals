// JSON over the same-origin API (cookies are sent automatically). Public reads carry an ETag, so the browser revalidates them with
// a conditional request; nothing is cached by hand here.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => null);
    throw new ApiError(r.status, j?.error || "status " + r.status);
  }
  return r.json();
}
