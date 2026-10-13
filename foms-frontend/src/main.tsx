import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './global.css';
import { isDemoMode } from './config/runtimeMode';

async function bootstrap() {
  if (isDemoMode) {
    await import('./mockInterceptor');
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
