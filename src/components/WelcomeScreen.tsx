import { motion } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowRight, LogOut, PackageOpen } from "lucide-react";
import { sessionAtom, viewAtom } from "../state/atoms";
import { useSignOut } from "../hooks/useAuth";
import { usePasskeyEnrolment } from "../hooks/usePasskeyEnrolment";
import { useProfile } from "../hooks/useProfile";
import { ProfileCard } from "./ProfileCard";
import { PasskeyEnrolCard } from "./PasskeyEnrolCard";

export function WelcomeScreen() {
  const session = useAtomValue(sessionAtom);
  const setView = useSetAtom(viewAtom);
  const signOut = useSignOut();
  const enrolment = usePasskeyEnrolment();
  const { data: profile } = useProfile();

  if (!session) return null;

  // VTEX may hold no name for the account; greeting the local part of an
  // email address reads worse than not naming them at all.
  const name = profile?.firstName?.trim() || "cliente";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg h-full flex flex-col justify-between pt-10 md:pt-14 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-14 gap-8"
    >
      {/* Top — who is signed in, and the passkey upsell. */}
      <div className="space-y-3">
        <ProfileCard />
        <PasskeyEnrolCard enrolment={enrolment} />
      </div>

      {/* Middle — the welcome, and what this place actually is. */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-4xl md:text-5xl lg:text-6xl font-medium text-cream tracking-tight block"
        >
          Bem-vindo,
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-2 text-3xl md:text-4xl lg:text-5xl font-medium text-cream tracking-tight block break-words"
        >
          {name}!
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-6 text-base md:text-lg leading-relaxed text-cream/60 font-light"
        >
          Ambiente de teste dos agentes. Escolha um para conversar.
        </motion.p>

        <motion.button
          type="button"
          onClick={() => setView("refund")}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          className="group relative mt-8 w-full rounded-2xl border-2 border-cream/20 p-5 pr-12 text-left text-cream transition-colors hover:border-cream hover:bg-cream/5"
        >
          <span className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cream/10 text-cream transition-colors group-hover:bg-cream/15">
              <PackageOpen className="h-6 w-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                Teste o Agente de Troca/Devolução
              </span>
              <span className="mt-0.5 block text-xs text-cream/50">
                Use um pedido real da sua conta
              </span>
            </span>
          </span>

          <ArrowRight
            className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cream/30 transition-all group-hover:translate-x-0.5 group-hover:text-cream"
            aria-hidden
          />
        </motion.button>
      </div>

      {/* Bottom — leave. The 56px row matches the floating chat button, so
          on mobile both sit on the same horizontal line. */}
      <div className="flex items-center h-14 md:h-auto">
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-cream/20 px-5 py-3 text-sm font-medium text-cream/70 hover:border-cream hover:text-cream transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden />
          Sair da conta
        </button>
      </div>
    </motion.div>
  );
}
