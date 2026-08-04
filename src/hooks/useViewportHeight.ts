import { useEffect } from "react";

/**
 * Publishes the visual viewport height as `--viewport-height`.
 *
 * `dvh` tracks the browser chrome but not the virtual keyboard, so a full-height
 * layout keeps its height when the keyboard opens and the composer sits behind
 * it — and the browser scrolls the document to reveal the focused input, which
 * `overflow: hidden` on the body makes impossible to undo by hand.
 */
export function useViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${viewport.height}px`,
      );
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    publish();
    viewport.addEventListener("resize", publish);
    viewport.addEventListener("scroll", publish);
    return () => {
      viewport.removeEventListener("resize", publish);
      viewport.removeEventListener("scroll", publish);
    };
  }, []);
}
