import React from 'react';
import ReactDOM from 'react-dom/client';
import './mockInterceptor'; // ADDED MOCK INTERCEPTOR
import App from './App';
import './global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
