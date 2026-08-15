import QRCode from 'qrcode';

/**
 * Renders a VinBack tag's QR onto a single canvas: the QR itself (error
 * correction level 'H', since the center gets covered by the M roundel and
 * a lower level would make the code unreadable), an M badge over the
 * middle, and a caption underneath. Returns a PNG data URL.
 *
 * Colors match BrandedQrCode.tsx's Malvin brand palette (cream background,
 * dark-navy modules, blue accent) rather than having their own separate
 * look — this used to be its own gold/dark-navy theme, built before the
 * rest of the app's QR codes were given a consistent brand identity, and
 * got missed when that pass went through B-Vin.tsx (this one's built with
 * its own canvas code via the raw `qrcode` package, not through
 * react-qrcode-logo like everything else, so a search for QRCodeCanvas
 * usages never would have found it).
 */
export async function generateVinBackQr(url: string): Promise<string> {
  const qrSize = 320;
  const padding = 24;
  const captionHeight = 64;

  const BRAND = {
    bg: '#FDF8ED',      // warm cream, matches BrandedQrCode.tsx
    dot: '#0B1220',     // dark navy, matches BrandedQrCode.tsx
    blue: '#2F6FE0',    // Malvin blue, matches BrandedQrCode.tsx
  };

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: BRAND.dot, light: BRAND.bg },
  });

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = qrSize + padding * 2;
  finalCanvas.height = qrSize + padding * 2 + captionHeight;
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) return qrCanvas.toDataURL('image/png');

  // Background
  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // QR
  ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize);

  // M roundel, centered on the QR — navy fill, blue ring, white M (same
  // outer-navy/inner-blue relationship BrandedQrCode.tsx uses for the
  // three corner "eyes", so the two QR styles read as the same family).
  const centerX = padding + qrSize / 2;
  const centerY = padding + qrSize / 2;
  const roundelRadius = qrSize * 0.13;

  ctx.beginPath();
  ctx.arc(centerX, centerY, roundelRadius, 0, Math.PI * 2);
  ctx.fillStyle = BRAND.dot;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = BRAND.blue;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${Math.round(roundelRadius * 1.15)}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', centerX, centerY + 2);

  // Caption — two lines: the urgent instruction large and bold, the
  // brand line small underneath.
  ctx.fillStyle = BRAND.dot;
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCAN IF FOUND', finalCanvas.width / 2, padding * 2 + qrSize + captionHeight * 0.4);

  ctx.fillStyle = BRAND.blue;
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VINBACK · MALVIN', finalCanvas.width / 2, padding * 2 + qrSize + captionHeight * 0.75);

  return finalCanvas.toDataURL('image/png');
}

/** Unique, human-shareable code like "vinback-h3e762" for the owner's own reference. */
export function generateVinBackCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `vinback-${suffix}`;
}