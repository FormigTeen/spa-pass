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
    if (
      gate.status === "checking" ||
      gate.status === "prompting" ||
      gate.status === "linking"
    )
      return <PasskeyGateScreen key="gate" gate={gate} />;
    if (step === "code") return <LoginStepCode key="code" />;
    return <LoginStepEmail key="email" gate={gate} />;
  };

  return (
    <div className="h-full w-full bg-white flex items-center justify-center px-8 md:px-12 lg:px-16">
      <AnimatePresence mode="wait">{content()}</AnimatePresence>
    </div>
  );
}
