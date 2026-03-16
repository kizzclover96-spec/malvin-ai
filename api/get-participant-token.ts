import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req: any, res: any) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: "Missing API keys in environment" });
  }

  // 1. GET THE DYNAMIC DATA FROM THE REQUEST
  // We use req.query for GET requests (which is what your fetch does)
  const roomName = req.query.room || "malvin-default-room";
  const participantName = req.query.username || `user_${Math.floor(Math.random() * 10000)}`;

  try {
    // 2. CREATE THE TOKEN WITH THE UNIQUE IDENTITY
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    // 3. APPLY THE GRANT TO THE UNIQUE ROOM
    at.addGrant({
      roomJoin: true,
      room: roomName, // Now it uses the dynamic name from the frontend!
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    
    res.status(200).json({ token });

  } catch (error) {
    console.error("Token generation failed:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
}