import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
app.use(cors()); // Allows your Vite frontend (port 5173) to talk to this server

app.get('/token', async (req, res) => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("ERROR: LIVEKIT_API_KEY or LIVEKIT_API_SECRET is missing in .env");
    return res.status(500).json({ error: "Server misconfigured: Missing API keys" });
  }

  try {
    // Generate a random identity for the user
    const participantIdentity = "user_" + Math.random().toString(36).slice(2, 7);
    
    const at = new AccessToken(apiKey, apiSecret, { 
      identity: participantIdentity 
    });

    // Add permissions to join the room
    at.addGrant({ 
      roomJoin: true, 
      room: "malvin-room", 
      canPublish: true, 
      canSubscribe: true 
    });

    const token = await at.toJwt();
    
    // Send the token back to your Vite app
    res.json({ token });
    console.log(`✅ Token generated for ${participantIdentity}`);
  } catch (error) {
    console.error("Token generation failed:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Token server running on http://localhost:${PORT}`);
});