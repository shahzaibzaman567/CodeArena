import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  // In production builds VITE_CLERK_PUBLISHABLE_KEY must be set in Vercel env vars.
  // Throwing here crashes the Vercel build — render a clear error UI instead.
  document.getElementById('root').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;gap:12px"><h2>Configuration Error</h2><p>VITE_CLERK_PUBLISHABLE_KEY is not set. Please add it to your environment variables.</p></div>';
} else {

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.status === 401 || error?.status === 403) return false
        return failureCount < 3
      },
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
})

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
       <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
      </ClerkProvider>
      </BrowserRouter>
    </StrictMode>,
  )
} catch (error) {
  console.error('Failed to render application:', error)
}
}
