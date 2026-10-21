import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import client from './api/client'

// The free-tier API sleeps when idle; start waking it while the user is still on the page.
client.get('/api/health').catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
