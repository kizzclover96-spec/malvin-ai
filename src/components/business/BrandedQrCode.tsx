import React from "react";
import { QRCode } from "react-qrcode-logo";

/* ============================================================================
   BrandedQrCode
   Every QR code the app generates should render through this, not raw
   qrcode.react — the whole point is that a Malvin QR code is recognizable
   as a Malvin QR code before anyone even scans it: warm cream background,
   dark-navy dot modules instead of harsh black squares, blue rounded
   "eyes" at the three corners, and the M mark sitting in the center.

   Deliberately NOT tied to a business's own accent color (colors.qr
   elsewhere in the app) — this is Malvin's own brand identity, meant to
   look the same on every single code regardless of which business
   generated it, the same way a Stripe or PayPal badge always looks like
   itself no matter whose checkout page it's on.

   Error correction is fixed at 'H' (30% redundancy) — required for the
   center logo to sit on top of real data modules without breaking
   scannability; anything lower and covering the center risks an
   unreadable code.
============================================================================ */

const BRAND = {
  bg: "#FDF8ED",      // warm cream, not pure white
  dot: "#0B1220",     // dark navy, not pure black
  eyeOuter: "#0B1220",
  eyeInner: "#2F6FE0", // Malvin blue
};

interface BrandedQrCodeProps {
  value: string;
  size?: number;
  id?: string;
  /** Set false only for very small/inline codes where the logo would make individual modules illegible. */
  showLogo?: boolean;
}

const BrandedQrCode: React.FC<BrandedQrCodeProps> = ({ value, size = 200, id, showLogo = true }) => {
  return (
    <QRCode
      id={id}
      value={value}
      size={size}
      quietZone={Math.round(size * 0.06)}
      bgColor={BRAND.bg}
      fgColor={BRAND.dot}
      qrStyle="dots"
      ecLevel="H"
      eyeRadius={[
        { outer: 14, inner: 5 },
        { outer: 14, inner: 5 },
        { outer: 14, inner: 5 },
      ]}
      eyeColor={[
        { outer: BRAND.eyeOuter, inner: BRAND.eyeInner },
        { outer: BRAND.eyeOuter, inner: BRAND.eyeInner },
        { outer: BRAND.eyeOuter, inner: BRAND.eyeInner },
      ]}
      {...(showLogo
        ? {
            logoImage: "/logo.png",
            logoWidth: Math.round(size * 0.22),
            logoHeight: Math.round(size * 0.22),
            logoPadding: Math.round(size * 0.02),
            logoPaddingStyle: "circle" as const,
            removeQrCodeBehindLogo: true,
          }
        : {})}
    />
  );
};

export default BrandedQrCode;
