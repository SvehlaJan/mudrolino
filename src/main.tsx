import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ParentAccessProvider } from './shared/contexts/ParentAccessProvider';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ParentAccessProvider>
        <App />
      </ParentAccessProvider>
    </BrowserRouter>
  </StrictMode>,
);
