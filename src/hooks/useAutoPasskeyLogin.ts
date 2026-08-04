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

type AuthOptions = { allowCredentials?: unknown[] } & Record<string, unknown>;

export type PasskeyGate = {
  status: PasskeyGateStatus;
  email: string;
  error: string;
  /** True once the gateway confirmed `checkedEmail` owns a credential. */
  hasKey: boolean;
  /** The email `hasKey` refers to. */
  checkedEmail: string;
  /** Full run: confirm the key, then raise the biometric prompt. */
  attempt: (email: string) => void;
  /** Confirm the key without prompting — just reveals the biometric button. */
  probe: (email: string) => void;
  retry: () => void;
  skip: () => void;
};

/**
 * Requirements: a returning user whose email we remember — or one the browser
 * autofills — gets the biometric prompt without touching anything, provided
 * the gateway confirms a credential exists. Any failure falls back to the
 * email + code form.
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
  const [checkedEmail, setCheckedEmail] = useState("");
  const [hasKey, setHasKey] = useState(false);

  /** email → owns a credential. Avoids re-asking the gateway per keystroke. */
  const probed = useRef(new Map<string, boolean>());
  /** Emails already taken all the way to a prompt, so we never nag twice. */
  const attempted = useRef(new Set<string>());
  /** Options are single-use challenges; hold them only until the next prompt. */
  const pending = useRef<{ email: string; options: AuthOptions } | null>(null);
  const autoRan = useRef(false);

  const rememberKey = useCallback(
    (email: string, owns: boolean) =>
      setPasskeyEmails((current) => {
        const without = current.filter((item) => item !== email);
        return owns ? [...without, email] : without;
      }),
    [setPasskeyEmails],
  );

  const probe = useCallback(
    async (email: string): Promise<boolean> => {
      if (!email || !supportsPasskey()) return false;

      const cached = probed.current.get(email);
      if (cached !== undefined) {
        setCheckedEmail(email);
        setHasKey(cached);
        return cached;
      }

      try {
        const options = await loginOptions(email);
        const owns = Boolean(options?.allowCredentials?.length);
        probed.current.set(email, owns);
        rememberKey(email, owns);
        setCheckedEmail(email);
        setHasKey(owns);
        pending.current = owns ? { email, options } : null;
        return owns;
      } catch {
        // Unknown email, or the gateway has no credentials for it.
        probed.current.set(email, false);
        setCheckedEmail(email);
        setHasKey(false);
        return false;
      }
    },
    [loginOptions, rememberKey],
  );

  const prompt = useCallback(
    async (email: string) => {
      setStatus("prompting");
      setError("");

      // Reuse the challenge from the probe when it is still fresh.
      const preloaded =
        pending.current?.email === email ? pending.current.options : null;
      pending.current = null;

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

  const attempt = useCallback(
    async (email: string) => {
      if (!email || attempted.current.has(email)) return;
      if (!supportsPasskey()) return;
      attempted.current.add(email);

      setStatus("checking");
      const owns = await probe(email);
      if (!owns) {
        setStatus("idle");
        return;
      }
      await prompt(email);
    },
    [probe, prompt],
  );

  // Returning user: stored email, not signed in, gateway confirms a key.
  useEffect(() => {
    if (autoRan.current) return;
    if (!profileChecked || session || signedOut) return;
    if (!lastEmail || !supportsPasskey()) return;

    autoRan.current = true;
    setHasKey(passkeyEmails.includes(lastEmail));
    void attempt(lastEmail);
    // `passkeyEmails` is an optimistic hint; depending on it would re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileChecked, session, signedOut, lastEmail, attempt]);

  return {
    status,
    email: lastEmail,
    error,
    hasKey,
    checkedEmail,
    attempt: (email) => void attempt(email),
    probe: (email) => void probe(email),
    retry: () => void prompt(checkedEmail || lastEmail),
    skip: () => setStatus("idle"),
  };
}
