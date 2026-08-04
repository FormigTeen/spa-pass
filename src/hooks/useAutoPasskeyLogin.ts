import { useCallback, useRef, useState } from "react";
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
   * Arm the autofill offer for an address. Called by the component that owns
   * the email input: the browser needs that input in the DOM for the whole
   * call, so a parent cannot promise it.
   */
  startConditional: (email: string) => void;
};

/**
 * The passkey offer, through **conditional mediation**: the browser lists the
 * key inside the email field's own autofill dropdown, and only when it really
 * holds one.
 *
 * This is the only silent way to ask the question. A modal ceremony always
 * shows something — the picker, or "no passkeys registered" — because a
 * WebAuthn call that could answer invisibly would let any page fingerprint
 * which credentials a device carries. Conditional mediation moves the decision
 * to the browser, which can answer honestly without telling the page anything:
 * a device with no key simply gets no suggestion.
 */
export function useAutoPasskeyLogin(): PasskeyGate {
  const lastEmail = useAtomValue(lastEmailAtom);
  const { conditionalLogin } = usePasskey();
  /** Address the autofill offer is currently armed for. */
  const armedFor = useRef<string | null>(null);
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

  const startConditional = useCallback(
    async (email: string) => {
      if (!email || !supportsPasskey()) return;
      // Re-arming for a different address is the point: the offer must belong
      // to the email on screen. The library aborts the pending call for us.
      if (armedFor.current === email) return;
      armedFor.current = email;

      try {
        const token = await conditionalLogin(email);
        if (token) await finish(token);
      } catch (caught) {
        // Aborted by a re-arm, or simply never picked.
        if (!isUserCancellation(caught)) setError(passkeyErrorMessage(caught));
      }
    },
    [conditionalLogin, finish],
  );

  return {
    status,
    email: lastEmail,
    error,
    startConditional: (email) => void startConditional(email),
  };
}
