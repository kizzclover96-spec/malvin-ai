import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

// B-Vin "Apps & Connections" — inspects a URL server-side (metadata scrape
// + SSRF/Safe-Browsing checks) and saves it to
// business/{businessId}/connections/{id}. See addWebsiteConnection in
// malvinbackend/src/index.ts for what the safety check actually covers.
export const addWebsiteConnection = httpsCallable(functions, "addWebsiteConnection");

// B-Vin onboarding's 24-day welcome verification grant — deliberately a
// server-side call rather than a direct RTDB write. users/{uid}/isVerified
// and .../verifiedUntil are locked behind a .validate rule in
// database.rules.json that only the Admin SDK (which this callable uses)
// can satisfy, so this is the only legitimate way a client can get the
// grant. See grantOnboardingVerification in malvinbackend/src/index.ts.
export const grantOnboardingVerification = httpsCallable(functions, "grantOnboardingVerification");

// B-Vin Profile — Cancel Premium / Download My Data / Delete My Data. See
// the matching functions in malvinbackend/src/index.ts for what each
// actually does server-side (LemonSqueezy cancel call, Firestore+RTDB
// export, and full Firestore+RTDB+Auth erasure respectively).
export const cancelPremiumSubscription = httpsCallable(functions, "cancelPremiumSubscription");
export const downloadMyData = httpsCallable(functions, "downloadMyData");
export const deleteMyData = httpsCallable(functions, "deleteMyData");