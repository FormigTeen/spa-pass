import { useCallback, useEffect, useRef, useState } from "react";
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
  const { enrolPasskey, hasPasskey } = usePasskey();

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
    if (started.current || !session || unsupported) {
      if (unsupported) setStatus("hidden");
      return;
    }

    if (!supportsPasskey()) {
      setStatus("hidden");
      return;
    }

    started.current = true;
    void supportsPlatformAuthenticator().then((available) => {
      if (!available) {
        setUnsupported(true);
        setStatus("hidden");
        return;
      }

      void hasPasskey(session.email).then((registered) => {
        setStatus(registered ? "already-registered" : "offer");
      });
    });
  }, [hasPasskey, session, setUnsupported, unsupported]);

  return {
    status,
    error,
    enrol,
    canEnrol: Boolean(session),
  };
}
