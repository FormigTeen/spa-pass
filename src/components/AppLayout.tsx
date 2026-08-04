import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import { isAuthenticatedAtom, mobileChatOpenAtom } from "../state/atoms";
import { useIsMobile } from "../hooks/useIsMobile";
import { useViewportHeight } from "../hooks/useViewportHeight";
import { useSessionBootstrap } from "../hooks/useAuth";
import { WhitePanel } from "./WhitePanel";
import { RedPanel } from "./RedPanel";
import { FloatingChatButton, MobilePanelToggle } from "./FloatingChatButton";

export function AppLayout() {
  useSessionBootstrap();
  useViewportHeight();

  const authenticated = useAtomValue(isAuthenticatedAtom);
  const [chatOpen, setChatOpen] = useAtom(mobileChatOpenAtom);
  const isMobile = useIsMobile();

  // Escape closes the chat, the same as the back control.
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
      <div className="w-full h-viewport overflow-hidden flex">
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
    <div className="w-full h-viewport overflow-hidden">
      {/* Stays mounted under the chat, keeping its state and entrance animations. */}
      <div className="h-full w-full">
        <WhitePanel />
      </div>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            // Only the top edge is pinned: `inset-0` would stretch the panel to
            // the layout viewport and put the composer behind the keyboard.
            className="fixed inset-x-0 top-0 h-viewport z-40"
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
