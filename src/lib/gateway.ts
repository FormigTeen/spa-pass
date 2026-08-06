import { ClientError, GraphQLClient } from "graphql-request";

/**
 * Always the real CEV gateway. Dev is served from `local.pass.cvlb.tech`,
 * which is same-site with `api-cev-gateway.cvlb.tech` (both under `cvlb.tech`),
 * so the gateway's `SameSite=Lax` session cookie is sent on these calls even
 * though they are cross-origin.
 */
export const GATEWAY_ORIGIN = "https://api-cev-gateway.cvlb.tech";
export const GATEWAY_BASE_URL = import.meta.env.DEV
  ? window.location.origin
  : GATEWAY_ORIGIN;

export const API_KEY = "019F004F-3F4B-7CD7-87A1-55D84B55873F";

const GATEWAY = `${GATEWAY_BASE_URL}/gql/v1`;

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
