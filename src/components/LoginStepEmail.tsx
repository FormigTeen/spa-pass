import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type FormEvent,
} from "react";
import { motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import { Fingerprint, Loader2 } from "lucide-react";
import { draftEmailAtom, lastEmailAtom, loginStepAtom } from "../state/atoms";
import { useEmailCodeAuth } from "../hooks/useAuth";
import { gatewayErrorMessage } from "../lib/gateway";
import { cn } from "../lib/cn";
import type { PasskeyGate } from "../hooks/useAutoPasskeyLogin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginStepEmail({ gate }: { gate: PasskeyGate }) {
  const [email, setEmail] = useAtom(draftEmailAtom);
  const lastEmail = useAtomValue(lastEmailAtom);
  const [, setStep] = useAtom(loginStepAtom);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { requestCode } = useEmailCodeAuth();

  // Prefill with the remembered email the first time the form is shown.
  useEffect(() => {
    if (!email && lastEmail) setEmail(lastEmail);
  }, [email, lastEmail, setEmail]);

  const isValid = EMAIL_PATTERN.test(email);
  const offerPasskey = gate.hasKey && gate.checkedEmail === email;

  /**
   * An autofilled email is a deliberate pick from the browser's dropdown, so
   * it is a fair trigger for the biometric prompt — the gate still confirms
   * with the gateway before anything pops up.
   */
  const handleAutofill = useCallback(
    (value: string) => {
      if (!value || value === email) return;
      setEmail(value);
      if (EMAIL_PATTERN.test(value)) gate.attempt(value);
    },
    [email, setEmail, gate],
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

  // Typed by hand: check quietly so the biometric button can appear, but do
  // not hijack the flow with a prompt the user did not ask for.
  const handleBlur = () => {
    setFocused(false);
    if (isValid && email !== gate.checkedEmail) gate.probe(email);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid || requestCode.isPending) return;
    setError("");
    try {
      await requestCode.mutateAsync(email);
      setStep("code");
    } catch (caught) {
      setError(gatewayErrorMessage(caught, "Não foi possível enviar o código."));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      <h1 className="text-4xl md:text-5xl font-medium text-gray-900 tracking-tight text-balance">
        Vamos começar
      </h1>
      <p className="mt-4 text-lg text-gray-500 leading-relaxed">
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
              "transition-colors duration-300 outline-none placeholder:text-gray-300",
              focused || email ? "border-gray-900" : "border-gray-200",
            )}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={!isValid || requestCode.isPending}
          whileTap={isValid ? { scale: 0.98 } : undefined}
          className={cn(
            "mt-8 w-full py-4 px-6 rounded-xl text-base font-medium",
            "flex items-center justify-center gap-2 transition-all duration-300",
            isValid && !requestCode.isPending
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          )}
        >
          {requestCode.isPending && (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          )}
          {requestCode.isPending ? "Enviando código..." : "Continuar"}
        </motion.button>
      </form>

      {offerPasskey && (
        <motion.button
          type="button"
          onClick={gate.retry}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 w-full py-4 px-6 rounded-xl border-2 border-gray-200 text-gray-900 font-medium flex items-center justify-center gap-2 hover:border-gray-900 transition-colors"
        >
          <Fingerprint className="w-5 h-5" aria-hidden />
          Entrar com biometria
        </motion.button>
      )}

      {gate.error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {gate.error}
        </p>
      )}
    </motion.div>
  );
}
