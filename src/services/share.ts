import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * SHARING
 * ---------------------------------------------------------------------------
 * One entry point for "open the OS share sheet", because the two platforms
 * need completely different calls.
 *
 * navigator.share does NOT exist in the Android WebView — the Web Share API is
 * a Chrome-the-browser feature, not a WebView one. Calling it natively silently
 * does nothing, which is why sharing has to route through @capacitor/share on
 * device. And that plugin can't take File objects: it wants file:// URIs, so
 * any image has to be written to the cache directory first.
 */

export type ShareResult = 'shared' | 'cancelled' | 'unsupported' | 'failed';

export interface ShareFile {
  blob: Blob;
  /** Filename including extension — becomes the cached file's name. */
  name: string;
}

export interface ShareRequest {
  title?: string;
  text?: string;
  url?: string;
  files?: ShareFile[];
}

/** Filesystem.writeFile wants raw base64, without the data-URL prefix. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Android dismissal surfaces as a thrown error rather than a status, and the
 * wording differs between plugin versions — hence matching on the text.
 */
function isCancellation(err: any): boolean {
  if (err?.name === 'AbortError') return true;
  const message = String(err?.message ?? err ?? '').toLowerCase();
  return message.includes('cancel') || message.includes('abort') || message.includes('dismiss');
}

async function shareNative(request: ShareRequest): Promise<ShareResult> {
  const uris: string[] = [];

  try {
    for (const file of request.files ?? []) {
      // Cache, not Documents — these are transient share payloads and the OS
      // is free to reclaim them.
      const path = `shared/${Date.now()}-${file.name}`;
      await Filesystem.writeFile({
        path,
        data: await blobToBase64(file.blob),
        directory: Directory.Cache,
        recursive: true,
      });
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
      uris.push(uri);
    }
  } catch (err) {
    // Staging failed — still worth offering a text/link-only share rather than
    // failing the whole action.
    console.error('Share: could not stage files for sharing:', err);
    uris.length = 0;
  }

  // Android drops `url` when files are attached, so fold the link into the
  // text instead — otherwise the whole point of the share (the deep link)
  // vanishes exactly when images are included.
  const hasFiles = uris.length > 0;
  const text =
    hasFiles && request.url
      ? [request.text, request.url].filter(Boolean).join('\n\n')
      : request.text;

  try {
    await Share.share({
      title: request.title,
      text,
      url: hasFiles ? undefined : request.url,
      files: hasFiles ? uris : undefined,
      dialogTitle: request.title,
    });
    return 'shared';
  } catch (err) {
    if (isCancellation(err)) return 'cancelled';
    console.error('Share: native share failed:', err);
    return 'failed';
  }
}

async function shareWeb(request: ShareRequest): Promise<ShareResult> {
  if (!navigator.share) return 'unsupported';

  const files = (request.files ?? []).map(
    (f) => new File([f.blob], f.name, { type: f.blob.type })
  );

  try {
    if (files.length > 0 && navigator.canShare?.({ files })) {
      await navigator.share({ title: request.title, text: request.text, url: request.url, files });
      return 'shared';
    }
    await navigator.share({ title: request.title, text: request.text, url: request.url });
    return 'shared';
  } catch (err) {
    if (isCancellation(err)) return 'cancelled';
    console.error('Share: web share failed:', err);
    return 'failed';
  }
}

export async function shareContent(request: ShareRequest): Promise<ShareResult> {
  return Capacitor.isNativePlatform() ? shareNative(request) : shareWeb(request);
}

/**
 * True when the OS share sheet is actually reachable, so callers can decide
 * between offering "Share" and falling back to download/copy.
 */
export function canOpenShareSheet(): boolean {
  return Capacitor.isNativePlatform() || typeof navigator.share === 'function';
}

/**
 * navigator.clipboard needs a secure context, which the WebView has, but it
 * still fails on some Android builds — the textarea path is the fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
