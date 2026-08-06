import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { Provider as JotaiProvider } from "jotai";
import { AppLayout } from "./components/AppLayout";
import "@copilotkit/react-core/v2/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

export default function App() {
  const content = (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <AppLayout />
      </JotaiProvider>
    </QueryClientProvider>
  );

  const copilotRuntimeUrl = import.meta.env.VITE_COPILOTKIT_RUNTIME_URL;
  const copilotLicenseKey = import.meta.env.VITE_COPILOTKIT_PUBLIC_LICENSE_KEY;

  if (!copilotRuntimeUrl && !copilotLicenseKey) {
    return content;
  }

  return (
    <CopilotKit
      runtimeUrl={copilotRuntimeUrl}
      publicLicenseKey={copilotLicenseKey}
    >
      {content}
    </CopilotKit>
  );
}
