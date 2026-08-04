import { AnimatePresence, motion } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import type { usePasskeyEnrolment } from "../hooks/usePasskeyEnrolment";

type Enrolment = ReturnType<typeof usePasskeyEnrolment>;

/**
 * The ask that appears when the account has no passkey on this device. The OS
 * sheet only opens on "Sim, registrar" — never on its own — and "Agora não" is
 * remembered per email so the question is not repeated.
 */
export function PasskeyEnrolCard({ enrolment }: { enrolment: Enrolment }) {
  const { status, error, enrol, dismiss } = enrolment;
  const visible = status === "offer" || status === "prompting" || status === "error";

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
          <div className="rounded-2xl border border-cream/15 bg-brand text-cream p-5">
            <div className="flex items-start gap-4">
              <motion.div
                animate={
                  status === "prompting"
                    ? { scale: [1, 1.1, 1] }
                    : { scale: 1 }
                }
                transition={{
                  duration: 1.4,
                  repeat: status === "prompting" ? Infinity : 0,
                }}
                className="w-11 h-11 shrink-0 rounded-full bg-cream/15 flex items-center justify-center"
              >
                <Fingerprint className="w-5 h-5" aria-hidden />
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {status === "prompting"
                    ? "Confirme no seu dispositivo"
                    : "Quer entrar com a digital da próxima vez?"}
                </p>
                <p className="mt-1 text-sm text-cream/70 leading-relaxed">
                  {status === "prompting"
                    ? "Estamos criando sua chave de acesso neste dispositivo."
                    : "Registramos uma chave de acesso neste aparelho e você entra sem esperar código no email."}
                </p>

                {error && (
                  <p role="alert" className="mt-2 text-sm text-red-300">
                    {error}
                  </p>
                )}

                {status !== "prompting" && (
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void enrol()}
                      className="rounded-lg bg-cream px-4 py-2 text-sm font-medium text-ink hover:bg-cream/90 transition-colors"
                    >
                      {status === "error" ? "Tentar de novo" : "Sim, registrar"}
                    </button>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="text-sm text-cream/60 hover:text-cream transition-colors"
                    >
                      Agora não
                    </button>
                  </div>
                )}

                {status === "prompting" && (
                  <p className="mt-4 inline-flex items-center gap-2 text-sm text-cream/70">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Aguardando o sensor...
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
