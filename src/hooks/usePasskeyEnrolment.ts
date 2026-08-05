import { useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  passkeyRegistrationUnsupportedAtom,
  sessionAtom,
} from "../state/atoms";
import {
  isAlreadyRegistered,
  isUserCancellation,
  passkeyDebugMessage,
  passkeyErrorMessage,
  supportsPlatformAuthenticator,
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
  const [unsupported, setUnsupported] = useAtom(
    passkeyRegistrationUnsupportedAtom,
  );
  const { enrolPasskey } = usePasskey();

  const [status, setStatus] = useState<EnrolmentStatus>("hidden");
  const [error, setError] = useState("");

  const enrol = useCallback(async () => {
    setStatus("prompting");
    setError("");
    try {
      await enrolPasskey();
      setStatus("enrolled");
    } catch (caught) {
      if (caught instanceof Error && caught.name === "NotReadableError") {
        setUnsupported(true);
        setStatus("hidden");
        setError("");
        return;
      }
      if (isUserCancellation(caught)) {
        setStatus("offer");
        setError(passkeyDebugMessage(caught));
        return;
      }
      if (isAlreadyRegistered(caught)) {
        setStatus("already-registered");
        setError("");
        return;
      }
      setStatus("error");
      setError(passkeyErrorMessage(caught));
    }
  }, [enrolPasskey, setUnsupported]);

  useEffect(() => {
    let cancelled = false;

    setError("");
    setStatus("hidden");

    if (!session || session.via !== "code" || unsupported) {
      return;
    }

    if (!supportsPasskey()) {
      return;
    }

    setStatus("checking");

    void supportsPlatformAuthenticator().then((available) => {
      if (cancelled) return;
      if (!available) {
        setUnsupported(true);
        setStatus("hidden");
        return;
      }

      setStatus("offer");
    });

    return () => {
      cancelled = true;
    };
  }, [session, setUnsupported, unsupported]);

  return {
    status,
    error,
    enrol,
    canEnrol: status === "offer" || status === "error",
  };
}
