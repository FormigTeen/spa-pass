import { useCallback, useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  lastEmailAtom,
  passkeyEmailsAtom,
  sessionAtom,
  signedOutAtom,
} from "../state/atoms";
import {
  isUserCancellation,
  passkeyErrorMessage,
  supportsPasskey,
  usePasskey,
} from "./usePasskey";
import { useSignIn } from "./useAuth";
import { useProfile } from "./useProfile";

export type PasskeyGateStatus =
  | "idle" // nothing to do — show the normal email form
  | "checking" // asking the gateway whether this email has a key
  | "prompting" // the OS biometric sheet is up
  | "failed"; // the attempt did not complete

export type PasskeyGate = {
  status: PasskeyGateStatus;
  email: string;
  error: string;
  /** True once we know the stored email really has a credential. */
  hasKey: boolean;
  retry: () => void;
  skip: () => void;
};

/**
 * Requirement: a returning user whose email we remember, who is not signed in
 * and already owns a passkey, gets the biometric prompt without touching
 * anything. Any failure falls back to the email + code form.
 */
export function useAutoPasskeyLogin(): PasskeyGate {
  const lastEmail = useAtomValue(lastEmailAtom);
  const session = useAtomValue(sessionAtom);
  const signedOut = useAtomValue(signedOutAtom);
  const [passkeyEmails, setPasskeyEmails] = useAtom(passkeyEmailsAtom);
  const { loginOptions, loginWithPasskey } = usePasskey();
  const signIn = useSignIn();

  // Wait for the cookie check before prompting, so an already signed in user
  // is never asked for a fingerprint.
  const { isFetched: profileChecked } = useProfile();

  const [status, setStatus] = useState<PasskeyGateStatus>("idle");
  const [error, setError] = useState("");
  const [hasKey, setHasKey] = useState(() => passkeyEmails.includes(lastEmail));
  const attempted = useRef(false);

  const rememberKey = useCallback(
    (email: string, owns: boolean) =>
      setPasskeyEmails((current) => {
        const without = current.filter((item) => item !== email);
        return owns ? [...without, email] : without;
      }),
    [setPasskeyEmails],
  );

  const prompt = useCallback(
    async (email: string, preloaded?: Record<string, unknown> | null) => {
      setStatus("prompting");
      setError("");
      try {
        const token = await loginWithPasskey(email, preloaded);
        signIn({ email: token.email, token: token.token, via: "passkey" });
        rememberKey(email, true);
        setStatus("idle");
      } catch (caught) {
        setStatus("failed");
        // A cancelled sheet is a choice, not an error message.
        setError(isUserCancellation(caught) ? "" : passkeyErrorMessage(caught));
      }
    },
    [loginWithPasskey, signIn, rememberKey],
  );

  useEffect(() => {
    if (attempted.current) return;
    if (!profileChecked || session || signedOut) return;
    if (!lastEmail || !supportsPasskey()) return;

    attempted.current = true;

    (async () => {
      setStatus("checking");
      try {
        const options = await loginOptions(lastEmail);
        const owns = Boolean(options?.allowCredentials?.length);
        rememberKey(lastEmail, owns);
        setHasKey(owns);

        if (!owns) {
          setStatus("idle");
          return;
        }
        await prompt(lastEmail, options);
      } catch {
        rememberKey(lastEmail, false);
        setHasKey(false);
        setStatus("idle");
      }
    })();
  }, [
    profileChecked,
    session,
    signedOut,
    lastEmail,
    loginOptions,
    prompt,
    rememberKey,
  ]);

  return {
    status,
    email: lastEmail,
    error,
    hasKey,
    retry: () => void prompt(lastEmail),
    skip: () => setStatus("idle"),
  };
}
