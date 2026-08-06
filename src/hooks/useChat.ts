import { useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { askAgent } from "../agent/agent";
import {
  chatBusyAtom,
  chatMessagesAtom,
  selectedOrderIdAtom,
  sessionAtom,
  type ChatMessage,
} from "../state/atoms";

let counter = 0;
const nextId = () => `m${++counter}`;

export function useChat() {
  const [messages, setMessages] = useAtom(chatMessagesAtom);
  const [busy, setBusy] = useAtom(chatBusyAtom);
  const session = useAtomValue(sessionAtom);
  const orderId = useAtomValue(selectedOrderIdAtom).trim();

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      const userMessage: ChatMessage = {
        id: nextId(),
        role: "user",
        content,
      };
      const placeholder: ChatMessage = {
        id: nextId(),
        role: "agent",
        content: "",
        pending: true,
      };

      const history = [...messages, userMessage];
      setMessages([...history, placeholder]);
      setBusy(true);

      try {
        const reply = await askAgent({
          message: content,
          history,
          session,
          orderId,
          // The agent streams, so the placeholder fills in as the text arrives.
          onText: (text) =>
            setMessages((current) =>
              current.map((item) =>
                item.id === placeholder.id ? { ...item, content: text } : item,
              ),
            ),
        });
        setMessages((current) =>
          current.map((item) =>
            item.id === placeholder.id
              ? { ...item, content: reply.content, pending: false }
              : item,
          ),
        );
      } catch {
        setMessages((current) =>
          current.map((item) =>
            item.id === placeholder.id
              ? {
                  ...item,
                  content: "Não consegui responder agora. Tente de novo.",
                  pending: false,
                }
              : item,
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [messages, busy, session, orderId, setMessages, setBusy],
  );

  return { messages, busy, send, orderId };
}
