import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { KeyRound } from "lucide-react";
import { sessionAtom } from "../state/atoms";
import { useProfile } from "../hooks/useProfile";
import type { usePasskeyEnrolment } from "../hooks/usePasskeyEnrolment";

type Enrolment = ReturnType<typeof usePasskeyEnrolment>;

const maskDocument = (document?: string | null) => {
  if (!document) return null;
  const digits = document.replace(/\D/g, "");
  if (digits.length < 5) return document;
  return `•••.${digits.slice(3, 6)}.${digits.slice(6, 9)}-••`;
};

export function ProfileCard({ enrolment }: { enrolment: Enrolment }) {
  const session = useAtomValue(sessionAtom);
  const { data: profile } = useProfile();

  if (!session) return null;

  const document = maskDocument(profile?.document ?? session.document);
  // Keyed to the device, not the account: a phone whose key lives on a laptop
  // still needs a way in, while a device that has just signed in with a key
  // needs nothing. The card below covers the case where it is already asking.
  // Only when the account has no key and the card is not already asking.
  const canReconsider = enrolment.status === "dismissed";

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

          {/*
            The card stays quiet unless something needs doing: how you signed
            in is not actionable, and a registered key needs no announcement.
            This is the only way back for someone who declined the ask.
          */}
          {canReconsider && (
            <button
              type="button"
              onClick={() => void enrolment.enrol()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cream/40 px-2.5 py-1 text-[11px] font-medium text-cream transition-colors hover:bg-cream hover:text-ink"
            >
              <KeyRound className="w-3.5 h-3.5" aria-hidden />
              Registrar este dispositivo
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
