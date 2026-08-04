import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import './index.css';
import App from './App.jsx';

// Native-only setup: edge-to-edge status bar + Google Auth initialization.
// GoogleAuth.initialize() MUST be called before GoogleAuth.signIn() or the
// native sign-in will silently hang / never return a result.
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize();
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);