import { ToolKey } from "./bvinTools";

/* ============================================================================
   Business-type → recommended tool map, used by the "what kind of business
   are you?" AI picker in ToolsView (B-Vin.tsx → Settings → Enable Tools).
   Deliberately simple and hand-curated rather than model-driven — the actual
   "AI" here is just this lookup dressed up with a face and a search bar, so
   it's instant and never wrong about what exists in the app.
============================================================================ */

export interface BusinessTypeOption {
  key: string;
  label: string;
  emoji: string;
}

export const BUSINESS_TYPES: BusinessTypeOption[] = [
  { key: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { key: "salon", label: "Salon", emoji: "💇" },
  { key: "hotel", label: "Hotel", emoji: "🏨" },
  { key: "mechanic", label: "Mechanic", emoji: "🔧" },
  { key: "retail", label: "Retail shop", emoji: "🛍️" },
  { key: "service", label: "Service provider", emoji: "🧰" },
];

export const BUSINESS_TYPE_TOOLS: Record<string, ToolKey[]> = {
  restaurant: ["chat", "catalogue", "orders", "reservations", "receiveMoney", "receipts", "reviews", "requestStaff", "tableAssistance", "loyalty", "teamChat", "productStore"],
  salon: ["chat", "offerings", "reservations", "receiveMoney", "receipts", "reviews", "loyalty", "teamChat", "prices"],
  hotel: ["chat", "catalogue", "reservations", "receiveMoney", "receipts", "reviews", "contactBusiness", "teamChat", "jobRequests"],
  mechanic: ["chat", "jobRequests", "offerings", "receiveMoney", "receipts", "reviews", "contactBusiness", "teamChat", "productStore"],
  retail: ["chat", "catalogue", "prices", "orders", "receiveMoney", "receipts", "productStore", "teamChat", "loyalty"],
  service: ["chat", "offerings", "jobRequests", "receiveMoney", "receipts", "reviews", "contactBusiness", "teamChat"],
};
