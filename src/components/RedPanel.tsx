import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { Sparkles } from "lucide-react";
import { isAuthenticatedAtom } from "../state/atoms";
import { useChat } from "../hooks/useChat";
import { ChatComposer } from "./ChatComposer";
import { ChatTranscript } from "./ChatTranscript";

const GREETING =
  "Olá! Estou aqui para te acompanhar nessa jornada. Quero muito entender melhor o que você procura e como posso ajudar.";

const READY =
  "Que bom ter você aqui! Me conta, o que te trouxe até aqui hoje?";

type RedPanelProps = {
  showComposer?: boolean;
  autoFocusComposer?: boolean;
};

export function RedPanel({
  showComposer = true,
  autoFocusComposer = false,
}: RedPanelProps) {
  const authenticated = useAtomValue(isAuthenticatedAtom);
  const { messages, busy, send } = useChat();

  const hasTranscript = authenticated && messages.length > 0;

  return (
    <div className="h-full w-full bg-brand flex flex-col px-6 md:px-8 lg:px-10">
      {hasTranscript ? (
        <div className="flex-1 min-h-0 pt-8">
          <ChatTranscript messages={messages} />
        </div>
      ) : (
        <div className="flex-1 flex items-center">
          <motion.div
            key={authenticated ? "ready" : "greeting"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Sparkles className="w-6 h-6 text-white/60 mb-5" aria-hidden />
            <p className="text-white/95 text-lg md:text-xl leading-relaxed font-light">
              {authenticated ? READY : GREETING}
            </p>
          </motion.div>
        </div>
      )}

      {authenticated && showComposer && (
        <div className="pb-8 pt-4">
          <ChatComposer
            onSend={(message) => void send(message)}
            disabled={busy}
            autoFocus={autoFocusComposer}
          />
        </div>
      )}
    </div>
  );
}
