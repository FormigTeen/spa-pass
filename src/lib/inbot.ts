import { API_KEY, core } from "./gateway";
import {
  INBOT_REQUEST_REFUND_ORDER,
  INBOT_RESTORE_SESSION,
} from "../graphql/operations";
import type { ChatMessage } from "../state/atoms";

/** A JSON Schema property. `const` means the server already resolved it. */
type SchemaProperty = {
  type?: string;
  const?: unknown;
  description?: string;
};

type BodySchema = {
  required?: string[];
  properties?: Record<string, SchemaProperty>;
};

/** The plan of an HTTP request, as `gq_example` hands it over. */
export type InbotRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  bodySchema: BodySchema;
  stream: boolean;
};

export type InbotSession = {
  uuid: string;
  request: InbotRequest;
};

export type InbotHistory = InbotSession & {
  agent: string;
  state: Record<string, unknown>;
  events: InbotMessageChunk[];
  updatedAt: string;
};

type InbotMessageChunk = {
  author?: string;
  partial?: boolean;
  content?: {
    role?: string;
    parts?: Array<{ text?: string }>;
  };
  actions?: {
    stateDelta?: Record<string, unknown>;
  };
};

const sessionByKey = new Map<string, InbotSession>();

/**
 * The session is opened through the gateway's GraphQL, which resolves the
 * caller's identity from the auth cookie — the email never comes from here.
 */
const getOrCreateSession = async (email: string, orderId: string) => {
  const sessionKey = `${email}:${orderId}`;
  const current = sessionByKey.get(sessionKey);
  if (current) return current;

  const { inbotRequestRefundOrder } = await core<{
    inbotRequestRefundOrder: InbotSession;
  }>(INBOT_REQUEST_REFUND_ORDER, { orderId });

  if (!inbotRequestRefundOrder?.uuid) {
    throw new Error("inbot.session.invalid");
  }

  sessionByKey.set(sessionKey, inbotRequestRefundOrder);
  return inbotRequestRefundOrder;
};

/**
 * Builds the request body out of the schema: every property the server pinned
 * with `const` keeps that value, and the caller fills in the rest.
 */
const bodyFromSchema = (
  schema: BodySchema,
  values: Record<string, unknown>,
) => {
  const resolved = Object.entries(schema.properties ?? {})
    .filter(([, property]) => "const" in property)
    .map(([name, property]) => [name, property.const] as const);

  return {
    ...Object.fromEntries(resolved),
    ...values,
  };
};

const readError = async (response: Response) => {
  const body = await response.text().catch(() => "");
  return body || `${response.status} ${response.statusText}`;
};

const textFromJson = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";

  const chunk = value as InbotMessageChunk;
  if (chunk.content?.role === "user") return "";

  const partsText = chunk.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("");

  if (partsText) return partsText;

  const stateDelta = chunk.actions?.stateDelta;
  const maybeMessages = stateDelta?.messages;
  if (Array.isArray(maybeMessages)) {
    return maybeMessages
      .map((message) =>
        typeof message === "object" && message !== null && "content" in message
          ? String(message.content ?? "")
          : "",
      )
      .filter(Boolean)
      .join("\n");
  }

  return "";
};

const overlapLength = (left: string, right: string) => {
  const max = Math.min(left.length, right.length);

  for (let size = max; size > 0; size -= 1) {
    if (left.endsWith(right.slice(0, size))) return size;
  }

  return 0;
};

const mergeTextChunk = (current: string, chunk: string) => {
  if (!current) return chunk;
  if (!chunk) return current;
  if (chunk === current || current.endsWith(chunk) || current.includes(chunk)) {
    return current;
  }
  if (chunk.startsWith(current)) return chunk;

  const overlap = overlapLength(current, chunk);
  return `${current}${chunk.slice(overlap)}`;
};

