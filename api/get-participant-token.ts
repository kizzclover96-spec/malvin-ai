import { AccessToken } from 'livekit-server-sdk';
import { adminAuth } from '../lib/firebaseAdmin';

/**
 * Mints a LiveKit access token for the signed-in user.
 *
 * SECURITY: this endpoint previously took `room` and `username` straight from
 * the query string with no authentication, so anyone who knew the URL could
 * mint a token with publish rights for *any* room — enough to join a private
 * conversation, broadcast into it, and run up unbounded LiveKit usage on the
 * account. Both of those inputs are now derived from a verified Firebase ID
 * token instead of being accepted from the caller.
 */

/** Rooms are namespaced per user so one token can't be replayed into another. */
function roomForUser(uid: string): string {
  return `malvin-${uid}`;
}

export default async function handler(req: any, res: any) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Missing API keys in environment' });
  }

  // Bearer token from the client's Firebase session.
  const header = String(req.headers?.authorization || req.headers?.Authorization || '');
  const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!idToken) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  let uid: string;
  let name: string;
  try {
    // checkRevoked so a signed-out or disabled account can't keep minting.
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    uid = decoded.uid;
    name = decoded.name || decoded.email || `user_${decoded.uid.slice(0, 8)}`;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: uid,
      name,
      // Short-lived: a leaked token stops being useful quickly.
      ttl: '15m',
    });

    at.addGrant({
      roomJoin: true,
      room: roomForUser(uid),
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.status(200).json({ token, room: roomForUser(uid) });
  } catch (error) {
    console.error('Token generation failed:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}
