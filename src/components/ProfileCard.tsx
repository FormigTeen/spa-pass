import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { Fingerprint } from "lucide-react";
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
  // Declined earlier: the ask is gone, so this is the only way back in.
  const canReconsider = enrolment.status === "dismissed";

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Dados do usuário"
      className="w-full rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-5 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 shrink-0 rounded-full bg-gray-900 text-white flex items-center justify-center text-base font-medium uppercase">
          {session.email.slice(0, 2)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {session.email}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
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
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-900 px-2.5 py-1 text-[11px] font-medium text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
            >
              <Fingerprint className="w-3.5 h-3.5" aria-hidden />
              Registrar digital
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
