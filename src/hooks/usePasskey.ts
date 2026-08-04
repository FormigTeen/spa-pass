import { useCallback } from "react";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { core, gatewayErrorMessage } from "../lib/gateway";
import {
  PASSKEY_LOGIN,
  PASSKEY_LOGIN_OPTIONS,
  PASSKEY_REGISTER,
  PASSKEY_REGISTER_OPTIONS,
} from "../graphql/operations";

export type PasskeyToken = { email: string; token: string };

type AuthOptions = { allowCredentials?: unknown[] } & Record<string, unknown>;

/** The user dismissed the OS sheet — not an error worth shouting about. */
export const isUserCancellation = (error: unknown) =>
  error instanceof Error &&
  (error.name === "NotAllowedError" || error.name === "AbortError");

export const passkeyErrorMessage = (error: unknown) => {
  if (isUserCancellation(error)) return "Autenticação cancelada.";
  if (error instanceof Error && error.name === "InvalidStateError")
    return "Este dispositivo já possui uma chave registrada para esta conta.";
  return gatewayErrorMessage(error, "Não foi possível usar a chave de acesso.");
};

export const supportsPasskey = () => browserSupportsWebAuthn();

/**
 * Steers the browser to this device's built-in sensor.
 *
 * Without `authenticatorAttachment: "platform"` the browser opens its full
 * picker — phone over QR, security key, another device — and the fingerprint
 * is just one option buried in it. These are client-side hints, so overriding
 * them does not invalidate the server's challenge.
 */
const preferBuiltInSensor = <T extends Record<string, unknown>>(options: T) => ({
  ...options,
  authenticatorSelection: {
    residentKey: "preferred",
    userVerification: "preferred",
    ...((options.authenticatorSelection as object) ?? {}),
    authenticatorAttachment: "platform",
  },
  // Ignored by browsers that do not know it yet.
  hints: ["client-device"],
});

export const supportsPlatformAuthenticator = () =>
  platformAuthenticatorIsAvailable().catch(() => false);

export function usePasskey() {
  /** Authentication options double as the "does this email have a key?" probe. */
  const loginOptions = useCallback(async (email: string) => {
    const data = await core<{ passkeyLoginOptions: AuthOptions }>(
      PASSKEY_LOGIN_OPTIONS,
      { email },
    );
    return data.passkeyLoginOptions ?? null;
  }, []);

  const hasPasskey = useCallback(
    async (email: string) => {
      if (!email || !supportsPasskey()) return false;
      try {
        const options = await loginOptions(email);
        return Boolean(options?.allowCredentials?.length);
      } catch {
        // Unknown email, or the gateway has no credentials for it.
        return false;
      }
    },
    [loginOptions],
  );

  const loginWithPasskey = useCallback(
    async (email: string, preloaded?: AuthOptions | null): Promise<PasskeyToken> => {
      // Reuse the options from the "has a key?" probe so the challenge the
      // authenticator signs is the one the gateway is still holding.
      const optionsJSON = preloaded ?? (await loginOptions(email));
      if (!optionsJSON) throw new Error("Nenhuma chave de acesso disponível.");

      const key = await startAuthentication({
        optionsJSON: preferBuiltInSensor(optionsJSON) as never,
      });

      const data = await core<{ passkeyLogin: PasskeyToken }>(PASSKEY_LOGIN, {
        email,
        key,
      });
      if (!data.passkeyLogin) throw new Error("Falha ao validar a chave de acesso.");
      return data.passkeyLogin;
    },
    [loginOptions],
  );

  /** Requires the gateway session cookie — enrolment is bound to the logged in user. */
  const enrolPasskey = useCallback(async () => {
    const optionsData = await core<{ passkeyRegisterOptions: object }>(
      PASSKEY_REGISTER_OPTIONS,
    );
    const optionsJSON = optionsData.passkeyRegisterOptions;
    if (!optionsJSON) throw new Error("Não foi possível iniciar o registro da chave.");

    const key = await startRegistration({
      optionsJSON: preferBuiltInSensor(optionsJSON as Record<string, unknown>) as never,
    });

    const data = await core<{ passkeyRegister: boolean }>(PASSKEY_REGISTER, {
      key,
    });
    if (data.passkeyRegister !== true)
      throw new Error("O servidor recusou o registro da chave.");
    return true;
  }, []);

  return { hasPasskey, loginWithPasskey, enrolPasskey, loginOptions };
}
