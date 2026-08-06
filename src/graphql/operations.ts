import { gql } from "graphql-request";

/* ── ecom module ─────────────────────────────────────────────── */

export const SEND_EMAIL_VERIFICATION = gql`
  mutation SendEmailVerification($email: String!) {
    sendEmailVerification(email: $email)
  }
`;

export const ACCESS_KEY_SIGN_IN = gql`
  mutation AccessKeySignIn($email: String!, $code: String!) {
    accessKeySignIn(email: $email, code: $code)
  }
`;

/* ── core module (gq_example) ────────────────────────────────── */

/**
 * The **core** module's own OAuth mutation, not VTEX's `oAuth` on the ecom
 * proxy. It resolves `accountName` from the gateway's provider, so the token
 * that comes back belongs to `lebiscuit`; the ecom one resolves elsewhere and
 * issues a token for the `vtex` account, which the gateway then rejects.
 *
 * Sent with `X-Firebase-Authorization: Bearer <idToken>`.
 */
export const OAUTH_FIREBASE = gql`
  mutation OAuthFirebase {
    ecomOAuth(provider: "Firebase")
  }
`;

/**
 * Expires the gateway's auth cookies. The only way to end the session: the
 * cookie is httpOnly and host-only on the gateway's domain, so nothing in the
 * browser can reach it.
 */
export const SIGN_OUT = gql`
  mutation SignOut {
    signOut
  }
`;

/**
 * VTEX's own profile, through the ecom proxy — `core`'s `getProfile` only
 * carries email and document, and the greeting needs a name.
 */
export const GET_PROFILE = gql`
  query GetProfile {
    profile {
      email
      firstName
      lastName
      document
    }
  }
`;

export const ORDERING_ORDERS = gql`
  query OrderingOrders($limit: String) {
    orderingOrders(limit: $limit) {
      vtex {
        orderId
        status
        creationDate
        value
        items {
          name
          quantity
        }
      }
      state {
        status
      }
    }
  }
`;

/**
 * Passkey operations, renamed in gq_example's passkey module:
 *   registerPasskeyOptions → passkeyRegisterOptions
 *   loginPasskeyOptions    → passkeyLoginOptions
 *   registerPasskey        → passkeyRegister
 *   loginPasskey           → passkeyLogin (now returns PasskeyToken)
 */

export const PASSKEY_REGISTER_OPTIONS = gql`
  query PasskeyRegisterOptions {
    passkeyRegisterOptions
  }
`;

export const PASSKEY_REGISTER = gql`
  mutation PasskeyRegister($key: JSON!) {
    passkeyRegister(key: $key)
  }
`;

export const PASSKEY_LOGIN_OPTIONS = gql`
  query PasskeyLoginOptions($email: String) {
    passkeyLoginOptions(email: $email)
  }
`;

export const PASSKEY_LOGIN = gql`
  mutation PasskeyLogin($key: JSON!) {
    passkeyLogin(key: $key) {
      email
      token
    }
  }
`;

/* ── inbot module (gq_example) ───────────────────────────────── */

/**
 * Opens the agent session for an order. The session carries the request the
 * client uses to talk to the agent — url, method, headers and a JSON Schema of
 * the body — so nothing about that call is hardcoded here.
 */
export const INBOT_REQUEST_REFUND_ORDER = gql`
  mutation InbotRequestRefundOrder($orderId: String!) {
    inbotRequestRefundOrder(orderId: $orderId) {
      uuid
      request {
        url
        method
        headers
        bodySchema
        stream
      }
    }
  }
`;

export const INBOT_RESTORE_SESSION = gql`
  query InbotRestoreSession($session: UUID!) {
    inbotRestoreSession(session: $session) {
      uuid
      agent
      state
      events
      updatedAt
      request {
        url
        method
        headers
        bodySchema
        stream
      }
    }
  }
`;
