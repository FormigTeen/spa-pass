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

/** Device/browser failed local passkey creation during this tab session. */
export const passkeyRegistrationUnsupportedAtom = atom(false);

/* ── login machine ───────────────────────────────────────────── */

export type LoginStep = "email" | "code";

export const loginStepAtom = atom<LoginStep>("email");

/** Email currently being typed / verified. */
export const draftEmailAtom = atom("");

/* ── navigation ──────────────────────────────────────────────── */

/**
 * Which screen the signed-in user is on. Persisted, so a reload keeps you on
 * the agent you were testing.
 */
export type View = "start" | "refund";

export const viewAtom = atomWithStorage<View>("poc:view", "start");

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

/**
 * The home screen's chat. Kept apart from `chatMessagesAtom` so the idle
 * small talk never lands in the transcript of a real order.
 */
export const idleChatMessagesAtom = atom<ChatMessage[]>([]);

export const idleChatBusyAtom = atom(false);

export const mobileChatOpenAtom = atom(false);

/** True while an order's transcript is being fetched back from the session. */
export const chatRestoringAtom = atom(false);

/**
 * Bumped whenever something wants the composer focused. A counter, not a flag,
 * so picking another order with the chat already open focuses it again.
 */
export const composerFocusAtom = atom(0);

export const selectedOrderIdAtom = atom("");
