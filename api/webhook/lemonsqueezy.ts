import { Buffer } from 'buffer';
import crypto from 'crypto';
import { adminDb } from '../../lib/firebaseAdmin'; // You'll need to set up Admin SDK

export const config = {
  api: { bodyParser: false }, // Crucial: Lemon Squeezy needs the raw body to verify the signature
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // 1. Verify the signature (Security)
  const rawBody = await getRawBody(req);
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
  const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

  if (!crypto.timingSafeEqual(digest, signature)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(rawBody.toString());
  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data; // This is where our userId lives

  // 2. Handle successful payment
  if (eventName === 'order_created' || eventName === 'subscription_created') {
    const userId = customData.user_id;
    const amount = payload.data.attributes.total / 100; // Convert cents to Euros

    if (userId) {
      const balanceRef = adminDb.ref(`users/${userId}/treasury/balance`);
      
      // Atomic increment to prevent balance errors
      await balanceRef.transaction((currentBalance) => {
        return (currentBalance || 0) + amount;
      });

      // Log the success in the ledger
      await adminDb.ref(`users/${userId}/treasury/ledger`).push({
        type: 'Inflow',
        amount: amount,
        label: 'Lemon_Squeezy_Top_Up',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
        status: 'Completed',
        timestamp: Date.now(),
      });
    }
  }

  res.status(200).send('Webhook processed');
}

// Helper to get raw body
async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}