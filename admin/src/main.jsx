import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Automatically purge all legacy localStorage & sessionStorage data
if (typeof window !== 'undefined') {
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch (err) {
    console.warn('[Storage] Clear warning:', err);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
