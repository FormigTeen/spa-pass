import { AnimatePresence } from "framer-motion";
import { useAtomValue } from "jotai";
import {
  isAuthenticatedAtom,
  loginStepAtom,
  signedOutAtom,
  viewAtom,
} from "../state/atoms";
import { useAutoPasskeyLogin } from "../hooks/useAutoPasskeyLogin";
import { useProfile } from "../hooks/useProfile";
import { LoginStepEmail } from "./LoginStepEmail";
import { LoginStepCode } from "./LoginStepCode";
import { PasskeyGateScreen } from "./PasskeyGateScreen";
import { WelcomeScreen } from "./WelcomeScreen";
import { OrdersScreen } from "./OrdersScreen";

export function WhitePanel() {
  const authenticated = useAtomValue(isAuthenticatedAtom);
  const step = useAtomValue(loginStepAtom);
  const signedOut = useAtomValue(signedOutAtom);
  const view = useAtomValue(viewAtom);
  const { data: profile, isFetched: profileFetched } = useProfile();
  const gate = useAutoPasskeyLogin();

  const content = () => {
    if (authenticated)
      return view === "refund" ? (
        <OrdersScreen key="orders" />
      ) : (
        <WelcomeScreen key="welcome" />
      );
    if (!signedOut && (!profileFetched || profile?.email))
      return <div key="bootstrap" />;
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
