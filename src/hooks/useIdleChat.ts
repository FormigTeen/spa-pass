import { useCallback } from "react";
import { useAtom } from "jotai";
import { idleChatBusyAtom, idleChatMessagesAtom } from "../state/atoms";

/**
 * The home screen has no agent behind it — this one is off duty on purpose, so
 * it says so instead of pretending to answer.
 */
const REPLIES = [
  "Estou de folga agora. Meu turno aqui é só de conversa fiada.",
  "Esse agente está desativado no momento. Nada acontece por aqui.",
  "Zzz... Fui desligado para economizar energia. Tente um agente ativo.",
  "Ainda estou descansando. Quem trabalha hoje é o agente de troca e devolução.",
  "Sem expediente por aqui. Sou só o comitê de boas-vindas.",
  "Estou em modo de descanso. Escolha um agente de verdade para testar.",
];

let counter = 0;
const nextId = () => `i${++counter}`;

const pickReply = (previous: string) => {
  const options = REPLIES.filter((reply) => reply !== previous);
  return options[Math.floor(Math.random() * options.length)];
};

export function useIdleChat() {
  const [messages, setMessages] = useAtom(idleChatMessagesAtom);
  const [busy, setBusy] = useAtom(idleChatBusyAtom);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      const placeholderId = nextId();
      const lastReply =
        [...messages].reverse().find((item) => item.role === "agent")
          ?.content ?? "";

      setMessages((current) => [
        ...current,
        { id: nextId(), role: "user", content },
        { id: placeholderId, role: "agent", content: "", pending: true },
      ]);
      setBusy(true);

      // A beat of latency, so the canned reply still reads as a reply.
      await new Promise((resolve) => setTimeout(resolve, 700));

      setMessages((current) =>
        current.map((item) =>
          item.id === placeholderId
            ? { ...item, content: pickReply(lastReply), pending: false }
            : item,
        ),
      );
      setBusy(false);
    },
    [messages, busy, setMessages, setBusy],
  );

  return { messages, busy, send } as const;
}

export const IDLE_GREETING =
  "Oi! Sou o agente da tela inicial e, sinceramente, estou de folga. Escolha um agente ativo para ver o sistema trabalhando.";
