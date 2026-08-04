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
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand rounded-full flex items-center justify-center shadow-lg shadow-red-500/25"
    >
      <MessageCircle className="w-6 h-6 text-white" aria-hidden />
    </motion.button>
  );
}

export function MobilePanelToggle({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-white text-gray-900 rounded-full font-medium shadow-lg flex items-center gap-2"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden />
      Visualizar painel
    </motion.button>
  );
}
