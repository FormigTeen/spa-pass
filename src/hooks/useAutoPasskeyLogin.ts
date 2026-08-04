import { useCallback, useState } from "react";
import { useAtomValue } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { lastEmailAtom } from "../state/atoms";
import {
  isNoCredentials,
  isUserCancellation,
  passkeyErrorMessage,
  supportsPasskey,
  usePasskey,
  type PasskeyToken,
} from "./usePasskey";
import { completeVtexFirebaseSession } from "../lib/vtexFirebaseSession";
import { profileQueryKey } from "./useProfile";

export type PasskeyGateStatus = "idle" | "prompting" | "linking" | "failed";

export type AttemptOutcome = "signed-in" | "no-credentials" | "failed";

export type PasskeyGate = {
  status: PasskeyGateStatus;
  email: string;
  error: string;
  /** Authenticate with the key registered for this address. */
  attempt: (email: string) => Promise<AttemptOutcome>;
};

export function useAutoPasskeyLogin(): PasskeyGate {
  const lastEmail = useAtomValue(lastEmailAtom);
  const { loginWithPasskey } = usePasskey();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<PasskeyGateStatus>("idle");
  const [error, setError] = useState("");

  const finish = useCallback(
    async (token: PasskeyToken) => {
      setStatus("linking");
      await completeVtexFirebaseSession(token.token);
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      setStatus("idle");
    },
    [queryClient],
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

  return { status, email: lastEmail, error, attempt };
}
