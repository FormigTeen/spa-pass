import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import { Loader2 } from "lucide-react";
import { draftEmailAtom, loginStepAtom } from "../state/atoms";
import { useEmailCodeAuth } from "../hooks/useAuth";
import { gatewayErrorMessage } from "../lib/gateway";
import { cn } from "../lib/cn";

const LENGTH = 6;

export function LoginStepCode() {
  const email = useAtomValue(draftEmailAtom);
  const [, setStep] = useAtom(loginStepAtom);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const submitted = useRef(false);
  const { requestCode, confirmCode } = useEmailCodeAuth();

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const submit = async (code: string) => {
    if (submitted.current) return;
    submitted.current = true;
    setError("");
    try {
      await confirmCode.mutateAsync({ email, code });
      // The session atom flips the view; nothing else to do here.
    } catch (caught) {
      submitted.current = false;
      setError(gatewayErrorMessage(caught, "Código inválido. Tente novamente."));
      setDigits(Array(LENGTH).fill(""));
      inputs.current[0]?.focus();
    }
  };

  const apply = (next: string[]) => {
    setDigits(next);
    const code = next.join("");
    if (code.length === LENGTH && next.every(Boolean)) void submit(code);
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    if (value && index < LENGTH - 1) inputs.current[index + 1]?.focus();
    apply(next);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0)
      inputs.current[index - 1]?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, LENGTH);
    if (!pasted) return;

    const next = [...digits];
    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
    apply(next);
  };

  const busy = confirmCode.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      <h1 className="text-4xl md:text-5xl font-medium text-cream tracking-tight text-balance">
        Verifique seu email
      </h1>
      <p className="mt-4 text-lg text-cream/60 leading-relaxed">
        Enviamos um código de {LENGTH} dígitos para{" "}
        <span className="text-cream font-medium">{email}</span>
      </p>

      <div className="mt-10 flex gap-2 md:gap-3 justify-center">
        {digits.map((digit, index) => (
          <motion.input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={`Dígito ${index + 1}`}
            maxLength={1}
            value={digit}
            disabled={busy}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={cn(
              "w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-medium",
              "border-2 rounded-xl bg-transparent text-cream transition-all duration-200 outline-none",
              "focus:border-cream focus:ring-4 focus:ring-cream/10",
              "disabled:opacity-60",
              digit ? "border-cream bg-cream/5" : "border-cream/20",
            )}
          />
        ))}
      </div>

      {busy && (
        <p className="mt-6 text-sm text-cream/60 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Verificando...
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-300 text-center">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setStep("email")}
          className="text-cream/60 hover:text-cream transition-colors"
        >
          Trocar email
        </button>
        <button
          type="button"
          disabled={requestCode.isPending}
          onClick={() => void requestCode.mutateAsync(email).catch(() => null)}
          className="text-cream/60 hover:text-cream transition-colors disabled:opacity-50"
        >
          {requestCode.isPending ? "Reenviando..." : "Reenviar código"}
        </button>
      </div>
    </motion.div>
  );
}
