import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";


export const createBusinessStripeAccount =
httpsCallable(
    functions,
    "createBusinessStripeAccount"
);


export const createStripeOnboardingLink =
httpsCallable(
    functions,
    "createStripeOnboardingLink"
);


export const checkStripeAccount =
httpsCallable(
    functions,
    "checkStripeAccount"
);