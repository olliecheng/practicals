// Better Auth client (Google sign-in). The API is same-origin under /api/auth.
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [usernameClient()],
});

// Public handle if the user chose one, else their Google name
export const displayName = (user) =>
  user ? user.displayUsername || user.username || user.name : "";
