import QRCode from 'qrcode';

/**
 * Renders a VinBack tag's QR onto a single canvas: the QR itself (error
 * correction level 'H', since the center gets covered by the M roundel and
 * a lower level would make the code unreadable), an M badge over the
 * middle, and a caption underneath. Returns a PNG data URL.
 */
export async function generateVinBackQr(url: string): Promise<string> {
  const qrSize = 320;
  const padding = 24;
  const captionHeight = 56;

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#0B1420', light: '#FFFFFF' },
  });

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = qrSize + padding * 2;
  finalCanvas.height = qrSize + padding * 2 + captionHeight;
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) return qrCanvas.toDataURL('image/png');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // QR
  ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize);

  // M roundel, centered on the QR
  const centerX = padding + qrSize / 2;
  const centerY = padding + qrSize / 2;
  const roundelRadius = qrSize * 0.13;

  ctx.beginPath();
  ctx.arc(centerX, centerY, roundelRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#0B1420';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#C9A227';
  ctx.stroke();

  ctx.fillStyle = '#C9A227';
  ctx.font = `700 ${Math.round(roundelRadius * 1.15)}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', centerX, centerY + 2);

  // Caption
  ctx.fillStyle = '#0B1420';
  ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCAN TO VINBACK TO OWNER', finalCanvas.width / 2, padding * 2 + qrSize + captionHeight / 2 - 4);

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