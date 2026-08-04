import { ecom } from "./gateway";
import { OAUTH_FIREBASE } from "../graphql/operations";
import { exchangeCustomTokenForIdToken } from "./firebase";

/**
 * Turns the passkey login's Firebase custom token into a real VTEX session.
 *
 *   custom token ──▶ Firebase sign in ──▶ ID token
 *                ──▶ oAuth(provider: "Firebase")  → VTEX ID URL
 *                ──▶ call that URL with the same header → session cookies
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

  const data = await ecom<{ oAuth: string }>(OAUTH_FIREBASE, undefined, {
    "X-Firebase-Authorization": authorization,
  });
  if (!data.oAuth) throw new Error("A VTEX não devolveu a URL de autenticação.");

  // Dropping to http mid-login would lose the Secure session cookies.
  const url = data.oAuth.replace(/^http:\/\//, "https://");

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { "X-Firebase-Authorization": authorization },
  });

  if (!response.ok)
    throw new Error(`A VTEX recusou a autenticação (HTTP ${response.status}).`);

  return true;
}
