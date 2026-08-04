import { core } from "./gateway";
import { OAUTH_FIREBASE } from "../graphql/operations";
import { exchangeCustomTokenForIdToken } from "./firebase";
import { applySessionCookies } from "./session";

/**
 * Turns the passkey login's Firebase custom token into a real VTEX session.
 *
 *   custom token ──▶ Firebase sign in ──▶ ID token
 *                ──▶ ecomOAuth(provider: "Firebase")  → VTEX ID URL
 *                ──▶ follow it with the same header → cookies, as JSON
 *                ──▶ written onto .cvlb.tech so the gateway receives them
 *
 * The URL is fetched rather than navigated to. VTEX ID allows this origin and
 * the `X-Firebase-Authorization` header with credentials, so the whole
 * handshake finishes in place and the person never leaves the page.
 *
 * Building the authorize call by hand does not work, incidentally: `state` is
 * minted by VTEX ID when it starts the flow, and a fabricated one comes back
 * as `failed.short.window`.
 */
export async function completeVtexFirebaseSession(customToken: string) {
  const idToken = await exchangeCustomTokenForIdToken(customToken);
  const authorization = `Bearer ${idToken}`;

  const data = await core<{ ecomOAuth: string }>(OAUTH_FIREBASE, undefined, {
    "X-Firebase-Authorization": authorization,
  });
  if (!data.ecomOAuth)
    throw new Error("A VTEX não devolveu a URL de autenticação.");

  // Dropping to http mid-login would lose the Secure session cookies.
  const url = data.ecomOAuth.replace(/^http:\/\//, "https://");

  // `fetch` follows the redirect chain and keeps the header across it. The
  // origin becomes `null` on a cross-origin hop, and every host in the chain
  // allows that — verified on both gate.lebiscuit.com.br and the gateway.
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    redirect: "follow",
    headers: { "X-Firebase-Authorization": authorization },
  });

  if (!response.ok)
    throw new Error(`A VTEX recusou a autenticação (HTTP ${response.status}).`);

  // The last hop answers with the session cookies as JSON rather than as
  // `Set-Cookie`, so nothing stores them unless we do.
  const body = (await response.json().catch(() => null)) as
    | { data?: Record<string, string> }
    | Record<string, string>
    | null;

  const cookies = ((body as { data?: Record<string, string> })?.data ??
    body ?? {}) as Record<string, string>;

  const written = applySessionCookies(cookies);
  if (!written.length)
    throw new Error("A sessão foi criada mas nenhum cookie foi devolvido.");

  return written;
}
