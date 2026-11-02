import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary name="Recall" reloadOnly><App /></ErrorBoundary>
  </StrictMode>,
);
