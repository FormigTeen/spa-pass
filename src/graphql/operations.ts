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

export const GET_PROFILE = gql`
  query GetProfile {
    getProfile {
      email
      document
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
  query PasskeyLoginOptions($email: String!) {
    passkeyLoginOptions(email: $email)
  }
`;

export const PASSKEY_LOGIN = gql`
  mutation PasskeyLogin($email: String!, $key: JSON!) {
    passkeyLogin(email: $email, key: $key) {
      email
      token
    }
  }
`;
