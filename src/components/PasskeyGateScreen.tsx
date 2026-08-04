import { motion } from "framer-motion";
import { Fingerprint } from "lucide-react";
import type { PasskeyGate } from "../hooks/useAutoPasskeyLogin";

/**
 * Shown while the returning-user passkey attempt is in flight, so the OS sheet
 * never appears over a bare login form with no explanation.
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
          className="w-20 h-20 rounded-3xl bg-gray-900 flex items-center justify-center"
        >
          <Fingerprint className="w-10 h-10 text-white" aria-hidden />
        </motion.div>
      </div>

      <h1 className="mt-8 text-3xl md:text-4xl font-medium text-gray-900 tracking-tight">
        {linking
          ? "Quase lá..."
          : prompting
            ? "Confirme que é você"
            : "Procurando sua chave..."}
      </h1>

      <p className="mt-4 text-lg text-gray-500 leading-relaxed">
        {linking ? (
          "Estamos abrindo sua sessão."
        ) : prompting ? (
          <>
            Use a biometria deste dispositivo para entrar como{" "}
            <span className="text-gray-900 font-medium">{gate.email}</span>.
          </>
        ) : (
          "Verificando se você já tem uma chave de acesso salva."
        )}
      </p>

      {!linking && (
      <button
        type="button"
        onClick={gate.skip}
        className="mt-10 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        Usar outro método
      </button>
      )}
    </motion.div>
  );
}
