import type { ChatMessage, Session } from "../state/atoms";
import { sendInbotMessage } from "../lib/inbot";

export type AgentRequest = {
  message: string;
  history: ChatMessage[];
  session: Session | null;
  orderId: string;
  /** Called with the reply merged so far, as the agent streams it. */
  onText?: (text: string) => void;
};

export type AgentReply = {
  content: string;
};

/**
 * The single seam between the UI and the agent.
 *
 * Everything above this function (transcript, streaming placeholder, composer,
 * error handling) already works, so plugging in a real backend means replacing
 * this body — e.g. POST to the agent endpoint, or a GraphQL mutation on the
 * core module — and returning the reply text.
 */
export async function askAgent({
  message,
  session,
  orderId,
  onText,
}: AgentRequest): Promise<AgentReply> {
  if (!session?.email) {
    throw new Error("agent.session.required");
  }

  if (!orderId) {
    throw new Error("agent.order.required");
  }

  const content = await sendInbotMessage({
    email: session.email,
    orderId,
    message,
    onText,
  });

  return { content };
}
