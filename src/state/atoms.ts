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
 * Emails whose key this device can already reach.
 *
 * Learned, never guessed: WebAuthn will not say up front what a device holds,
 * so this is only written after an enrolment either succeeds here or is
 * refused via `excludeCredentials` — the one moment the browser reveals it.
 *
 * Safe where the earlier "device has a key" flag was not, and the difference
 * is the invariant to preserve: this may only ever **hide the enrolment
 * offer**. It must never gate a login prompt. Being wrong then costs a card
 * that did not appear, instead of an OS sheet failing with "no passkey
 * available" on a device holding nothing.
 */
export const deviceEnrolledAtom = atomWithStorage<string[]>(
  "passkey-poc:device-enrolled",
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
