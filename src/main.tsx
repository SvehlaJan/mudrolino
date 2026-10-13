import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { ParentAccessProvider } from './shared/contexts/ParentAccessProvider';
import { initMonitoring, pageViewsEnabled } from './shared/services/monitoring';
import App from './App.tsx';
import './index.css';

const rootOptions = initMonitoring();

createRoot(document.getElementById('root')!, rootOptions).render(
  <StrictMode>
    <BrowserRouter>
      <ParentAccessProvider>
        <App />
      </ParentAccessProvider>
    </BrowserRouter>
    {pageViewsEnabled && <Analytics mode="production" />}
  </StrictMode>,
);
