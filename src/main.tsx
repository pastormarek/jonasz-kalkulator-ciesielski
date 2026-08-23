/** Punkt wejścia aplikacji. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './ui/styles.css'

const korzen = document.getElementById('root')
if (korzen) {
  createRoot(korzen).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
