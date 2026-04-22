import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from "react-router-dom"; 
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
//my project
if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

const queryClient = new QueryClient()

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
