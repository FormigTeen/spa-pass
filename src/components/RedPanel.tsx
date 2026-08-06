import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { History, Lock, Moon, Sparkles } from "lucide-react";
import {
  chatRestoringAtom,
  composerFocusAtom,
  isAuthenticatedAtom,
  viewAtom,
} from "../state/atoms";
import { useChat } from "../hooks/useChat";
import { IDLE_GREETING, useIdleChat } from "../hooks/useIdleChat";
import { ChatComposer } from "./ChatComposer";
import { ChatTranscript } from "./ChatTranscript";

const GREETING =
  "Olá! Estou aqui para te acompanhar nessa jornada. Quero muito entender melhor o que você procura e como posso ajudar.";

const LOCKED = "Escolha um pedido ao lado para liberar a conversa.";

const RESTORING = "Retomando a conversa deste pedido...";

type RedPanelProps = {
  showComposer?: boolean;
  autoFocusComposer?: boolean;
};

export function RedPanel({
  showComposer = true,
  autoFocusComposer = false,
}: RedPanelProps) {
  const authenticated = useAtomValue(isAuthenticatedAtom);
  const view = useAtomValue(viewAtom);
  const focusSignal = useAtomValue(composerFocusAtom);
  const restoring = useAtomValue(chatRestoringAtom);
  const agent = useChat();
  const idle = useIdleChat();

  const onOrders = view === "refund";
  const unlocked = Boolean(agent.orderId);

  // The home screen talks to the off-duty agent; the orders screen to the real
  // one, and only once a pedido is picked.
  const chat = onOrders ? agent : idle;
  const hasTranscript = authenticated && chat.messages.length > 0;

  return (
    <div className="h-full w-full bg-brand flex flex-col px-6 md:px-8 lg:px-10">
      {hasTranscript ? (
        <motion.div
          // The thread arrives whole when restored, so the container carries
          // the entrance instead of each message animating on its own.
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 min-h-0 pt-[calc(1.25rem+env(safe-area-inset-top))] md:pt-8"
        >
          <ChatTranscript messages={chat.messages} />
        </motion.div>
      ) : (
        <div className="flex-1 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={
                !authenticated
                  ? "greeting"
                  : !onOrders
                    ? "idle"
                    : restoring
                      ? "restoring"
                      : unlocked
                        ? "unlocked"
                        : "locked"
              }
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Idle
                authenticated={authenticated}
                onOrders={onOrders}
                unlocked={unlocked}
                restoring={restoring}
                orderId={agent.orderId}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {authenticated && showComposer && (
        <div className="pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <ChatComposer
            onSend={(message) => void chat.send(message)}
            disabled={chat.busy || (onOrders && !unlocked)}
            autoFocus={autoFocusComposer}
            focusSignal={focusSignal}
            placeholder={
              !onOrders
                ? "Diga oi para o agente de folga"
                : unlocked
                  ? "Descreva o que você quer resolver"
                  : "Escolha um pedido primeiro"
            }
          />
        </div>
      )}
    </div>
  );
}

function Idle({
  authenticated,
  onOrders,
  unlocked,
  restoring,
  orderId,
}: {
  authenticated: boolean;
  onOrders: boolean;
  unlocked: boolean;
  restoring: boolean;
  orderId: string;
}) {
  if (!authenticated) {
    return (
      <>
        <Sparkles className="w-6 h-6 text-cream/50 mb-5" aria-hidden />
        <p className="text-cream/95 text-lg md:text-xl leading-relaxed font-light">
          {GREETING}
        </p>
      </>
    );
  }

  if (!onOrders) {
    return (
      <>
        <Moon className="w-6 h-6 text-cream/50 mb-5" aria-hidden />
        <p className="text-cream/95 text-lg md:text-xl leading-relaxed font-light">
          {IDLE_GREETING}
        </p>
      </>
    );
  }

  // Restoring comes before the unlock note: an order with history should land
  // on its thread, not flash a celebration first.
  if (restoring) {
    return (
      <>
        <History className="w-9 h-9 text-cream/40 mb-5" aria-hidden />
        <p className="text-cream/60 text-lg md:text-xl leading-relaxed font-light">
          {RESTORING}
        </p>
        <Sweep />
      </>
    );
  }

  if (!unlocked) {
    return (
      <>
        <Lock className="w-9 h-9 text-cream/40 mb-5" aria-hidden />
        <p className="text-cream/60 text-lg md:text-xl leading-relaxed font-light">
          {LOCKED}
        </p>
        <Sweep />
      </>
    );
  }

  return <Unlocked orderId={orderId} />;
}

/**
 * A bar crossing the track, on repeat. Says this side is waiting on something
 * rather than stuck. The track is 3x the bar's width, hence the 300% travel.
 */
function Sweep() {
  return (
    <div className="mt-6 h-px w-full max-w-xs overflow-hidden rounded-full bg-cream/15">
      <motion.span
        className="block h-full w-1/3 rounded-full bg-cream/70"
        initial={{ x: "-100%" }}
        animate={{ x: "300%" }}
        transition={{
          duration: 1.3,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 0.7,
        }}
        aria-hidden
      />
    </div>
  );
}

/**
 * The moment the chat opens up. Selecting an order is the only thing that
 * unlocks this side, so it announces itself rather than just changing state.
 */
function Unlocked({ orderId }: { orderId: string }) {
  const words = "Agente liberado. Pode conversar.".split(" ");

  return (
    <div>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative mb-5 w-fit"
      >
        {/* One pulse outward, like something switching on. */}
        <motion.span
          initial={{ scale: 1, opacity: 0.55 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-cream"
          aria-hidden
        />
        <Sparkles className="relative w-6 h-6 text-cream" aria-hidden />
      </motion.div>

      <p className="text-cream text-lg md:text-xl leading-relaxed font-light">
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.12 + index * 0.07,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-block"
          >
            {word}&nbsp;
          </motion.span>
        ))}
      </p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="mt-3 font-mono text-xs text-cream/50"
      >
        Pedido {orderId}
      </motion.p>
    </div>
  );
}
