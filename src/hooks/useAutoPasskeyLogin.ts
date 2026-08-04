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
  /** Checks whether the account has any passkey registered server-side. */
  hasPasskey: (email: string) => Promise<boolean>;
  /** Authenticate with an explicit WebAuthn prompt. */
  attempt: (email: string) => Promise<AttemptOutcome>;
};

export function useAutoPasskeyLogin(): PasskeyGate {
  const { loginWithPasskey, hasPasskey } = usePasskey();
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

  const checkPasskey = useCallback(
    (email: string) => {
      if (!email || !supportsPasskey()) return Promise.resolve(false);
      return hasPasskey(email);
    },
    [hasPasskey],
  );

  return { status, error, hasPasskey: checkPasskey, attempt };
}
