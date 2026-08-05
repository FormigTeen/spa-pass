import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { sessionAtom } from "../state/atoms";
import {
  isAlreadyRegistered,
  isUserCancellation,
  passkeyDebugMessage,
  passkeyErrorMessage,
  supportsPasskey,
  usePasskey,
} from "./usePasskey";

export type EnrolmentStatus =
  | "checking"
  | "offer" // card is asking to register this device
  | "prompting" // the OS sheet is up
  | "enrolled"
  | "already-registered"
  | "error"
  | "hidden"; // unsupported, or not eligible to enrol at all

/**
 * After signing in with a code, offers to create a passkey for this device.
 * Enrolment needs the gateway session cookie, so a passkey-only session cannot
 * enrol.
 */
export function usePasskeyEnrolment() {
  const session = useAtomValue(sessionAtom);
  const { enrolPasskey } = usePasskey();

  const [status, setStatus] = useState<EnrolmentStatus>("checking");
  const [error, setError] = useState("");
  const started = useRef(false);

  const enrol = useCallback(async () => {
    setStatus("prompting");
    setError("");
    try {
      await enrolPasskey();
      setStatus("enrolled");
    } catch (caught) {
      if (isUserCancellation(caught)) {
        setStatus("offer");
        setError(passkeyDebugMessage(caught));
        return;
      }
      if (isAlreadyRegistered(caught)) {
        setStatus("already-registered");
        setError(passkeyDebugMessage(caught));
        return;
      }
      setStatus("error");
      setError(passkeyErrorMessage(caught));
    }
  }, [enrolPasskey]);

  useEffect(() => {
    if (started.current || !session) return;

    if (!supportsPasskey()) {
      setStatus("hidden");
      return;
    }

    started.current = true;
    setStatus("offer");
  }, [session]);

  return {
    status,
    error,
    enrol,
    canEnrol: Boolean(session),
  };
}
