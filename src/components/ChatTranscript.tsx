import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage } from "../state/atoms";
import { cn } from "../lib/cn";

export function ChatTranscript({ messages }: { messages: ChatMessage[] }) {
  const viewport = useRef<HTMLDivElement>(null);

  // Follow the newest message by scrolling this element only. `scrollIntoView`
  // walks up every scrollable ancestor, including the document, which on mobile
  // moves the whole panel instead of the thread.
  useEffect(() => {
    const node = viewport.current;
    node?.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // The keyboard opening is not a message change, so re-pin on resize too.
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;

    const observer = new ResizeObserver(() => {
      node.scrollTop = node.scrollHeight;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    // The inner column is at least full height and packs to the end, so a short
    // thread sits on the bottom edge and grows upward.
    <div ref={viewport} className="no-scrollbar h-full overflow-y-auto">
      <div className="min-h-full flex flex-col justify-end py-6 space-y-4">
        <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                message.role === "user"
                  ? "bg-ink text-cream rounded-br-md"
                  : "bg-brand-deep text-cream rounded-bl-md",
              )}
            >
              {message.pending ? <TypingDots /> : message.content}
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Digitando">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="w-1.5 h-1.5 rounded-full bg-cream/70"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: index * 0.18,
          }}
        />
      ))}
    </span>
  );
}
