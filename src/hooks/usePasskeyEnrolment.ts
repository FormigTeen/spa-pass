import { useCallback, useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  enrolDismissedAtom,
  passkeyEmailsAtom,
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
  const { enrolPasskey } = usePasskey();

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
      // A synced passkey the account already owns: nothing was created here,
      // so this device must NOT join the enrolled list — that list is what
      // authorises the automatic prompt, and prompting a device that holds no
      // credential is exactly how "no passkey available" appears. Silence the
      // question instead.
      if (isAlreadyRegistered(caught)) {
        setDismissed((current) =>
          current.includes(email) ? current : [...current, email],
        );
        setStatus("enrolled");
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

    // Enrolment is per device, not per account. The gateway would say "yes,
    // there is a key" for a credential sitting on the user's laptop, which
    // would leave a phone with no way to enrol one of its own.
    if (passkeyEmails.includes(email)) {
      setStatus("enrolled");
      return;
    }
    setStatus(dismissed.includes(email) ? "dismissed" : "offer");
    // `passkeyEmails` is read as a hint only; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isFetched, canEnrol, dismissed, email, passkeyEmails]);

  return { status, error, enrol, dismiss, canEnrol };
}
