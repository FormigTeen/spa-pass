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
  | "offer" // no key yet — the upsell card is showing
  | "prompting" // the OS sheet is up
  | "enrolled"
  | "error"
  | "hidden"; // unsupported, dismissed, or not eligible

/** Give the user a moment to read the card before the OS sheet takes over. */
const AUTO_PROMPT_DELAY = 1400;

/**
 * Requirement: once signed in, if the account has no passkey on this device we
 * offer — and automatically start — enrolment.
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
  const autoPrompted = useRef(false);

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
    setStatus("hidden");
  }, [email, setDismissed]);

  useEffect(() => {
    if (started.current || !session || !isFetched) return;

    if (!supportsPasskey() || !canEnrol || dismissed.includes(email)) {
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
      setStatus("offer");
    })();
    // `passkeyEmails` is read as a hint only; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isFetched, canEnrol, dismissed, email, hasPasskey]);

  // Auto-start enrolment shortly after the offer appears — but only once, so
  // cancelling the sheet leaves the card in place instead of re-prompting.
  useEffect(() => {
    if (status !== "offer" || autoPrompted.current) return;
    autoPrompted.current = true;
    const timer = setTimeout(() => void enrol(), AUTO_PROMPT_DELAY);
    return () => clearTimeout(timer);
  }, [status, enrol]);

  return { status, error, enrol, dismiss, canEnrol };
}
