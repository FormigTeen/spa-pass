import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import { AppLayout } from "./components/AppLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

/**
 * The gateway session is a cross-site cookie, so embedded contexts need the
 * Storage Access API before any request can carry it.
 */
function StorageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!document.hasStorageAccess) return;
    document
      .hasStorageAccess()
      .then((granted) => (granted ? null : document.requestStorageAccess()))
      // Browsers reject this without a user gesture; first-party use is fine.
      .catch(() => null);
  }, []);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <StorageProvider>
          <AppLayout />
        </StorageProvider>
      </JotaiProvider>
    </QueryClientProvider>
  );
}
