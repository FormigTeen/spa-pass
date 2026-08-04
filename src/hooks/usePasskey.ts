import { useCallback } from "react";
import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
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

type RegisterOptions = { excludeCredentials?: unknown[] } & Record<string, unknown>;

/** The user dismissed the OS sheet — not an error worth shouting about. */
export const isUserCancellation = (error: unknown) =>
  error instanceof Error &&
  (error.name === "NotAllowedError" || error.name === "AbortError");

/**
 * Passkeys sync across a Google or iCloud account, so a phone can already
 * reach the key created on a laptop. Registration is then correctly refused
 * via `excludeCredentials` — but Android surfaces that as a generic
 * "unknown error ... credential manager" rather than InvalidStateError.
 */
export const isAlreadyRegistered = (error: unknown) =>
  error instanceof Error &&
  (error.name === "InvalidStateError" ||
    /credential manager/i.test(error.message));

export const passkeyErrorMessage = (error: unknown) => {
  if (isUserCancellation(error)) return "Autenticação cancelada.";
  if (isAlreadyRegistered(error))
    return "Este aparelho já tem acesso a uma chave desta conta.";
  return gatewayErrorMessage(error, "Não foi possível usar a chave de acesso.");
};

export const supportsPasskey = () => browserSupportsWebAuthn();

/**
 * Restricts the request to credentials this device can serve on its own.
 *
 * `hybrid` is what makes a browser offer the QR sheet for a key living on
 * another device. Dropping it turns the call into a silent check: the
 * authenticator either holds a matching credential and prompts, or it matches
 * nothing and fails at once, with no UI in between. That failure is the answer
 * the login form is asking for, not an error.
 */
const localCredentialsOnly = (options: AuthOptions): AuthOptions => {
  if (!Array.isArray(options.allowCredentials)) return options;

  return {
    ...options,
    allowCredentials: options.allowCredentials.map((credential) => {
      const item = credential as { transports?: string[] };
      if (!Array.isArray(item.transports)) return credential;
      const transports = item.transports.filter((one) => one === "internal");
      return { ...item, transports };
    }),
  };
};

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

  const loginWithPasskey = useCallback(
    async (
      email: string,
      preloaded?: AuthOptions | null,
      localOnly = false,
    ): Promise<PasskeyToken> => {
      // Reuse the options from the "has a key?" probe so the challenge the
      // authenticator signs is the one the gateway is still holding.
      const optionsJSON = preloaded ?? (await loginOptions(email));
      if (!optionsJSON) throw new Error("Nenhuma chave de acesso disponível.");

      // No timeout here, deliberately. A device with no match refuses on its
      // own; a device that has the key is waiting for a finger on the sensor,
      // and capping the wait cancelled real logins mid-prompt.
      const key = await startAuthentication({
        optionsJSON: (localOnly
          ? localCredentialsOnly(optionsJSON)
          : optionsJSON) as never,
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

  /**
   * Conditional mediation: the passkey is offered inside the email field's
   * autofill list, and only when the browser actually holds a matching
   * credential. Nothing pops up otherwise, so a device that has no key never
   * sees "no passkey available".
   *
   * The promise stays pending until the user picks the passkey — or forever,
   * if they just type instead. `WebAuthnAbortService` inside the library
   * cancels it as soon as any other WebAuthn call starts.
   */
  const conditionalLogin = useCallback(
    async (email: string): Promise<PasskeyToken | null> => {
      if (!(await browserSupportsWebAuthnAutofill().catch(() => false))) return null;

      // Options no longer list credentials — the authenticator resolves the
      // account from its own discoverable ones — so there is nothing to check
      // here beyond having options at all.
      const optionsJSON = await loginOptions(email).catch(() => null);
      if (!optionsJSON) return null;

      const key = await startAuthentication({
        optionsJSON: optionsJSON as never,
        useBrowserAutofill: true,
      });

      const data = await core<{ passkeyLogin: PasskeyToken }>(PASSKEY_LOGIN, {
        email,
        key,
      });
      return data.passkeyLogin ?? null;
    },
    [loginOptions],
  );

  /**
   * Requires the gateway session cookie — enrolment is bound to the logged in
   * user. `excludeCredentials` lists the account's existing keys, which is the
   * only remaining way to ask "does this account have any?": login options
   * deliberately carry no credential list. Asking here is safe because it is
   * authenticated and about the caller's own account.
   */
  const registerOptions = useCallback(
    () =>
      core<{ passkeyRegisterOptions: RegisterOptions }>(
        PASSKEY_REGISTER_OPTIONS,
      ).then((data) => data.passkeyRegisterOptions ?? null),
    [],
  );

  const enrolPasskey = useCallback(async (preloaded?: RegisterOptions | null) => {
    const optionsJSON = preloaded ?? (await registerOptions());
    if (!optionsJSON) throw new Error("Não foi possível iniciar o registro da chave.");

    // Passed through untouched: the gateway already asks for the platform
    // authenticator and sends its own `hints`.
    const key = await startRegistration({ optionsJSON: optionsJSON as never });

    const data = await core<{ passkeyRegister: boolean }>(PASSKEY_REGISTER, {
      key,
    });
    if (data.passkeyRegister !== true)
      throw new Error("O servidor recusou o registro da chave.");
    return true;
  }, [registerOptions]);

  return {
    loginWithPasskey,
    registerOptions,
    conditionalLogin,
    enrolPasskey,
    loginOptions,
  };
}
