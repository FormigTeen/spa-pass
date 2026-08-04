import { useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { core, ecom } from "../lib/gateway";
import {
  ACCESS_KEY_SIGN_IN,
  SEND_EMAIL_VERIFICATION,
  SIGN_OUT,
} from "../graphql/operations";
import {
  chatMessagesAtom,
  draftEmailAtom,
  loginStepAtom,
  mobileChatOpenAtom,
  sessionAtom,
  signedOutAtom,
  type Session,
} from "../state/atoms";
import { clearAuthCookies } from "../lib/session";
import { signOutFirebase } from "../lib/firebase";
import { fetchProfile, profileQueryKey, useProfile } from "./useProfile";

/** Email + verification code sign in, against the ecom module. */
export function useEmailCodeAuth() {
  const queryClient = useQueryClient();
  const setSession = useSetAtom(sessionAtom);
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

  useEffect(() => {
    if (signedOut || session || !profile?.email) return;
    setSession({
      email: profile.email,
      document: profile.document,
      via: "code",
    });
  }, [profile, session, signedOut, setSession]);
}

export function useSignIn() {
  const setSession = useSetAtom(sessionAtom);
  const setSignedOut = useSetAtom(signedOutAtom);

  return useCallback(
    (session: Session) => {
      setSignedOut(false);
      setSession(session);
    },
    [setSession, setSignedOut],
  );
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const signedInAs = useAtomValue(sessionAtom)?.email ?? "";
  const setSession = useSetAtom(sessionAtom);
  const setSignedOut = useSetAtom(signedOutAtom);
  const setLoginStep = useSetAtom(loginStepAtom);
  const setDraftEmail = useSetAtom(draftEmailAtom);
  const setMessages = useSetAtom(chatMessagesAtom);
  const setMobileChatOpen = useSetAtom(mobileChatOpenAtom);

  return useCallback(() => {
    // Only the gateway can end the session: its cookie is httpOnly and
    // host-only on its own domain, so neither script nor a page on a sibling
    // host can touch it. `signOut` expires it server-side.
    void core(SIGN_OUT).catch(() => undefined);
    // Firebase holds a session of its own, in IndexedDB rather than a cookie.
    void signOutFirebase();
    // Local belt and braces: any first-party, non-httpOnly auth cookie, and a
    // flag so the tab drops the session without waiting for the round trip.
    clearAuthCookies();
    setSignedOut(true);
    setSession(null);
    setLoginStep("email");
    // Carry the address into the form so the person is not made to retype it.
    setDraftEmail(signedInAs);
    setMessages([]);
    setMobileChatOpen(false);
    queryClient.clear();
  }, [
    queryClient,
    signedInAs,
    setSession,
    setSignedOut,
    setLoginStep,
    setDraftEmail,
    setMessages,
    setMobileChatOpen,
  ]);
}