const textFromFrame = (frame: string) => {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]");

  return data
    .map((line) => {
      try {
        return textFromJson(JSON.parse(line));
      } catch {
        return line;
      }
    })
    .filter(Boolean)
    .reduce(mergeTextChunk, "");
};

/**
 * Consumes the response as it arrives, emitting the text merged so far on every
 * completed event. Falls back to reading the whole body when the runtime gives
 * no readable stream.
 */
const readStream = async (
  response: Response,
  onText?: (text: string) => void,
) => {
  const reader = response.body?.getReader();
  if (!reader) return textFromFrame(await response.text());

  const decoder = new TextDecoder();
  let pending = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });

    const frames = pending.split(/\n\n+/);
    // The tail may be an event still being written, so it waits for more bytes.
    pending = frames.pop() ?? "";

    for (const frame of frames) {
      const merged = mergeTextChunk(text, textFromFrame(frame));
      if (merged === text) continue;
      text = merged;
      onText?.(text);
    }
  }

  const tail = mergeTextChunk(text, textFromFrame(pending));
  if (tail !== text) {
    text = tail;
    onText?.(text);
  }

  return text;
};

export const inbotMessageForOrder = (orderId: string) =>
  `Realizar Troca/Devolução para ${orderId} da Casa&Vídeo`;

export const prepareInbotSession = async ({
  email,
  orderId,
}: {
  email: string;
  orderId: string;
}) => getOrCreateSession(email, orderId);

export const restoreInbotSession = async (session: string) => {
  const { inbotRestoreSession } = await core<{
    inbotRestoreSession: InbotHistory;
  }>(INBOT_RESTORE_SESSION, { session });

  return inbotRestoreSession;
};

const textOf = (event: InbotMessageChunk) =>
  (event.content?.parts ?? [])
    .map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();

let historyCounter = 0;

/**
 * Turns stored events into a transcript. Most of them are workflow
 * bookkeeping — node outputs, tool calls and their responses — and only the
 * turns that carry text belong on screen.
 */
export const toTranscript = (events: InbotMessageChunk[]): ChatMessage[] =>
  events.reduce<ChatMessage[]>((messages, event) => {
    const role = event.content?.role;
    if ((role !== "user" && role !== "model") || event.partial) return messages;

    const content = textOf(event);
    if (!content) return messages;

    const chatRole = role === "user" ? "user" : "agent";
    const previous = messages[messages.length - 1];
    // The opening turn is recorded twice: once as the user event, once by the
    // node that received it.
    if (previous?.role === chatRole && previous.content === content)
      return messages;

    messages.push({ id: `h${++historyCounter}`, role: chatRole, content });
    return messages;
  }, []);

/**
 * The transcript of an order's session. Reopening the same order lands on the
 * same session — the key is the order — so this survives a reload.
 */
export const restoreInbotTranscript = async ({
  email,
  orderId,
}: {
  email: string;
  orderId: string;
}) => {
  const { uuid } = await getOrCreateSession(email, orderId);
  const history = await restoreInbotSession(uuid);
  return toTranscript(history.events ?? []);
};

export const sendInbotMessage = async ({
  email,
  orderId,
  message,
  onText,
}: {
  email: string;
  orderId: string;
  message: string;
  onText?: (text: string) => void;
}) => {
  const { request } = await getOrCreateSession(email, orderId);

  const response = await fetch(request.url, {
    method: request.method,
    // The gateway credential is the client's own — it never comes in `request`.
    headers: { ...request.headers, "X-Api-Key": API_KEY },
    // No cookies: this endpoint authenticates by api key, the session uuid
    // carries the identity, and it answers `Allow-Origin: *`, which a browser
    // refuses to pair with credentials.
    body: JSON.stringify(bodyFromSchema(request.bodySchema, { message })),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const content = request.stream
    ? (await readStream(response, onText)).trim()
    : textFromFrame(await response.text()).trim();

  return content || "Recebi a resposta do agente, mas ela veio sem texto.";
};
