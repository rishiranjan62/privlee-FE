// Fonts are served from this site rather than Google's: one fewer address to look up and no stylesheet from elsewhere
// holding up the first paint. Latin covers the text; latin-ext is only fetched if a character needs it (the rupee sign).
import "@fontsource/inter/latin-300.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-ext-400.css";
import "@fontsource/cormorant-garamond/latin-ext-500.css";
import "@fontsource/cormorant-garamond/latin-ext-600.css";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// After a new release the page a visitor already has open still names the old, now-deleted chunk files. Reload once to pick
// up the current build instead of leaving a blank screen; the flag stops a loop if the file is really missing.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('dd_chunk_reload')) return
    sessionStorage.setItem('dd_chunk_reload', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})
window.addEventListener('load', () => {
  try { sessionStorage.removeItem('dd_chunk_reload') } catch { /* private mode */ }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
