const AUTH_COOKIE = "VtexIdclientAutCookie";

/**
 * Parent domain shared with the gateway. A cookie scoped here is sent to every
 * `*.cvlb.tech` host, including `api-gateway.cvlb.tech` — which the app cannot
 * address directly, since it is a sibling rather than a parent. Verified: a
 * cookie written this way does arrive on gateway requests.
 */
const SHARED_DOMAIN = ".cvlb.tech";

/**
 * Writes the `VtexId*` cookies that `/oauth/v1/firebase/authorize` hands back
 * in its JSON body. It returns them as data rather than as `Set-Cookie`, so
 * without this nothing would carry the session.
 *
 * These are necessarily readable from script: the browser cannot recreate the
 * `httpOnly` flag the gateway sets on its own. That is the cost of completing
 * the handshake client-side, and it is why `signOut` exists server-side.
 */
export function applySessionCookies(cookies: Record<string, string>): string[] {
  const written: string[] = [];

  for (const [name, value] of Object.entries(cookies)) {
    if (!name || typeof value !== "string" || !value) continue;
    document.cookie = `${name}=${value}; Domain=${SHARED_DOMAIN}; Path=/; Secure; SameSite=None`;
    written.push(name);
  }

  return written;
}

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
