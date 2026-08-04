import { useCallback, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { lastEmailAtom } from "../state/atoms";
import {
  isUserCancellation,
  passkeyErrorMessage,
  supportsPasskey,
  usePasskey,
  type PasskeyToken,
} from "./usePasskey";
import { completeVtexFirebaseSession } from "../lib/vtexFirebaseSession";
import { profileQueryKey } from "./useProfile";

export type PasskeyGateStatus =
  | "idle" // nothing on screen — a silent autofill offer may be pending
  | "prompting" // the OS sheet is up, because the user asked for it
  | "linking" // biometrics passed; VTEX is issuing the session
  | "failed";

export type PasskeyGate = {
  status: PasskeyGateStatus;
  email: string;
  error: string;
  /** Explicit request: raise the OS sheet now. */
  attempt: (email: string) => void;
  /**
   * Arm the autofill offer. Called by the component that owns the email input,
   * because the browser requires that input to be in the DOM for the whole
   * call — starting this from a parent races the form being swapped out.
   */
  startConditional: (email: string) => void;
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
  const { loginWithPasskey, conditionalLogin } = usePasskey();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<PasskeyGateStatus>("idle");
  const [error, setError] = useState("");
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

  const startConditional = useCallback(
    async (email: string) => {
      if (conditionalStarted.current) return;
      if (!email || !supportsPasskey()) return;
      conditionalStarted.current = true;

      try {
        const token = await conditionalLogin(email);
        if (token) await finish(token);
      } catch (caught) {
        // Aborted by another WebAuthn call, or simply never picked.
        if (!isUserCancellation(caught)) setError(passkeyErrorMessage(caught));
      }
    },
    [conditionalLogin, finish],
  );

  return {
    status,
    email: lastEmail,
    error,
    attempt: (email) => void attempt(email),
    startConditional: (email) => void startConditional(email),
    retry: () => void attempt(lastEmail),
    skip: () => setStatus("idle"),
  };
}
