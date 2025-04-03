import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import App from "./App";
import "./index.css";
import { initEmailJS } from "./lib/emailService";
import { queryClient } from "./lib/queryClient";

// Initialize EmailJS
initEmailJS();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
