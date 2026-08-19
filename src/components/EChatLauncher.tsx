import { Component, lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, RefreshCw, X } from "lucide-react";
import { cn } from "../lib/cn";
import { GATEWAY_ORIGIN } from "../lib/gateway";
import { useSignOut } from "../hooks/useAuth";

/**
 * The chat itself is a Module Federation remote published by echat-app, so it
 * only arrives over the network once the panel opens.
 */
const InChatWidget = lazy(() => import("inchat/InChatWidget"));

const LABEL = "Teste o E-Chat";

export function EChatLauncher() {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();

  // Escape closes the panel, the same as the header control.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-label={LABEL}
            // Full bleed on a phone; a panel sitting above the button on a
            // desktop. The widget fills whatever box it is given, so the box
            // has to carry the size.
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink shadow-2xl shadow-black/50 md:inset-auto md:right-6 md:bottom-24 md:h-[min(38.75rem,calc(100vh-9rem))] md:w-[25rem] md:rounded-3xl md:border md:border-cream/10"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-cream/10 bg-ink-soft px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 md:pt-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-cream">
                <Bot className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-cream">
                  E-Chat
                </span>
                <span className="block text-xs text-cream/50">
                  Atendimento Casa &amp; Vídeo
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar o E-Chat"
                className="grid h-9 w-9 place-items-center rounded-full text-cream/60 transition-colors hover:bg-cream/10 hover:text-cream"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 bg-ink pb-[env(safe-area-inset-bottom)]">
              <RemoteBoundary>
                <Suspense fallback={<Loading />}>
                  <InChatWidget
                    gatewayOrigin={GATEWAY_ORIGIN}
                    onStartLogin={signOut}
                  />
                </Suspense>
              </RemoteBoundary>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Fab open={open} onClick={() => setOpen((it) => !it)} />
    </>
  );
}

function Fab({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <div
      // On a phone the panel covers the screen, so the button would land on top
      // of the conversation; there, the header's close control stands in for it.
      className={cn(
        "group/fab fixed right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 items-center gap-3 md:flex",
        open ? "hidden" : "flex",
      )}
    >
      {/* Sibling of the button rather than a child, so the label can grow
          leftwards without the round button reflowing around it. */}
      <span
        aria-hidden
        className="pointer-events-none hidden select-none rounded-full bg-ink px-3.5 py-2 text-sm font-medium whitespace-nowrap text-cream opacity-0 shadow-lg shadow-black/40 transition-opacity duration-200 md:block group-hover/fab:opacity-100"
      >
        {LABEL}
      </span>

      <motion.button
        type="button"
        onClick={onClick}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={LABEL}
        aria-expanded={open}
        className="grid h-14 w-14 place-items-center rounded-full bg-cream text-brand shadow-lg shadow-black/40 ring-0 ring-cream/40 transition-shadow hover:ring-4"
      >
        <Bot className="h-7 w-7" aria-hidden />
      </motion.button>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid h-full place-items-center bg-ink">
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 1, ease: "linear", repeat: Infinity }}
        className="block text-cream/60"
      >
        <RefreshCw className="h-5 w-5" aria-hidden />
      </motion.span>
    </div>
  );
}

/**
 * The remote lives on another host, so loading it can fail for reasons this app
 * cannot fix. Without a boundary that rejection unmounts the whole page.
 */
class RemoteBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <p className="text-sm leading-relaxed text-cream/60">
          Não foi possível carregar o E-Chat agora.
          <br />
          Tente novamente em instantes.
        </p>
      </div>
    );
  }
}
