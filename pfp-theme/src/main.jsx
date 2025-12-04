import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeFontProvider } from 'pfp-theme/ThemeFontContext';
import 'pfp-theme/pfp-theme-font.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeFontProvider>
      <App />
    </ThemeFontProvider>
  </React.StrictMode>
);
