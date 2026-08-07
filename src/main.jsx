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
} else if ('serviceWorker' in navigator) {
  // Registers the web-push background handler for everyone NOT inside the
  // native app — a plain browser tab, or an iOS "Add to Home Screen"
  // install. Registering it here (once, at startup) rather than lazily
  // inside registerPushNotifications means it's already active by the
  // time permission is requested, which getToken() in
  // services/pushNotifications.ts requires.
  navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((err) => {
    console.warn('Web push service worker registration failed:', err);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);