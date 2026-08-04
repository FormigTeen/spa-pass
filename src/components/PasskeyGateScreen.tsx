import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import type { PasskeyGate } from "../hooks/useAutoPasskeyLogin";

/**
 * Only shown once the OS sheet is actually up (or right after it succeeds), so
 * the biometric prompt has context behind it. The preceding lookup stays
 * invisible — it is a background request, not something worth a screen.
 */
export function PasskeyGateScreen({ gate }: { gate: PasskeyGate }) {
  const prompting = gate.status === "prompting";
  const linking = gate.status === "linking";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md text-center"
    >
      <div className="flex justify-center">
        <motion.div
          animate={
            prompting || linking
              ? { scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 1.6, repeat: prompting || linking ? Infinity : 0 }}
          className="w-20 h-20 rounded-3xl bg-cream/10 flex items-center justify-center"
        >
          <KeyRound className="w-10 h-10 text-cream" aria-hidden />
        </motion.div>
      </div>

      <h1 className="mt-8 text-3xl md:text-4xl font-medium text-cream tracking-tight">
        {linking ? "Quase lá..." : "Confirme que é você"}
      </h1>

      <p className="mt-4 text-lg text-cream/60 leading-relaxed">
        {linking ? (
          "Estamos abrindo sua sessão."
        ) : (
          <>
            Use o desbloqueio deste dispositivo para entrar.
          </>
        )}
      </p>

    </motion.div>
  );
}
