import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { lastEmailAtom, sessionAtom, signedOutAtom } from "../state/atoms";
import {
  isUserCancellation,
  passkeyErrorMessage,
  supportsPasskey,
  usePasskey,
  type PasskeyToken,
} from "./usePasskey";
import { completeVtexFirebaseSession } from "../lib/vtexFirebaseSession";
import { profileQueryKey, useProfile } from "./useProfile";

export type PasskeyGateStatus =
  | "idle" // nothing on screen — a silent autofill offer may be pending
  | "prompting" // the OS sheet is up, because the user asked for it
  | "linking" // biometrics passed; VTEX is issuing the session
  | "failed";

export type PasskeyGate = {
  status: PasskeyGateStatus;
  email: string;
  error: string;
  /** The gateway confirmed the *account* owns a credential. */
  hasKey: boolean;
  /** The email `hasKey` refers to. */
  checkedEmail: string;
  /** Explicit request: raise the OS sheet now. */
  attempt: (email: string) => void;
  /** Ask the gateway whether the account has a key, without prompting. */
  probe: (email: string) => void;
  retry: () => void;
  skip: () => void;
};

/**
 * Returning users sign in with a passkey without asking for it — but only
 * through **conditional mediation**, where the browser puts the passkey in the
 * email field's autofill list and shows it *only if it actually holds one*.
 *
 * Nothing here records which devices have keys, deliberately. WebAuthn offers
 * no way to ask "does this device hold credential X" — enumerating credentials
 * would be a fingerprinting vector — so any such record is a guess. Guessing
 * wrong is exactly what produced an unprompted "no passkey available": the
 * gateway answers for the *account*, and a phone may hold nothing while the
 * account's key sits on a laptop. Conditional mediation hands that judgement
 * to the only party able to make it, and it cannot fail loudly: with no
 * matching credential, nothing appears at all.
 */
export function useAutoPasskeyLogin(): PasskeyGate {
  const lastEmail = useAtomValue(lastEmailAtom);
  const session = useAtomValue(sessionAtom);
  const signedOut = useAtomValue(signedOutAtom);
  const { loginOptions, loginWithPasskey, conditionalLogin } = usePasskey();
  const queryClient = useQueryClient();

  // Wait for the cookie check: someone already signed in needs no passkey.
  const { isFetched: profileChecked } = useProfile();

  const [status, setStatus] = useState<PasskeyGateStatus>("idle");
  const [error, setError] = useState("");
  const [checkedEmail, setCheckedEmail] = useState("");
  const [hasKey, setHasKey] = useState(false);

  const probed = useRef(new Map<string, boolean>());
  const conditionalStarted = useRef(false);

  /** Everything after the passkey itself: Firebase, then the VTEX session. */
  const finish = useCallback(
    async (token: PasskeyToken) => {
      setStatus("linking");
      await completeVtexFirebaseSession(token.token);
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      setStatus("idle");
    },
    [queryClient],
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
        setCheckedEmail(email);
        setHasKey(owns);
        return owns;
      } catch {
        probed.current.set(email, false);
        setCheckedEmail(email);
        setHasKey(false);
        return false;
      }
    },
    [loginOptions],
  );

  /** Modal sheet. Only ever reached because the user asked for it. */
  const attempt = useCallback(
    async (email: string) => {
      if (!email || !supportsPasskey()) return;
      setStatus("prompting");
      setError("");
      try {
        const token = await loginWithPasskey(email);
        await finish(token);
      } catch (caught) {
        setStatus("failed");
        setError(isUserCancellation(caught) ? "" : passkeyErrorMessage(caught));
      }
    },
    [loginWithPasskey, finish],
  );

  // Silent autofill offer for the remembered email. It never raises a sheet on
  // its own, so there is nothing to gate it on and nothing to remember.
  useEffect(() => {
    if (conditionalStarted.current) return;
    if (!profileChecked || session || signedOut) return;
    if (!lastEmail || !supportsPasskey()) return;

    conditionalStarted.current = true;

    void (async () => {
      void probe(lastEmail);
      try {
        const token = await conditionalLogin(lastEmail);
        if (token) await finish(token);
      } catch (caught) {
        // Aborted by another WebAuthn call, or simply never picked.
        if (!isUserCancellation(caught)) setError(passkeyErrorMessage(caught));
      }
    })();
  }, [
    profileChecked,
    session,
    signedOut,
    lastEmail,
    conditionalLogin,
    probe,
    finish,
  ]);

  return {
    status,
    email: lastEmail,
    error,
    hasKey,
    checkedEmail,
    attempt: (email) => void attempt(email),
    probe: (email) => void probe(email),
    retry: () => void attempt(checkedEmail || lastEmail),
    skip: () => setStatus("idle"),
  };
}
