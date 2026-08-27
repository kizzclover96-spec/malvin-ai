import { ref, set, update, remove, serverTimestamp } from "firebase/database";
import { db as rtdb } from "../firebase";

/* ============================================================================
   Device/account pairing — same architectural pattern as B-Vin's existing
   scannerSessions (createScannerPairingSession / ScannerPairClaim.tsx), just
   for linking two Malvin accounts instead of borrowing a phone's camera.

   RTDB shape:
     devicePairing/{hostUid}/{token}: {
       status: 'pending' | 'scanned' | 'connected' | 'ended',
       createdAt, expiresAt,
       hostLabel: string,          // e.g. "Kizz's iPhone" — shown to the guest
       guestUid, guestLabel,       // set once scanned
     }

   The "use my phone as an external camera" sub-flow reuses the exact same
   relay idea as the scanner pairing feature: a short-lived session the
   phone claims, scans on its own camera, and writes the result back to —
   so the originating device never needed a camera at all.
     pairRelay/{relayId}: {
       status: 'pending' | 'done',
       createdAt, expiresAt,
       scannedValue: string | null,
     }
============================================================================ */

const PAIRING_TTL_MS = 5 * 60 * 1000;

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function pairingOrigin() {
  return typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? window.location.origin
    : "https://malvinai.com";
}

export async function createDevicePairingSession(hostUid: string, hostLabel: string) {
  const token = randomId();
  await set(ref(rtdb, `devicePairing/${hostUid}/${token}`), {
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: Date.now() + PAIRING_TTL_MS,
    hostLabel,
  });
  return { token, url: `${pairingOrigin()}/pair-device/${hostUid}/${token}` };
}

export async function revokeDevicePairingSession(hostUid: string, token: string) {
  try {
    await remove(ref(rtdb, `devicePairing/${hostUid}/${token}`));
  } catch {
    /* already gone — fine */
  }
}

export async function claimDevicePairing(hostUid: string, token: string, guestUid: string, guestLabel: string) {
  await update(ref(rtdb, `devicePairing/${hostUid}/${token}`), {
    status: "scanned",
    guestUid,
    guestLabel,
    scannedAt: serverTimestamp(),
  });
}

export async function markDevicePairingConnected(hostUid: string, token: string) {
  await update(ref(rtdb, `devicePairing/${hostUid}/${token}`), { status: "connected", connectedAt: serverTimestamp() });
}

export async function endDevicePairing(hostUid: string, token: string) {
  await update(ref(rtdb, `devicePairing/${hostUid}/${token}`), { status: "ended", endedAt: serverTimestamp() });
}

export function parsePairingUrl(text: string): { hostUid: string; token: string } | null {
  try {
    const m = text.match(/\/pair-device\/([^/]+)\/([^/?#]+)/);
    if (!m) return null;
    return { hostUid: m[1], token: m[2] };
  } catch {
    return null;
  }
}

/* -------------------------- camera relay sub-flow -------------------------- */

export async function createPairRelaySession() {
  const relayId = randomId();
  await set(ref(rtdb, `pairRelay/${relayId}`), {
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: Date.now() + PAIRING_TTL_MS,
    scannedValue: null,
  });
  return { relayId, url: `${pairingOrigin()}/pair-relay/${relayId}` };
}

export async function revokePairRelaySession(relayId: string) {
  try {
    await remove(ref(rtdb, `pairRelay/${relayId}`));
  } catch {
    /* already gone — fine */
  }
}

export async function submitRelayScan(relayId: string, scannedValue: string) {
  await update(ref(rtdb, `pairRelay/${relayId}`), { status: "done", scannedValue, scannedAt: serverTimestamp() });
}
