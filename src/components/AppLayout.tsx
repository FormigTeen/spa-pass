import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import { isAuthenticatedAtom, mobileChatOpenAtom } from "../state/atoms";
import { useIsMobile } from "../hooks/useIsMobile";
import { useSessionBootstrap } from "../hooks/useAuth";
import { WhitePanel } from "./WhitePanel";
import { RedPanel } from "./RedPanel";
import { FloatingChatButton, MobilePanelToggle } from "./FloatingChatButton";

export function AppLayout() {
  useSessionBootstrap();

  const authenticated = useAtomValue(isAuthenticatedAtom);
  const [chatOpen, setChatOpen] = useAtom(mobileChatOpenAtom);
  const isMobile = useIsMobile();

  // Escape closes the chat, the same as the back control. It is what the key
  // does everywhere else something is laid over the page, and reaching for it
  // costs nothing to anyone who does not know it is there.
  useEffect(() => {
    if (!chatOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChatOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chatOpen, setChatOpen]);

  if (!isMobile) {
    return (
      <div className="w-full h-dvh overflow-hidden flex">
        <div className="w-[60%] h-full">
          <WhitePanel />
        </div>
        <div className="w-[40%] h-full">
          <RedPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-dvh overflow-hidden">
      <AnimatePresence>
        {!chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <WhitePanel />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 h-dvh z-40"
          >
            <RedPanel showComposer autoFocusComposer />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!chatOpen && authenticated && (
          <FloatingChatButton onClick={() => setChatOpen(true)} />
        )}
        {chatOpen && <MobilePanelToggle onClick={() => setChatOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
