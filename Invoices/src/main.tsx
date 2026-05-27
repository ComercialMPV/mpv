import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Setup Tauri HTTP proxy before anything else renders
import { setupTauriHttpProxy } from './services/tauri-http-proxy';
setupTauriHttpProxy().then(() => {
  console.log('[Tauri Proxy] Setup complete');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
