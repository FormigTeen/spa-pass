import type { ChatMessage, Session } from "../state/atoms";

export type AgentRequest = {
  message: string;
  history: ChatMessage[];
  session: Session | null;
};

export type AgentReply = {
  content: string;
};

const CANNED = [
  "Interessante! Me conta mais sobre isso.",
  "Entendi! E o que mais você gostaria de explorar?",
  "Fascinante! Isso abre várias possibilidades.",
  "Perfeito, estou anotando tudo. O que mais?",
  "Adorei saber disso! Continue me contando.",
  "Muito bom! Vamos seguir por esse caminho.",
];

/**
 * The single seam between the UI and the agent.
 *
 * Everything above this function (transcript, streaming placeholder, composer,
 * error handling) already works, so plugging in a real backend means replacing
 * this body — e.g. POST to the agent endpoint, or a GraphQL mutation on the
 * core module — and returning the reply text.
 */
export async function askAgent({ message }: AgentRequest): Promise<AgentReply> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const index = message.length % CANNED.length;
  return { content: CANNED[index] };
}
