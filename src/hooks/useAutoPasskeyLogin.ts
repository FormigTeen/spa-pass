import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import {
  isNoCredentials,
  isUserCancellation,
  passkeyErrorMessage,
  supportsPasskey,
  usePasskey,
  type PasskeyToken,
} from "./usePasskey";
import { completeVtexFirebaseSession } from "../lib/vtexFirebaseSession";
import { fetchProfile, profileQueryKey } from "./useProfile";
import { signedOutAtom } from "../state/atoms";

export type PasskeyGateStatus = "idle" | "prompting" | "linking" | "failed";

export type AttemptOutcome = "signed-in" | "no-credentials" | "failed";

export type PasskeyGate = {
  status: PasskeyGateStatus;
  error: string;
  /** Authenticate with an explicit WebAuthn prompt. */
  attempt: (email: string) => Promise<AttemptOutcome>;
  /** Starts WebAuthn conditional UI so passkeys appear in browser autofill. */
  startAutofill: (email: string) => Promise<void>;
  cancelAutofill: () => void;
};

export function useAutoPasskeyLogin(): PasskeyGate {
  const { loginWithPasskey, loginWithPasskeyAutofill, cancelPasskey } =
    usePasskey();
  const queryClient = useQueryClient();
  const setSignedOut = useSetAtom(signedOutAtom);

  const [status, setStatus] = useState<PasskeyGateStatus>("idle");
  const [error, setError] = useState("");

  const finish = useCallback(
    async (token: PasskeyToken) => {
      setStatus("linking");
      await completeVtexFirebaseSession(token.token);

      // Signing in again lifts the flag a previous sign out left behind. It
      // disables the profile query, so an invalidate would refetch nothing.
      setSignedOut(false);
      await queryClient.fetchQuery({
        queryKey: profileQueryKey,
        queryFn: fetchProfile,
      });

      setStatus("idle");
    },
    [queryClient, setSignedOut],
  );

  const attempt = useCallback(
    async (email: string): Promise<AttemptOutcome> => {
      if (!email || !supportsPasskey()) return "no-credentials";

      setStatus("prompting");
      setError("");
      try {
        const token = await loginWithPasskey(email);
        await finish(token);
        return "signed-in";
      } catch (caught) {
        setStatus("idle");

        if (isNoCredentials(caught)) {
          setError("");
          return "no-credentials";
        }
        setError(isUserCancellation(caught) ? "" : passkeyErrorMessage(caught));
        return "failed";
      }
    },
    [loginWithPasskey, finish],
  );

  const startAutofill = useCallback(
    async (email: string) => {
      if (!email || !supportsPasskey()) return;

      setStatus("prompting");
      setError("");
      try {
        const token = await loginWithPasskeyAutofill(email);
        await finish(token);
      } catch (caught) {
        setStatus("idle");

        if (isNoCredentials(caught) || isUserCancellation(caught)) {
          setError("");
          return;
        }

        const message = passkeyErrorMessage(caught);
        if (/autofill|conditional ui/i.test(message)) {
          setError("");
          return;
        }

        setError(message);
      }
    },
    [loginWithPasskeyAutofill, finish],
  );

  const cancelAutofill = useCallback(() => {
    cancelPasskey();
    setStatus("idle");
  }, [cancelPasskey]);

  return { status, error, attempt, startAutofill, cancelAutofill };
}
