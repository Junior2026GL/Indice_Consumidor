import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import { setupSpanishFormValidationMessages } from './app/formValidationEs.js';
import './styles/global.css';

setupSpanishFormValidationMessages();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker (solo en producción) para que el navegador ofrezca instalar la app.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
