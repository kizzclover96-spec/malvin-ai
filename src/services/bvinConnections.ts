import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

// B-Vin "Apps & Connections" — inspects a URL server-side (metadata scrape
// + SSRF/Safe-Browsing checks) and saves it to
// business/{businessId}/connections/{id}. See addWebsiteConnection in
// malvinbackend/src/index.ts for what the safety check actually covers.
export const addWebsiteConnection = httpsCallable(functions, "addWebsiteConnection");
