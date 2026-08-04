import { ClientError, GraphQLClient } from "graphql-request";

/**
 * In dev the calls go through the Vite proxy, which makes them same-origin so
 * the gateway's `SameSite=Lax` session cookie is actually sent back. In a build
 * the app is served from `pass.cvlb.tech`, already same-site with the gateway.
 */
/**
 * Always the real gateway. Dev is served from `local.pass.cvlb.tech`, which is
 * same-site with `api-gateway.cvlb.tech` (both under `cvlb.tech`), so the
 * gateway's `SameSite=Lax` session cookie is sent on these calls even though
 * they are cross-origin.
 */
const GATEWAY = "https://api-gateway.cvlb.tech/gql/v1";

const API_KEY = "TOOYB1KQ6-FAUW-IH4W-LIEF1T4AE6E";

const client = (module: "core" | "ecom") =>
  new GraphQLClient(`${GATEWAY}/${module}`, {
    headers: { "X-Api-Key": API_KEY },
    // The gateway session is a cookie, not a bearer token.
    credentials: "include",
  });

/** `/gql/v1/ecom` — email verification code + access key sign in. */
export const ecomClient = client("ecom");

/** `/gql/v1/core` — profile and passkey (gq_example). */
export const coreClient = client("core");

export const core = <T>(
  document: string,
  variables?: object,
  requestHeaders?: Record<string, string>,
) =>
  coreClient.request<T>({
    document,
    variables: variables as never,
    requestHeaders,
  });

export const ecom = <T>(
  document: string,
  variables?: object,
  requestHeaders?: Record<string, string>,
) =>
  ecomClient.request<T>({
    document,
    variables: variables as never,
    requestHeaders,
  });

/** Unwraps the gateway's GraphQL errors into a readable message. */
export const gatewayErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ClientError) {
    const first = error.response?.errors?.[0]?.message;
    if (first) return first;
  }
  return error instanceof Error && error.message ? error.message : fallback;
};
