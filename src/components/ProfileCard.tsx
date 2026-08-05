import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { sessionAtom } from "../state/atoms";
import { useProfile } from "../hooks/useProfile";

const maskDocument = (document?: string | null) => {
  if (!document) return null;
  const digits = document.replace(/\D/g, "");
  if (digits.length < 5) return document;
  return `•••.${digits.slice(3, 6)}.${digits.slice(6, 9)}-••`;
};

export function ProfileCard() {
  const session = useAtomValue(sessionAtom);
  const { data: profile } = useProfile();

  if (!session) return null;

  const document = maskDocument(profile?.document ?? session.document);

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Dados do usuário"
      className="w-full rounded-2xl border border-cream/10 bg-cream/5 p-5"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 shrink-0 rounded-full bg-cream/10 text-cream flex items-center justify-center text-base font-medium uppercase">
          {session.email.slice(0, 2)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cream truncate">
            {session.email}
          </p>
          <p className="mt-0.5 text-xs text-cream/50">
            {document ? `Documento ${document}` : "Sessão ativa"}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
