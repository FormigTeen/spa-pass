import { useCallback } from "react";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  WebAuthnAbortService,
} from "@simplewebauthn/browser";
import { core, gatewayErrorMessage } from "../lib/gateway";
import {
  PASSKEY_LOGIN,
  PASSKEY_LOGIN_OPTIONS,
  PASSKEY_REGISTER,
  PASSKEY_REGISTER_OPTIONS,
} from "../graphql/operations";

export type PasskeyToken = { email: string; token: string };

type AuthOptions = Record<string, unknown>;
type RegisterOptions = { excludeCredentials?: unknown[] } & Record<string, unknown>;

/** The account has no passkey to authenticate with. */
export class NoCredentialsError extends Error {
  constructor() {
    super("Essa conta ainda não tem uma chave de acesso.");
    this.name = "NoCredentialsError";
  }
}

export const isNoCredentials = (error: unknown) =>
  error instanceof NoCredentialsError;

/** The user dismissed the OS sheet, or the device holds no matching key. */
export const isUserCancellation = (error: unknown) =>
  error instanceof Error &&
  (error.name === "NotAllowedError" || error.name === "AbortError");

/** The device can already reach a key for this account. */
export const isAlreadyRegistered = (error: unknown) =>
  error instanceof Error &&
  (error.name === "InvalidStateError" ||
    /credential manager/i.test(error.message));

export const passkeyErrorMessage = (error: unknown) => {
  if (isNoCredentials(error)) return "Essa conta ainda não tem uma chave de acesso.";
  if (isUserCancellation(error)) return "Autenticação cancelada.";
  if (isAlreadyRegistered(error))
    return "Este aparelho já tem acesso a uma chave desta conta.";
  return gatewayErrorMessage(error, "Não foi possível usar a chave de acesso.");
};

export const passkeyDebugMessage = (error: unknown) => {
  const message = passkeyErrorMessage(error);
  if (!(error instanceof Error)) return message;

  const details = [error.name, error.message].filter(Boolean).join(": ");
  return details ? `${message} (${details})` : message;
};

export const supportsPasskey = () => browserSupportsWebAuthn();

export const supportsPlatformAuthenticator = () =>
  platformAuthenticatorIsAvailable().catch(() => false);

export function usePasskey() {
  /** Throws `NoCredentialsError` when the address has no key registered. */
  const loginOptions = useCallback(async (email?: string) => {
    const data = await core<{ passkeyLoginOptions: AuthOptions }>(
      PASSKEY_LOGIN_OPTIONS,
      email ? { email } : {},
    ).catch(() => {
      throw new NoCredentialsError();
    });

    const options = data.passkeyLoginOptions;
    if (!options) throw new NoCredentialsError();
    return options;
  }, []);

  const hasPasskey = useCallback(
    (email: string) =>
      loginOptions(email)
        .then(() => true)
        .catch(() => false),
    [loginOptions],
  );

  const loginWithPasskey = useCallback(
    async (email?: string): Promise<PasskeyToken> => {
      const optionsJSON = await loginOptions(email);

      const key = await startAuthentication({ optionsJSON: optionsJSON as never });

      const data = await core<{ passkeyLogin: PasskeyToken }>(PASSKEY_LOGIN, {
        key,
      });
      if (!data.passkeyLogin) throw new Error("Falha ao validar a chave de acesso.");
      return data.passkeyLogin;
    },
    [loginOptions],
  );

  /** Requires the gateway session cookie: enrolment is bound to the signed in user. */
  const registerOptions = useCallback(
    () =>
      core<{ passkeyRegisterOptions: RegisterOptions }>(
        PASSKEY_REGISTER_OPTIONS,
      ).then((data) => data.passkeyRegisterOptions ?? null),
    [],
  );

  const enrolPasskey = useCallback(async () => {
    const optionsJSON = await registerOptions();
    if (!optionsJSON) throw new Error("Não foi possível iniciar o registro da chave.");

    const key = await startRegistration({ optionsJSON: optionsJSON as never });

    const data = await core<{ passkeyRegister: boolean }>(PASSKEY_REGISTER, {
      key,
    });
    if (data.passkeyRegister !== true)
      throw new Error("O servidor recusou o registro da chave.");
    return true;
  }, [registerOptions]);

  const cancelPasskey = useCallback(() => {
    WebAuthnAbortService.cancelCeremony();
  }, []);

  return {
    loginOptions,
    hasPasskey,
    loginWithPasskey,
    cancelPasskey,
    registerOptions,
    enrolPasskey,
  };
}
