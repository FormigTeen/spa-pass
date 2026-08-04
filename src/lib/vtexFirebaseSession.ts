import { ecom, gatewayErrorMessage } from "./gateway";
import { OAUTH_FIREBASE } from "../graphql/operations";
import { exchangeCustomTokenForIdToken } from "./firebase";
import { applySessionCookies } from "./session";

const GATEWAY = "https://api-gateway.cvlb.tech";

/** Registered in the VTEX admin under "OAuth Personalizado". */
const CLIENT_ID = "986b7a28-e455-4897-8710-9b39815d4227";
const REDIRECT_URI =
  "https://vtexid.vtex.com.br/VtexIdAuthSiteKnockout/ReceiveAuthorizationCode.ashx";

type AuthorizeResponse = { data?: Record<string, string> } & Record<
  string,
  unknown
>;

/**
 * Turns the passkey login's Firebase custom token into a real VTEX session.
 *
 *   custom token ──▶ Firebase sign in ──▶ ID token
 *                ──▶ oAuth(provider: "Firebase")  → authenticationToken
 *                ──▶ GET /oauth/v1/firebase/authorize with the ID token
 *                      → the VtexId* cookies, as JSON
 *                ──▶ written back as cookies on .cvlb.tech
 *
 * `authorize` is not a redirect to navigate to: it verifies the ID token from
 * `X-Firebase-Authorization`, follows VTEX's redirect server-side with its own
 * cookie jar, and hands the resulting `VtexId*` cookies back in the body. A
 * browser navigation could not carry that header, so this has to be a fetch.
 */
export async function completeVtexFirebaseSession(customToken: string) {
  const idToken = await exchangeCustomTokenForIdToken(customToken);
  const authorization = `Bearer ${idToken}`;

  // The redirect URL carries the authenticationToken that ties this attempt to
  // a VTEX login session.
  const oauth = await ecom<{ oAuth: string }>(OAUTH_FIREBASE, undefined, {
    "X-Firebase-Authorization": authorization,
  });
  if (!oauth.oAuth) throw new Error("A VTEX não devolveu a URL de autenticação.");

  const state = new URL(oauth.oAuth).searchParams.get("authenticationToken");
  if (!state) throw new Error("A URL da VTEX veio sem authenticationToken.");

  const authorize = new URL(`${GATEWAY}/oauth/v1/firebase/authorize`);
  authorize.searchParams.set("client_id", CLIENT_ID);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("redirect_uri", REDIRECT_URI);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("prompt", "login");

  const response = await fetch(authorize.toString(), {
    method: "GET",
    credentials: "include",
    headers: { "X-Firebase-Authorization": authorization },
  });

  const body = (await response.json().catch(() => null)) as AuthorizeResponse | null;
  if (!response.ok) {
    throw new Error(
      gatewayErrorMessage(body, `Falha ao abrir a sessão (HTTP ${response.status}).`),
    );
  }

  // The service returns only cookies whose name starts with `VtexId`.
  const cookies = (body?.data ?? body) as Record<string, string> | null;
  const written = applySessionCookies(cookies ?? {});
  if (!written.length)
    throw new Error("A sessão foi criada mas nenhum cookie foi devolvido.");

  return written;
}
