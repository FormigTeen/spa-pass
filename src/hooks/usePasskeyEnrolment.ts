import { useCallback, useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { enrolDismissedAtom, sessionAtom } from "../state/atoms";
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
        setStatus("enrolled");
        setError("");
        return;
      }
      setStatus("error");
      setError(passkeyErrorMessage(caught));
    }
  }, [enrolPasskey]);

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

    // Only the gateway is consulted. Whether *this* device holds a key is
    // unknowable, so the proactive ask is limited to accounts with no key at
    // all; every other device reaches enrolment through the profile card.
    void (async () => {
      setStatus("checking");
      const accountHasKey = await hasPasskey(email);
      if (accountHasKey) {
        setStatus("enrolled");
        return;
      }
      setStatus(dismissed.includes(email) ? "dismissed" : "offer");
    })();
  }, [session, isFetched, canEnrol, dismissed, email, hasPasskey]);

  return { status, error, enrol, dismiss, canEnrol };
}
