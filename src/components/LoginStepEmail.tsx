import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type FormEvent,
} from "react";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { KeyRound, Loader2 } from "lucide-react";
import { draftEmailAtom, loginStepAtom } from "../state/atoms";
import { useEmailCodeAuth } from "../hooks/useAuth";
import { gatewayErrorMessage } from "../lib/gateway";
import { cn } from "../lib/cn";
import type { PasskeyGate } from "../hooks/useAutoPasskeyLogin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const codeRequestMessage = (error: unknown) => {
  const raw = gatewayErrorMessage(error, "");
  if (/401|403|blocked|bloquead/i.test(raw))
    return "Não foi possível enviar o código agora. Isso costuma acontecer após várias tentativas seguidas — aguarde alguns minutos e tente de novo.";
  return "Não foi possível enviar o código. Tente novamente em instantes.";
};

export function LoginStepEmail({ gate }: { gate: PasskeyGate }) {
  const [email, setEmail] = useAtom(draftEmailAtom);
  const [, setStep] = useAtom(loginStepAtom);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { requestCode } = useEmailCodeAuth();
  const { hasPasskey } = gate;

  const isValid = EMAIL_PATTERN.test(email);
  const busy = authenticating || requestCode.isPending;

  const handleAutofill = useCallback(
    (value: string) => {
      if (!value || value === email) return;
      setEmail(value);
    },
    [email, setEmail],
  );

  const handleAnimationStart = (event: AnimationEvent<HTMLInputElement>) => {
    if (event.animationName !== "onAutoFillStart") return;
    handleAutofill(inputRef.current?.value ?? "");
  };

  // The browser can fill the field before React hydrates, leaving the
  // controlled value empty while the DOM already holds an email.
  useEffect(() => {
    const filled = inputRef.current?.value;
    if (filled) handleAutofill(filled);
    // Only on mount — later changes come through onChange/onAnimationStart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBlur = () => setFocused(false);

  const sendCode = async () => {
    setError("");

    try {
      await requestCode.mutateAsync(email);
      setStep("code");
    } catch (caught) {
      setError(codeRequestMessage(caught));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid || busy) return;

    await sendCode();
  };

  const handlePasskey = async () => {
    if (!isValid || busy) return;
    setError("");

    setAuthenticating(true);
    const available = await hasPasskey(email);
    if (!available) {
      setAuthenticating(false);
      await sendCode();
      return;
    }

    const outcome = await gate.attempt(email);
    setAuthenticating(false);

    if (outcome === "no-credentials") await sendCode();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      <h1 className="text-4xl md:text-5xl font-medium text-cream tracking-tight text-balance">
        Vamos começar
      </h1>
      <p className="mt-4 text-lg text-cream/60 leading-relaxed">
        Digite seu email para entrar na plataforma.
      </p>

      <form onSubmit={handleSubmit} className="mt-10">
        <div className="relative">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            ref={inputRef}
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            // Chrome/Safari fill the field without firing a React change event;
            // the keyframe on :-webkit-autofill makes it observable.
            onAnimationStart={handleAnimationStart}
            placeholder="seu@email.com"
            autoComplete="username webauthn"
            autoFocus
            className={cn(
              "w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2",
              "transition-colors duration-300 outline-none placeholder:text-cream/25 text-cream",
              focused || email ? "border-cream" : "border-cream/20",
            )}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={!isValid || busy}
          whileTap={isValid ? { scale: 0.98 } : undefined}
          className={cn(
            "mt-8 w-full py-4 px-6 rounded-xl text-base font-medium",
            "flex items-center justify-center gap-2 transition-all duration-300",
            isValid && !busy
              ? "bg-cream text-ink hover:bg-cream/90"
              : "bg-cream/10 text-cream/35",
          )}
        >
          {requestCode.isPending && (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          )}
          {requestCode.isPending ? "Enviando código..." : "Receber código"}
        </motion.button>

        <motion.button
          type="button"
          disabled={!isValid || busy}
          onClick={handlePasskey}
          whileTap={isValid ? { scale: 0.98 } : undefined}
          className={cn(
            "mt-3 w-full py-4 px-6 rounded-xl text-base font-medium",
            "flex items-center justify-center gap-2 border transition-all duration-300",
            isValid && !busy
              ? "border-cream/40 text-cream hover:border-cream hover:bg-cream/10"
              : "border-cream/10 text-cream/30",
          )}
        >
          {authenticating ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <KeyRound className="w-4 h-4" aria-hidden />
          )}
          {authenticating
            ? "Verificando chave..."
            : "Usar chave deste dispositivo"}
        </motion.button>
      </form>


      {gate.error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {gate.error}
        </p>
      )}
    </motion.div>
  );
}
