import { useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ecom } from "../lib/gateway";
import {
  ACCESS_KEY_SIGN_IN,
  SEND_EMAIL_VERIFICATION,
} from "../graphql/operations";
import {
  chatMessagesAtom,
  draftEmailAtom,
  lastEmailAtom,
  loginStepAtom,
  mobileChatOpenAtom,
  sessionAtom,
  signedOutAtom,
  type Session,
} from "../state/atoms";
import { clearAuthCookies } from "../lib/session";
import { fetchProfile, profileQueryKey, useProfile } from "./useProfile";

/** Email + verification code sign in, against the ecom module. */
export function useEmailCodeAuth() {
  const queryClient = useQueryClient();
  const setSession = useSetAtom(sessionAtom);
  const setLastEmail = useSetAtom(lastEmailAtom);
  const setSignedOut = useSetAtom(signedOutAtom);

  const requestCode = useMutation({
    mutationFn: (email: string) =>
      ecom<{ sendEmailVerification: unknown }>(SEND_EMAIL_VERIFICATION, {
        email,
      }),
  });

  const confirmCode = useMutation({
    mutationFn: (input: { email: string; code: string }) =>
      ecom<{ accessKeySignIn: unknown }>(ACCESS_KEY_SIGN_IN, input),
    onSuccess: async (_data, { email }) => {
      setSignedOut(false);
      setLastEmail(email);

      // The cookie is set now; read the profile back for the user card.
      const profile = await queryClient
        .fetchQuery({ queryKey: profileQueryKey, queryFn: fetchProfile })
        .catch(() => null);

      setSession({
        email: profile?.email || email,
        document: profile?.document ?? null,
        via: "code",
      });
    },
  });

  return { requestCode, confirmCode };
}

/**
 * Restores a session from the gateway cookie on load, so a returning user who
 * is still signed in on the gateway skips the login form entirely.
 */
export function useSessionBootstrap() {
  const { data: profile } = useProfile();
  const [session, setSession] = useAtom(sessionAtom);
  const signedOut = useAtomValue(signedOutAtom);
  const setLastEmail = useSetAtom(lastEmailAtom);

  useEffect(() => {
    if (signedOut || session || !profile?.email) return;
    setSession({
      email: profile.email,
      document: profile.document,
      via: "code",
    });
    setLastEmail(profile.email);
  }, [profile, session, signedOut, setSession, setLastEmail]);
}

export function useSignIn() {
  const setSession = useSetAtom(sessionAtom);
  const setLastEmail = useSetAtom(lastEmailAtom);
  const setSignedOut = useSetAtom(signedOutAtom);

  return useCallback(
    (session: Session) => {
      setSignedOut(false);
      setSession(session);
      setLastEmail(session.email);
    },
    [setSession, setLastEmail, setSignedOut],
  );
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const setSession = useSetAtom(sessionAtom);
  const setSignedOut = useSetAtom(signedOutAtom);
  const setLoginStep = useSetAtom(loginStepAtom);
  const setDraftEmail = useSetAtom(draftEmailAtom);
  const setMessages = useSetAtom(chatMessagesAtom);
  const setMobileChatOpen = useSetAtom(mobileChatOpenAtom);
  const lastEmail = useAtomValue(lastEmailAtom);

  return useCallback(() => {
    // Sign out is the auth cookie going away. On localhost the cookie belongs
    // to another origin and is out of reach, so `signedOut` guarantees the tab
    // drops the session either way.
    clearAuthCookies();
    setSignedOut(true);
    setSession(null);
    setLoginStep("email");
    setDraftEmail(lastEmail);
    setMessages([]);
    setMobileChatOpen(false);
    queryClient.clear();
  }, [
    queryClient,
    lastEmail,
    setSession,
    setSignedOut,
    setLoginStep,
    setDraftEmail,
    setMessages,
    setMobileChatOpen,
  ]);
}
