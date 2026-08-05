import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import { AppLayout } from "./components/AppLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <AppLayout />
      </JotaiProvider>
    </QueryClientProvider>
  );
}
