import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, X } from "lucide-react";
import type { usePasskeyEnrolment } from "../hooks/usePasskeyEnrolment";

type Enrolment = ReturnType<typeof usePasskeyEnrolment>;

export function PasskeyEnrolCard({ enrolment }: { enrolment: Enrolment }) {
  const { status, error, enrol, dismiss } = enrolment;
  const visible = status === "offer" || status === "prompting" || status === "error";
  const busy = status === "prompting";

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
          className="w-full overflow-hidden"
        >
          {/* Dismiss sits alongside the card, not inside it: a button cannot
              nest within another button. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => void enrol()}
              disabled={busy}
              className="group w-full rounded-2xl bg-white p-5 pr-12 text-left transition-transform disabled:cursor-wait enabled:hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink/5 text-ink">
                  {busy ? (
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  ) : (
                    <KeyRound className="h-6 w-6" aria-hidden />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {busy
                      ? "Confirme no seu dispositivo"
                      : status === "error"
                        ? "Tentar de novo"
                        : "Registrar este dispositivo"}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink/50">
                    {error || "Entre sem esperar código"}
                  </span>
                </span>
              </span>

              <ArrowRight
                className="absolute bottom-4 right-4 h-4 w-4 text-ink/30 transition-transform group-enabled:group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Agora não"
              className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
