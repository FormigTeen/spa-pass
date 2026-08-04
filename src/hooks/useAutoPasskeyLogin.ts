import { useCallback, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { deviceEnrolledAtom, lastEmailAtom } from "../state/atoms";
import {
  isUserCancellation,
  passkeyErrorMessage,
  supportsPasskey,
  usePasskey,
  type PasskeyToken,
} from "./usePasskey";
import { useQueryClient } from "@tanstack/react-query";
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
  /**
   * Raise the OS sheet now. Resolves true when the session is open, false when
   * the passkey was cancelled, refused, or simply not available — the caller
   * decides what to fall back to.
   */
  attempt: (email: string) => Promise<boolean>;
  retry: () => void;
  skip: () => void;
};

/**
 * The passkey attempt behind Continue.
 *
 * Nothing here guesses which devices hold keys. WebAuthn offers no way to ask
 * "does this device hold credential X" — enumerating credentials would be a
 * fingerprinting vector — so the question is put to the authenticator itself,
 * scoped to the address on screen and to credentials the device can serve. It
 * answers by prompting or by refusing at once, and a refusal simply routes to
 * the emailed code.
 */
export function useAutoPasskeyLogin(): PasskeyGate {
  const lastEmail = useAtomValue(lastEmailAtom);
  const { loginWithPasskey } = usePasskey();
  const queryClient = useQueryClient();
  const setDeviceEnrolled = useSetAtom(deviceEnrolledAtom);

  const [status, setStatus] = useState<PasskeyGateStatus>("idle");
  const [error, setError] = useState("");

  /**
   * Everything after the passkey itself: Firebase, then the VTEX session. It
   * all happens in place, so the profile query becomes the source of truth and
   * `useSessionBootstrap` opens the session.
   */
  const finish = useCallback(
    async (token: PasskeyToken) => {
      setStatus("linking");
      await completeVtexFirebaseSession(token.token);

      // Signing in with a key is proof this device holds one. Nothing we could
      // ask beforehand is as reliable, so record it and stop offering.
      setDeviceEnrolled((current) =>
        current.includes(token.email) ? current : [...current, token.email],
      );
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      setStatus("idle");
    },
    [queryClient, setDeviceEnrolled],
  );

  /**
   * The silent check behind Continue: restricted to credentials this device
   * holds, so it either prompts or fails at once. False means "no key here",
   * which is a route rather than a failure.
   */
  const attempt = useCallback(
    async (email: string): Promise<boolean> => {
      if (!email || !supportsPasskey()) return false;
      setStatus("prompting");
      setError("");
      try {
        const token = await loginWithPasskey(email, null, true);
        await finish(token);
        return true;
      } catch (caught) {
        setStatus("idle");
        // "No key here" is a route, not a failure — the code is waiting behind
        // it. Only a break in the session hand-off is worth showing.
        setError(isUserCancellation(caught) ? "" : passkeyErrorMessage(caught));
        return false;
      }
    },
    [loginWithPasskey, finish],
  );

  return {
    status,
    email: lastEmail,
    error,
    attempt,
    retry: () => void attempt(lastEmail),
    skip: () => setStatus("idle"),
  };
}
