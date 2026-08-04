import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { LogOut } from "lucide-react";
import { sessionAtom } from "../state/atoms";
import { useSignOut } from "../hooks/useAuth";
import { usePasskeyEnrolment } from "../hooks/usePasskeyEnrolment";
import { ProfileCard } from "./ProfileCard";
import { PasskeyEnrolCard } from "./PasskeyEnrolCard";

export function WelcomeScreen() {
  const session = useAtomValue(sessionAtom);
  const signOut = useSignOut();
  const enrolment = usePasskeyEnrolment();

  if (!session) return null;

  const name = session.email.split("@")[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg h-full flex flex-col justify-between py-10 md:py-14 gap-8"
    >
      {/* Top — who is signed in, and the passkey upsell. */}
      <div className="space-y-3">
        <ProfileCard enrolment={enrolment.status} />
        <PasskeyEnrolCard enrolment={enrolment} />
      </div>

      {/* Middle — the welcome itself. */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-4xl md:text-5xl lg:text-6xl font-medium text-gray-900 tracking-tight block"
        >
          Bem-vindo..
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-2 text-3xl md:text-4xl lg:text-5xl font-medium text-gray-900 tracking-tight block break-words"
        >
          {name}!
        </motion.span>
      </div>

      {/* Bottom — leave. */}
      <div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden />
          Sair da conta
        </button>
      </div>
    </motion.div>
  );
}
