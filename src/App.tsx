import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "./Router";
import { SocketProvider } from "./providers/SocketProvider";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <Router />
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
