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
 * A real sign out needs the gateway to expire the cookie itself (a mutation or
 * endpoint responding `Set-Cookie: ...; Max-Age=0`). Until then `signedOutAtom`
 * drops the session client-side, and this stays as a best effort for any
 * first-party, non-httpOnly auth cookie.
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
