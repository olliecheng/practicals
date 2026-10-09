// Better Auth (Google sign-in) on Cloudflare D1. Workers expose bindings only per request, so build the instance from `env` each time.
import { betterAuth } from "better-auth";
import { admin, username } from "better-auth/plugins";

export const createAuth = (env) =>
  betterAuth({
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    // The app's own tables use plural names (see migrations/0001_accounts.sql)
    user: { modelName: "users" },
    session: { modelName: "sessions" },
    account: { modelName: "accounts" },
    verification: { modelName: "verifications" },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      // Optional public handle; display = username ?? name
      username({
        usernameValidator: (u) => /^[A-Za-z0-9_-]+$/.test(u),
      }),
      // Ban / remove users and set roles; the first admin is set by hand in the D1 console
      admin(),
    ],
    // In-memory rate limits are per isolate and so ineffective on Workers. Session reads happen on every page load, so skip them (each counted request is a D1 write); sign-in and sign-up keep Better Auth's strict built-in limits.
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimits",
      customRules: { "/get-session": false },
    },
    advanced: {
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  });
