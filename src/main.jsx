import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import './index.css';
import App from './App.jsx';

// Make the app draw edge-to-edge (under the status bar) like a normal native app,
// instead of leaving a plain gap at the top. Only runs on native Android/iOS,
// never in the browser, so this is safe to keep even when testing on web.
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  // Use Style.Dark if your top header/background is light,
  // or Style.Light if your top header/background is dark.
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);