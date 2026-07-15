import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { firestore as db } from '../firebase';

export default function StripeSuccessPage() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState("Verifying your Stripe connection...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAndRedirect = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setStatusMessage("Authentication context missing. Please log in.");
        setLoading(false);
        return;
      }

      try {
        // 1. Retrieve the business's saved Stripe Account ID
        // Note: Check salons collection, if not found check restaurantprofile
        let targetCollection = "salons";
        let docRef = doc(db, targetCollection, user.uid);
        let docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          targetCollection = "restaurantprofile";
          docRef = doc(db, targetCollection, user.uid);
          docSnap = await getDoc(docRef);
        }

        if (!docSnap.exists()) {
          throw new Error("Business profile not found.");
        }

        const data = docSnap.data();
        const stripeAccountId = data?.stripeAccountId;

        if (!stripeAccountId) {
          throw new Error("Stripe Account ID is missing from your profile.");
        }

        // 2. Call the cloud function in the background to fetch actual Stripe API state
        const functions = getFunctions();
        const checkStatus = httpsCallable(functions, 'checkStripeAccount');
        
        setStatusMessage("Securing details with Stripe...");
        await checkStatus({
          stripeAccountId: stripeAccountId,
          businessId: user.uid,
          merchantType: targetCollection === "salons" ? "salon" : "food"
        });

        setStatusMessage("Connection verified! Redirecting to dashboard...");
        setTimeout(() => {
          navigate("/dashboard"); // Route back to dashboard
        }, 2000);

      } catch (error: any) {
        console.error("Auto Stripe Verification Error: ", error);
        setStatusMessage(`Verification failed: ${error.message || "Please check manually inside your dashboard."}`);
        setLoading(false);
      }
    };

    verifyAndRedirect();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '40px', background: '#111', border: '1px solid #222', borderRadius: '16px', textAlign: 'center', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '16px' }}>Stripe Onboarding</h2>
        <p style={{ color: '#aaa', fontSize: '15px', lineHeight: '1.5' }}>{statusMessage}</p>
        {loading && (
          <div style={{ margin: '24px auto 0 auto', width: '30px', height: '30px', border: '3px solid #333', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        )}
        {!loading && (
          <button 
            onClick={() => navigate("/dashboard")} 
            style={{ marginTop: '24px', padding: '12px 24px', background: '#fff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Go to Dashboard
          </button>
        )}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}