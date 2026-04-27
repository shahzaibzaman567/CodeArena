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
import i18next from 'i18next';

i18next.init({
  lng: 'en',
  debug: false,
  initImmediate: false,
  resources: {
    en: {
      translation: {}
    }
  }
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

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
