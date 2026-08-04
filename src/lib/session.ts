/**
 * The gateway resolves the user from any cookie whose name contains
 * `VtexIdclientAutCookie` (it is suffixed per account).
 *
 * ⚠️ This CANNOT clear the gateway's own session cookie, verified against the
 * live gateway. `VtexIdclientAutCookie_lebiscuit` comes back as:
 *
 *     domain: api-gateway.cvlb.tech   (host-only, not .cvlb.tech)
 *     httpOnly: true
 *
 * Two independent blockers: `httpOnly` puts it out of reach of
 * `document.cookie` entirely, and even without that, a page may only write
 * cookies for its own host or a *parent* domain — never a sibling subdomain
 * like `api-gateway.cvlb.tech`. That holds in production too.
 *
 * It DOES clear the cookies `applySessionCookies` writes on `.cvlb.tech`, since
 * those are ours and not httpOnly — so a passkey session signs out completely.
 * A code sign in still leaves the gateway's own cookie behind, and clearing
 * that needs the gateway to expire it (`Set-Cookie: ...; Max-Age=0`).
 */
const AUTH_COOKIE = "VtexIdclientAutCookie";

const EXPIRED = "Thu, 01 Jan 1970 00:00:00 GMT";

/** Current host plus every parent domain the cookie could be scoped to. */
const candidateDomains = (hostname: string) => {
  const domains: (string | null)[] = [null, hostname];
  const parts = hostname.split(".");
  for (let index = 1; index < parts.length - 1; index += 1)
    domains.push(`.${parts.slice(index).join(".")}`);
  return domains;
};

/**
 * Parent domain the app shares with the gateway. A cookie scoped here is sent
 * to every `*.cvlb.tech` host — including `api-gateway.cvlb.tech`, which the
 * app cannot address directly (it is a sibling, not a parent).
 */
const SHARED_DOMAIN = ".cvlb.tech";

/**
 * Writes the `VtexId*` cookies that `/oauth/v1/firebase/authorize` returns as
 * JSON, so subsequent gateway calls carry the session.
 *
 * These are necessarily readable from JS — the browser cannot recreate the
 * `httpOnly` flag the gateway would set itself. That is the trade of doing the
 * handshake client-side.
 */
export function applySessionCookies(cookies: Record<string, string>): string[] {
  const written: string[] = [];

  for (const [name, value] of Object.entries(cookies)) {
    if (!name || typeof value !== "string") continue;
    document.cookie =
      `${name}=${value}; Domain=${SHARED_DOMAIN}; Path=/; Secure; SameSite=None`;
    written.push(name);
  }

  return written;
}

export function clearAuthCookies(): string[] {
  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0].trim())
    .filter((name) => name.includes(AUTH_COOKIE));

  for (const name of names)
    for (const domain of candidateDomains(window.location.hostname))
      for (const path of ["/", window.location.pathname])
        document.cookie =
          `${name}=; expires=${EXPIRED}; path=${path}` +
          (domain ? `; domain=${domain}` : "");

  return names;
}
