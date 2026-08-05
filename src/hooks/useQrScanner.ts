import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * VINQR SCANNING
 * ---------------------------------------------------------------------------
 * Wraps html5-qrcode's low-level Html5Qrcode API and owns the camera lifecycle
 * for every scanner in the app.
 *
 * We deliberately don't use Html5QrcodeScanner (the high-level widget): it
 * renders its own "Request Camera Permissions" button and a file-upload
 * fallback, which fights the custom scanner overlays and never surfaces *why*
 * the camera failed. Here we ask for the camera up front — that call is what
 * makes Android show the runtime prompt — and expose a status the UI can
 * explain to the user.
 *
 * Requires android.permission.CAMERA in AndroidManifest.xml; Capacitor cannot
 * raise a prompt for a permission the app never declared.
 */

export type ScannerStatus =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'denied'
  | 'unavailable'
  | 'error';

type CameraAccess = 'granted' | 'denied' | 'unavailable';

/**
 * Opening a stream is the only cross-platform way to trigger the permission
 * prompt. We close it again immediately — html5-qrcode opens its own.
 */
async function requestCameraAccess(): Promise<CameraAccess> {
  if (!navigator.mediaDevices?.getUserMedia) return 'unavailable';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (err: any) {
    const name = err?.name;
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return 'unavailable';
    }
    return 'denied';
  }
}

async function stopSafely(instance: Html5Qrcode) {
  try {
    if (instance.isScanning) await instance.stop();
  } catch {
    /* already stopped, or the view was torn down first */
  }
  try {
    instance.clear();
  } catch {
    /* nothing mounted to clear */
  }
}

interface UseQrScannerOptions {
  /** id of the div the camera preview mounts into. Must be in the DOM. */
  elementId: string;
  /** Camera runs only while true — lets callers toggle it without unmounting. */
  active: boolean;
  onDecode: (text: string) => void;
}

export function useQrScanner({
  elementId,
  active,
  onDecode,
}: UseQrScannerOptions) {
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [attempt, setAttempt] = useState(0);

  // Kept in a ref so a caller passing an inline arrow function doesn't tear the
  // camera down and rebuild it on every render.
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  useEffect(() => {
    if (!active) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    let instance: Html5Qrcode | null = null;
    // A QR code sits in frame for many frames; without this the success
    // callback fires repeatedly and the caller navigates several times.
    let alreadyDecoded = false;

    (async () => {
      setStatus('starting');

      const access = await requestCameraAccess();
      if (cancelled) return;

      if (access !== 'granted') {
        setStatus(access === 'unavailable' ? 'unavailable' : 'denied');
        return;
      }

      if (!document.getElementById(elementId)) {
        setStatus('error');
        return;
      }

      try {
        instance = new Html5Qrcode(elementId, false);

        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (alreadyDecoded) return;
            alreadyDecoded = true;
            onDecodeRef.current(decodedText);
          },
          () => {
            /* fires on every frame without a code — normal, not an error */
          }
        );

        // StrictMode double-invokes effects in dev; if cleanup already ran
        // while start() was in flight, shut the camera we just opened.
        if (cancelled) {
          await stopSafely(instance);
          return;
        }
        setStatus('scanning');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (instance) stopSafely(instance);
    };
  }, [elementId, active, attempt]);

  return {
    status,
    /** Re-run the whole flow, e.g. after the user grants permission in Settings. */
    retry: () => setAttempt((n) => n + 1),
  };
}

/** Human-readable explanation for the non-scanning states. */
export function scannerStatusMessage(status: ScannerStatus): string | null {
  switch (status) {
    case 'starting':
      return 'Starting camera…';
    case 'denied':
      return 'Camera access was denied. Enable the Camera permission for Malvin AI in your device settings, then try again.';
    case 'unavailable':
      return 'No camera is available on this device.';
    case 'error':
      return "Couldn't start the camera. Try again.";
    default:
      return null;
  }
}
