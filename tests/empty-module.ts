// A no-op stand-in for the `server-only` / `client-only` marker packages, which throw when
// imported outside a bundler that understands React Server Component conditions (as Vitest is).
// The markers guard real builds; in unit tests they're irrelevant, so they resolve to nothing.
export {};
