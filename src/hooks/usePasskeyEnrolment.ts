import { useCallback, useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  deviceEnrolledAtom,
  enrolDismissedAtom,
  sessionAtom,
} from "../state/atoms";
import {
  isAlreadyRegistered,
  isUserCancellation,
  passkeyErrorMessage,
  supportsPasskey,
  usePasskey,
} from "./usePasskey";
import { useProfile } from "./useProfile";

export type EnrolmentStatus =
  | "checking"
  | "offer" // no key yet — the card is asking
  | "prompting" // the OS sheet is up
  | "enrolled"
  | "error"
  | "dismissed" // said no before, but can still enrol on demand
  | "hidden"; // unsupported, or not eligible to enrol at all

/**
 * After signing in, checks whether the account already has a passkey and
 * offers to create one when it does not. Enrolment needs the gateway session
 * cookie, so a passkey-only session cannot enrol.
 */
export function usePasskeyEnrolment() {
  const session = useAtomValue(sessionAtom);
  const { data: profile, isFetched } = useProfile();
  const [dismissed, setDismissed] = useAtom(enrolDismissedAtom);
  const [deviceEnrolled, setDeviceEnrolled] = useAtom(deviceEnrolledAtom);
  const { enrolPasskey, hasPasskey } = usePasskey();

  const [status, setStatus] = useState<EnrolmentStatus>("checking");
  const [error, setError] = useState("");
  const started = useRef(false);

  const email = session?.email ?? "";
  const canEnrol = Boolean(profile?.email);

  const remember = useCallback(
    () =>
      setDeviceEnrolled((current) =>
        current.includes(email) ? current : [...current, email],
      ),
    [email, setDeviceEnrolled],
  );

  const enrol = useCallback(async () => {
    setStatus("prompting");
    setError("");
    try {
      await enrolPasskey();
      remember();
      setStatus("enrolled");
    } catch (caught) {
      if (isUserCancellation(caught)) {
        setStatus("offer");
        setError("");
        return;
      }
      if (isAlreadyRegistered(caught)) {
        remember();
        setStatus("enrolled");
        setError("");
        return;
      }
      setStatus("error");
      setError(passkeyErrorMessage(caught));
    }
  }, [enrolPasskey, remember]);

  const dismiss = useCallback(() => {
    setDismissed((current) =>
      current.includes(email) ? current : [...current, email],
    );
    setStatus("dismissed");
  }, [email, setDismissed]);

  useEffect(() => {
    if (started.current || !session || !isFetched) return;

    if (!supportsPasskey() || !canEnrol) {
      setStatus("hidden");
      return;
    }

    started.current = true;

    if (deviceEnrolled.includes(email)) {
      setStatus("enrolled");
      return;
    }

    void (async () => {
      setStatus("checking");
      if (await hasPasskey(email)) {
        setStatus("enrolled");
        return;
      }
      setStatus(dismissed.includes(email) ? "dismissed" : "offer");
    })();
  }, [session, isFetched, canEnrol, dismissed, deviceEnrolled, email, hasPasskey]);

  return {
    status,
    error,
    enrol,
    dismiss,
    canEnrol,
    /** This device is known to hold a key — learned, never assumed. */
    deviceHasKey: deviceEnrolled.includes(email),
  };
}
