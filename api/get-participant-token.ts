import { AccessToken } from 'livekit-server-sdk';

// We use 'any' for the req/res here to bypass the specific Next.js version conflict
export default async function handler(req: any, res: any) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: "Missing API keys in .env.local" });
  }

  const participantIdentity = `user_${Math.floor(Math.random() * 10000)}`;
  const roomName = "malvin-chat-room";

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    
    // Send the response
    res.status(200).json({ token });

  } catch (error) {
    console.error("Token generation failed:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
}