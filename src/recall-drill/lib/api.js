// JSON over the same-origin API (cookies are sent automatically). Public reads carry an ETag, so the browser revalidates them with
// a conditional request; nothing is cached by hand here.
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors; // a list of problems, when the server sent one (quiz validation)
  }
}

// The server answers 403 "editor_only" when a signed-in user who isn't an approved editor tries to change shared content.
// AccessDeniedListener (components/RequireEditor.jsx) registers a handler that opens the Access denied dialog.
let onAccessDenied = null;
export const setAccessDeniedHandler = (fn) => {
  onAccessDenied = fn;
};

export async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => null);
    if (r.status === 403 && j?.error === "editor_only") onAccessDenied?.();
    throw new ApiError(r.status, j?.error || "status " + r.status, j?.errors);
  }
  return r.json();
}
