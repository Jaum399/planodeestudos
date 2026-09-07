import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { preloadRoutes } from './utils/routePrefetch'

const scheduleIdlePrefetch = () => {
  const preload = () => preloadRoutes(['/login', '/register', '/app/dashboard']);
  const idleCallback = (window as Window & { requestIdleCallback?: (callback: () => void) => void }).requestIdleCallback;
  if (idleCallback) {
    idleCallback(preload);
    return;
  }
  window.setTimeout(preload, 900);
};

scheduleIdlePrefetch();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
