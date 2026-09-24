import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Prevent right-click (context menu)
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Prevent devtools keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // F12
  if (e.key === 'F12' || e.keyCode === 123) {
    e.preventDefault();
  }
  // Ctrl+Shift+I, J, C or U
  if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
    if (e.key === 'I' || e.key === 'i' || e.keyCode === 73) e.preventDefault();
    if (e.key === 'J' || e.key === 'j' || e.keyCode === 74) e.preventDefault();
    if (e.key === 'C' || e.key === 'c' || e.keyCode === 67) e.preventDefault();
  }
  // Ctrl+U
  if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
