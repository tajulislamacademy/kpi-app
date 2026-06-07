import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/sonner'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <App />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  </StrictMode>,
)
