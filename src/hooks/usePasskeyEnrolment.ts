import { useCallback, useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  enrolDismissedAtom,
  passkeyEmailsAtom,
  sessionAtom,
} from "../state/atoms";
import {
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
 * Requirement: once signed in, if the account has no passkey on this device we
 * *ask* whether to enrol. The OS sheet only opens after the user says yes —
 * an unprompted biometric sheet reads as something going wrong.
 *
 * Enrolment is only possible on a cookie session: `passkeyRegisterOptions`
 * resolves the user from the gateway session, so a passkey-only session (which
 * returns a Firebase token and sets no cookie) cannot enrol.
 */
export function usePasskeyEnrolment() {
  const session = useAtomValue(sessionAtom);
  const { data: profile, isFetched } = useProfile();
  const [passkeyEmails, setPasskeyEmails] = useAtom(passkeyEmailsAtom);
  const [dismissed, setDismissed] = useAtom(enrolDismissedAtom);
  const { hasPasskey, enrolPasskey } = usePasskey();

  const [status, setStatus] = useState<EnrolmentStatus>("checking");
  const [error, setError] = useState("");
  const started = useRef(false);

  const email = session?.email ?? "";
  const canEnrol = Boolean(profile?.email);

  const enrol = useCallback(async () => {
    setStatus("prompting");
    setError("");
    try {
      await enrolPasskey();
      setPasskeyEmails((current) =>
        current.includes(email) ? current : [...current, email],
      );
      setStatus("enrolled");
    } catch (caught) {
      if (isUserCancellation(caught)) {
        setStatus("offer");
        setError("");
        return;
      }
      setStatus("error");
      setError(passkeyErrorMessage(caught));
    }
  }, [enrolPasskey, email, setPasskeyEmails]);

  const dismiss = useCallback(() => {
    setDismissed((current) =>
      current.includes(email) ? current : [...current, email],
    );
    setStatus("dismissed");
  }, [email, setDismissed]);

  useEffect(() => {
    if (started.current || !session || !isFetched) return;

    // `hidden` is only for "enrolment is impossible here". Declining is a
    // separate state, so the profile card can still offer a way back.
    if (!supportsPasskey() || !canEnrol) {
      setStatus("hidden");
      return;
    }

    started.current = true;

    (async () => {
      setStatus("checking");
      // Trust the local hint first so the card does not flash for users who
      // already enrolled, then confirm with the gateway.
      if (passkeyEmails.includes(email)) setStatus("enrolled");

      const owns = await hasPasskey(email);
      if (owns) {
        setStatus("enrolled");
        return;
      }
      setStatus(dismissed.includes(email) ? "dismissed" : "offer");
    })();
    // `passkeyEmails` is read as a hint only; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isFetched, canEnrol, dismissed, email, hasPasskey]);

  return { status, error, enrol, dismiss, canEnrol };
}
