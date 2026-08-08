import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.jsx';

// Frontend error monitoring. VITE_SENTRY_DSN is a public value by design
// (that's how Sentry's client SDKs work — it identifies which project to
// send events to, it isn't a secret), so it's fine to ship in the bundle.
// Leave it unset locally and errors just won't be reported anywhere.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    // Rate-limit rejections are expected, user-facing behavior, not bugs —
    // don't let a burst of them fill up your Sentry quota.
    beforeSend(event, hint) {
      const err = hint?.originalException;
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : '';
      if (message.includes('resource-exhausted') || message.includes('Too many requests')) {
        return null;
      }
      return event;
    },
  });
}

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
    <Sentry.ErrorBoundary fallback={<p style={{ padding: 24, color: '#fff' }}>Something went wrong. Please reload the page.</p>}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);