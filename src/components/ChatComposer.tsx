import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { cn } from "../lib/cn";

type ChatComposerProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function ChatComposer({
  onSend,
  disabled = false,
  autoFocus = false,
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => input.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || disabled) return;
    onSend(text);
    setMessage("");
  };

  const ready = Boolean(message.trim()) && !disabled;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="w-full"
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl bg-brand-deep px-4 py-3",
          "transition-all duration-300",
          focused && "ring-2 ring-cream/25",
        )}
      >
        <input
          ref={input}
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Digite sua mensagem..."
          aria-label="Mensagem para o agente"
          className="flex-1 bg-transparent text-cream placeholder:text-cream/40 outline-none text-base"
        />
        <motion.button
          type="submit"
          disabled={!ready}
          aria-label="Enviar"
          whileTap={ready ? { scale: 0.95 } : undefined}
          className={cn(
            "p-2 rounded-lg transition-all duration-200",
            ready
              ? "bg-cream text-brand hover:bg-cream/90"
              : "bg-cream/10 text-cream/40",
          )}
        >
          <Send className="w-5 h-5" aria-hidden />
        </motion.button>
      </div>
    </motion.form>
  );
}
