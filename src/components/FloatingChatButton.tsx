import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";

export function FloatingChatButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Abrir chat"
      className="fixed right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 w-14 h-14 bg-brand rounded-full flex items-center justify-center shadow-lg shadow-black/40"
    >
      <MessageCircle className="w-6 h-6 text-cream" aria-hidden />
    </motion.button>
  );
}

export function MobilePanelToggle({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      whileTap={{ scale: 0.94 }}
      aria-label="Visualizar painel"
      // Top left, out of the way of the composer and the thread.
      className="fixed left-5 top-[calc(1.25rem+env(safe-area-inset-top))] z-50 w-11 h-11 rounded-full bg-cream text-ink shadow-lg flex items-center justify-center"
    >
      <ArrowLeft className="w-5 h-5" aria-hidden />
    </motion.button>
  );
}
