import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "sonner";
import App from './App'
import { ErrorFallback } from './ErrorFallback'
import { AdminAuthProvider } from "@/components/app/providers/AdminAuthProvider"

import "./main.css"
import "./styles/theme.css"
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <AdminAuthProvider>
      <App />
    </AdminAuthProvider>
    <Toaster position="top-right" />
   </ErrorBoundary>
)
