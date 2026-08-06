import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, KeyRound, Loader2 } from "lucide-react";
import type { usePasskeyEnrolment } from "../hooks/usePasskeyEnrolment";
import { cn } from "../lib/cn";

type Enrolment = ReturnType<typeof usePasskeyEnrolment>;

export function PasskeyEnrolCard({ enrolment }: { enrolment: Enrolment }) {
  const { status, error, enrol } = enrolment;
  const visible =
    status === "offer" ||
    status === "prompting" ||
    status === "enrolled" ||
    status === "error";
  const busy = status === "prompting";
  const done = status === "enrolled" || status === "already-registered";

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
          <div className="relative">
            <button
              type="button"
              onClick={() => void enrol()}
              disabled={busy || done}
              className={cn(
                "group w-full rounded-2xl bg-white p-5 pr-12 text-left",
                "shadow-sm transition-all duration-200 disabled:cursor-wait",
                "enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg",
                "enabled:active:translate-y-0 enabled:active:scale-[0.99]",
              )}
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
                      ? "Confirme sua chave de segurança"
                      : done
                        ? "Chave de segurança registrada"
                        : status === "error"
                        ? "Tentar de novo"
                        : "Registrar chave de segurança"}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink/50">
                    {error ||
                      (status === "enrolled"
                        ? "Sua chave de segurança foi registrada."
                        : "Entre sem esperar código")}
                  </span>
                </span>
              </span>

              {/* Centred on the edge, the way a row that opens something
                  usually points to itself. */}
              <ChevronRight
                className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/25 transition-all group-enabled:group-hover:translate-x-0.5 group-enabled:group-hover:text-ink/60"
                aria-hidden
              />
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
