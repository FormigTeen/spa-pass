import { atom } from "jotai";

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

/** Device/browser failed local passkey creation during this tab session. */
export const passkeyRegistrationUnsupportedAtom = atom(false);

/* ── login machine ───────────────────────────────────────────── */

export type LoginStep = "email" | "code";

export const loginStepAtom = atom<LoginStep>("email");

/** Email currently being typed / verified. */
export const draftEmailAtom = atom("");

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
