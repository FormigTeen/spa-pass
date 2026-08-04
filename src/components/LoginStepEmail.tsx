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
import { Loader2 } from "lucide-react";
import { draftEmailAtom, lastEmailAtom, loginStepAtom } from "../state/atoms";
import { useEmailCodeAuth } from "../hooks/useAuth";
import { gatewayErrorMessage } from "../lib/gateway";

/**
 * The gateway answers a blocked address with a bare "Request failed with
 * status code 401", which tells the person nothing and looks like a bug. Too
 * many attempts is the common cause, so say that and leave the rest generic.
 */
const codeRequestMessage = (error: unknown) => {
  const raw = gatewayErrorMessage(error, "");
  if (/401|403|blocked|bloquead/i.test(raw))
    return "Não foi possível enviar o código agora. Isso costuma acontecer após várias tentativas seguidas — aguarde alguns minutos e tente de novo.";
  return "Não foi possível enviar o código. Tente novamente em instantes.";
};
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

  // Arm the offer from here: the browser needs this input present for the
  // whole call. Re-armed as the address changes, so what the dropdown offers
  // always belongs to the email on screen.
  useEffect(() => {
    const target = EMAIL_PATTERN.test(email) ? email : lastEmail;
    if (target) gate.startConditional(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, lastEmail]);

  const isValid = EMAIL_PATTERN.test(email);
  const busy = requestCode.isPending;

  // Autofill only fills. Conditional mediation already offers the passkey in
  // the same dropdown, so raising a sheet on top of it would compete with it.
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

  /**
   * Straight to the emailed code. The key is never tried from here: a modal
   * ceremony always shows something, so an address without one would be met
   * with "no passkeys registered" before its code arrived. The offer lives in
   * the field's own autofill list instead, where the browser shows it only
   * when it holds a key and stays quiet otherwise.
   */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid || busy) return;
    setError("");

    try {
      await requestCode.mutateAsync(email);
      setStep("code");
    } catch (caught) {
      setError(codeRequestMessage(caught));
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
      <h1 className="text-4xl md:text-5xl font-medium text-cream tracking-tight text-balance">
        Vamos começar
      </h1>
      <p className="mt-4 text-lg text-cream/60 leading-relaxed">
        Digite seu email para entrar na plataforma.
      </p>
      {/*
        The offer only ever appears in the field's autofill list, which is easy
        to miss if nobody says so — someone with a key would otherwise press
        Continue and wait for a code they did not need.
      */}
      <p className="mt-2 text-sm text-cream/40 leading-relaxed">
        Já tem uma chave de acesso neste aparelho? Toque no campo abaixo para
        entrar com ela.
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
              : "bg-cream/10 text-cream/35 cursor-not-allowed",
          )}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          {busy ? "Enviando código..." : "Continuar"}
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
