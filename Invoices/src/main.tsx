import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { setupTauriHttpProxy } from './services/tauri-http-proxy';

setupTauriHttpProxy();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);