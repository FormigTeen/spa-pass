import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { Fingerprint, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { sessionAtom } from "../state/atoms";
import { useProfile } from "../hooks/useProfile";
import type { EnrolmentStatus } from "../hooks/usePasskeyEnrolment";

const maskDocument = (document?: string | null) => {
  if (!document) return null;
  const digits = document.replace(/\D/g, "");
  if (digits.length < 5) return document;
  return `•••.${digits.slice(3, 6)}.${digits.slice(6, 9)}-••`;
};

export function ProfileCard({ enrolment }: { enrolment: EnrolmentStatus }) {
  const session = useAtomValue(sessionAtom);
  const { data: profile } = useProfile();

  if (!session) return null;

  const document = maskDocument(profile?.document ?? session.document);
  const enrolled = enrolment === "enrolled";

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

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              icon={session.via === "passkey" ? Fingerprint : Mail}
              label={session.via === "passkey" ? "Biometria" : "Código por email"}
            />
            <Badge
              icon={enrolled ? ShieldCheck : KeyRound}
              label={enrolled ? "Chave registrada" : "Sem chave neste dispositivo"}
              tone={enrolled ? "positive" : "muted"}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

type BadgeProps = {
  icon: typeof Mail;
  label: string;
  tone?: "positive" | "muted";
};

function Badge({ icon: Icon, label, tone = "muted" }: BadgeProps) {
  const styles =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {label}
    </span>
  );
}
