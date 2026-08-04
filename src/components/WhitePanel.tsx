import { AnimatePresence } from "framer-motion";
import { useAtomValue } from "jotai";
import { isAuthenticatedAtom, loginStepAtom } from "../state/atoms";
import { useAutoPasskeyLogin } from "../hooks/useAutoPasskeyLogin";
import { LoginStepEmail } from "./LoginStepEmail";
import { LoginStepCode } from "./LoginStepCode";
import { PasskeyGateScreen } from "./PasskeyGateScreen";
import { WelcomeScreen } from "./WelcomeScreen";

export function WhitePanel() {
  const authenticated = useAtomValue(isAuthenticatedAtom);
  const step = useAtomValue(loginStepAtom);
  const gate = useAutoPasskeyLogin();

  const content = () => {
    if (authenticated) return <WelcomeScreen key="welcome" />;
    // Only once the passkey is through. While the OS sheet is up the sheet is
    // already the interface, and swapping the form out unmounts it — taking
    // its error and progress state with it, so a failure afterwards had
    // nothing left to report.
    if (gate.status === "linking")
      return <PasskeyGateScreen key="gate" gate={gate} />;
    if (step === "code") return <LoginStepCode key="code" />;
    return <LoginStepEmail key="email" gate={gate} />;
  };

  return (
    <div className="h-full w-full bg-ink flex items-center justify-center px-8 md:px-12 lg:px-16">
      <AnimatePresence mode="wait">{content()}</AnimatePresence>
    </div>
  );
}
