import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/* ── session ─────────────────────────────────────────────────── */

export type AuthMethod = "code" | "passkey";

export type Session = {
  email: string;
  document?: string | null;
  /** Firebase custom token — only returned by the passkey login. */
  token?: string | null;
  via: AuthMethod;
};

export const sessionAtom = atom<Session | null>(null);

export const isAuthenticatedAtom = atom((get) => get(sessionAtom) !== null);

/**
 * The gateway cookie is httpOnly and cross-site, so the browser cannot clear
 * it on sign out. This flag keeps the tab from silently restoring the session
 * (or re-prompting for a passkey) until the page is reloaded.
 */
export const signedOutAtom = atom(false);

/* ── login machine ───────────────────────────────────────────── */

export type LoginStep = "email" | "code";

export const loginStepAtom = atom<LoginStep>("email");

/** Email currently being typed / verified. */
export const draftEmailAtom = atom("");

/* ── persisted preferences ───────────────────────────────────── */

/** Last email that completed a sign in — prefills the form on return. */
export const lastEmailAtom = atomWithStorage<string>(
  "passkey-poc:last-email",
  "",
);

/**
 * Emails that enrolled a passkey **on this device**.
 *
 * This is deliberately not the same question the gateway answers.
 * `allowCredentials` tells you the *account* owns a credential somewhere — on
 * a laptop, say — while a phone that never enrolled has nothing to sign with.
 * Prompting on the account-level answer makes the OS say "no passkey
 * available", so only this local list may trigger a prompt.
 */
export const passkeyEmailsAtom = atomWithStorage<string[]>(
  "passkey-poc:passkey-emails",
  [],
);

/** Emails that declined the enrolment upsell — do not nag them again. */
export const enrolDismissedAtom = atomWithStorage<string[]>(
  "passkey-poc:enrol-dismissed",
  [],
);

/* ── chat ────────────────────────────────────────────────────── */

export type ChatRole = "user" | "agent";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
};

export const chatMessagesAtom = atom<ChatMessage[]>([]);

export const chatBusyAtom = atom(false);

export const mobileChatOpenAtom = atom(false);
