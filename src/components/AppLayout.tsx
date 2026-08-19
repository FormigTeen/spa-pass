import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import { isAuthenticatedAtom, mobileChatOpenAtom, viewAtom } from "../state/atoms";
import { useIsMobile } from "../hooks/useIsMobile";
import { useViewportHeight } from "../hooks/useViewportHeight";
import { useSessionBootstrap } from "../hooks/useAuth";
import { WhitePanel } from "./WhitePanel";
import { RedPanel } from "./RedPanel";
import { EChatLauncher } from "./EChatLauncher";
import { FloatingChatButton, MobilePanelToggle } from "./FloatingChatButton";

export function AppLayout() {
  useSessionBootstrap();
  useViewportHeight();

  const authenticated = useAtomValue(isAuthenticatedAtom);
  const view = useAtomValue(viewAtom);
  const [chatOpen, setChatOpen] = useAtom(mobileChatOpenAtom);
  const isMobile = useIsMobile();

  // The welcome screen has no chat of its own: the red side is bare, and the
  // conversation there is the E-Chat widget behind the floating button.
  const onWelcome = authenticated && view === "start";

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
          {onWelcome ? <div className="h-full w-full bg-brand" /> : <RedPanel />}
        </div>

        {onWelcome && <EChatLauncher />}
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
        {chatOpen && !onWelcome && (
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

      {onWelcome ? (
        <EChatLauncher />
      ) : (
        <AnimatePresence>
          {!chatOpen && authenticated && (
            <FloatingChatButton onClick={() => setChatOpen(true)} />
          )}
          {chatOpen && <MobilePanelToggle onClick={() => setChatOpen(false)} />}
        </AnimatePresence>
      )}
    </div>
  );
}
