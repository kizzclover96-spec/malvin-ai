import type React from "react";
import {
  MessageCircle,
  BookOpen,
  Wallet,
  ShoppingBag,
  UserPlus,
  Armchair,
  Phone,
  ClipboardList,
  CalendarCheck,
  Receipt,
  Gift,
  Tag,
  ListChecks,
  BarChart3,
  Users,
  Package,
  Layers,
  Bell,
  Clock,
  Star,
  Frown,
  Percent,
  CalendarDays,
  ReceiptText,
  Vote,
  FolderKanban,
  Database,
  Bot,
} from "lucide-react";

/* ============================================================================
   Shared tool catalog for the unified business/{uid} model.

   This is the single source of truth for which tools exist, what category
   they sit in, and — critically — whether the customer store is ever
   allowed to render them. B-Vin.tsx (business dashboard) and BVinStore.tsx
   (customer store) both import from here instead of keeping their own
   copies, so the two can never drift out of sync on what a customer is
   allowed to see.

   `customerVisible: false` is the actual enforcement point for "a tool
   marked as not available for customers is never shown, even if enabled."
   The underlying Firestore security rules back this up at the data layer
   (see firestore.rules — business-internal subcollections like
   jobRequests are owner/admin-read-only regardless of this flag), but the
   client-side check here is what stops the customer store from ever
   attempting to render or query them in the first place.
============================================================================ */

export type ToolKey =
  | "chat"
  | "catalogue"
  | "prices"
  | "offerings"
  | "orders"
  | "reservations"
  | "analytics"
  | "receiveMoney"
  | "vinbackTags"
  | "customerNotice"
  | "openingStatus"
  | "receipts"
  | "teamChat"
  | "reviews"
  | "loyalty"
  | "jobRequests"
  | "requestStaff"
  | "tableAssistance"
  | "contactBusiness"
  | "complaints"
  | "productStore"
  | "environment"
  | "specialOffers"
  | "bizWorkspace"
  | "bizExpenses"
  | "bizInvoices"
  | "bizPolls"
  | "bizProjects"
  | "bizRecords"
  | "bizAiAssistant";

export type ToolShape = "square" | "rectangle";
export type ToolCategory = "Customer Communication" | "Customer Information" | "In-Person Experience" | "Transactions & Bookings" | "Business Tools" | "Business, Organization & Community";

export interface ToolDef {
  key: ToolKey;
  label: string;
  icon: React.ElementType;
  description: string;
  category: ToolCategory;
  shape: ToolShape;
  alwaysOn?: boolean;
  noBento?: boolean;
  fixedPlacement?: "top-right" | "under-top-right";
  fullscreen?: boolean;
  /** false = business-only; the customer store must never render or query it. */
  customerVisible?: boolean;
  /** Tools whose backend cost scales with usage (extra seats, server-side scans, pushes) — gated behind Premium. */
  premiumOnly?: boolean;
}

export const CATEGORY_ORDER: ToolCategory[] = [
  "Customer Communication",
  "Customer Information",
  "In-Person Experience",
  "Transactions & Bookings",
  "Business Tools",
  "Business, Organization & Community",
];

export const CATEGORY_TINTS: Record<ToolCategory, string> = {
  "Customer Communication": "#4F9CF9",
  "Customer Information": "#9B7DF0",
  "In-Person Experience": "#F0975E",
  "Transactions & Bookings": "#3FBF8F",
  "Business Tools": "#8A8F98",
  "Business, Organization & Community": "#2563EB",
};

export const TOOLS: ToolDef[] = [
  { key: "customerNotice", label: "Live Notices", icon: Bell, description: "Post a message for every visitor.", category: "Customer Communication", shape: "square", alwaysOn: true, fixedPlacement: "top-right", customerVisible: true },
  { key: "openingStatus", label: "Opening Status", icon: Clock, description: "Show a live open/closed badge.", category: "Customer Communication", shape: "square", customerVisible: true },
  { key: "chat", label: "Chat", icon: MessageCircle, description: "Let customers message you directly.", category: "Customer Communication", shape: "square", noBento: true, customerVisible: true },
  { key: "reviews", label: "Reviews", icon: Star, description: "Collect ratings from customers.", category: "Customer Communication", shape: "square", customerVisible: true },
  { key: "specialOffers", label: "Special Offers", icon: Percent, description: "Design a deal sticker — the first thing customers see when they scan your store QR.", category: "Customer Communication", shape: "square", customerVisible: true },

  { key: "catalogue", label: "Online Catalogue", icon: BookOpen, description: "Show off products with photos.", category: "Customer Information", shape: "rectangle", customerVisible: true },
  { key: "prices", label: "Prices", icon: Wallet, description: "A quick text price list.", category: "Customer Information", shape: "square", customerVisible: true },
  { key: "offerings", label: "Products / Services", icon: ShoppingBag, description: "List what you offer and who's on your team.", category: "Customer Information", shape: "rectangle", customerVisible: true },

  { key: "requestStaff", label: "Request Staff", icon: UserPlus, description: "Customers can call staff over.", category: "In-Person Experience", shape: "square", customerVisible: true },
  { key: "tableAssistance", label: "Table Assistance", icon: Armchair, description: "Table-numbered help requests.", category: "In-Person Experience", shape: "square", customerVisible: true },
  { key: "contactBusiness", label: "Contact Business", icon: Phone, description: "Show a call/message button.", category: "In-Person Experience", shape: "square", customerVisible: true },
  { key: "complaints", label: "Complaints", icon: Frown, description: "Let customers raise an issue directly.", category: "In-Person Experience", shape: "square", customerVisible: true },

  { key: "orders", label: "Orders", icon: ClipboardList, description: "Take and track customer orders.", category: "Transactions & Bookings", shape: "square", customerVisible: true },
  { key: "reservations", label: "Reservations", icon: CalendarCheck, description: "Let people book a time slot.", category: "Transactions & Bookings", shape: "square", customerVisible: true },
  { key: "receiveMoney", label: "Receive Money", icon: Wallet, description: "Get paid straight to your account.", category: "Transactions & Bookings", shape: "square", customerVisible: false },
  { key: "receipts", label: "Receipts", icon: Receipt, description: "Send a receipt after every order.", category: "Transactions & Bookings", shape: "square", customerVisible: false },
  { key: "loyalty", label: "Loyalty", icon: Gift, description: "Reward repeat customers.", category: "Transactions & Bookings", shape: "square", customerVisible: true },
  { key: "vinbackTags", label: "VinBack Tags", icon: Tag, description: "Bring past customers back.", category: "Transactions & Bookings", shape: "square", alwaysOn: true, fixedPlacement: "under-top-right", customerVisible: false },
  { key: "jobRequests", label: "Job Requests", icon: ListChecks, description: "Track requests from received to done.", category: "Transactions & Bookings", shape: "rectangle", customerVisible: false },

  { key: "teamChat", label: "Add Workers", icon: Users, description: "Invite staff and choose what they're allowed to do.", category: "Business Tools", shape: "square", noBento: true, customerVisible: false, premiumOnly: true },
  { key: "productStore", label: "System Inventory", icon: Package, description: "Full inventory: SKUs, stock, suppliers. Connect it once to let workers scan and check stock.", category: "Business Tools", shape: "square", fullscreen: true, customerVisible: false },
  { key: "environment", label: "Environment", icon: Layers, description: "Track reselling sources and margins.", category: "Business Tools", shape: "square", fullscreen: true, customerVisible: false },

  { key: "bizWorkspace", label: "Workspace", icon: CalendarDays, description: "Schedule, forms, and sheets — your structured data in one place.", category: "Business, Organization & Community", shape: "square", fullscreen: true, customerVisible: false },
  { key: "bizExpenses", label: "Expenses", icon: Receipt, description: "Record business expenses and attach receipts.", category: "Business, Organization & Community", shape: "square", customerVisible: false },
  { key: "bizInvoices", label: "Invoices", icon: ReceiptText, description: "Create/manage invoices, download as PDF, and track their status.", category: "Business, Organization & Community", shape: "square", fullscreen: true, customerVisible: false },
  { key: "bizPolls", label: "Polls", icon: Vote, description: "Vote on decisions, ideas or internal matters.", category: "Business, Organization & Community", shape: "square", customerVisible: false },
  { key: "bizProjects", label: "Projects", icon: FolderKanban, description: "Projects, documents, and presentations — build it, then download or project it.", category: "Business, Organization & Community", shape: "square", fullscreen: true, customerVisible: false },
  { key: "bizRecords", label: "Records", icon: Database, description: "Structured records, and the reports they turn into.", category: "Business, Organization & Community", shape: "square", fullscreen: true, customerVisible: false },
  { key: "bizAiAssistant", label: "AI Assistant", icon: Bot, description: "Summarize, organize, draft and analyze administrative work. Appears as a chat bubble you can move anywhere.", category: "Business, Organization & Community", shape: "square", noBento: true, customerVisible: false },
];

export type ToolState = Record<ToolKey, boolean>;

export const DEFAULT_TOOLS: ToolState = {
  chat: false, catalogue: false, prices: false, offerings: false, orders: false, reservations: false,
  analytics: false, receiveMoney: false, vinbackTags: true, customerNotice: true,
  openingStatus: false, receipts: false, teamChat: false, reviews: false, loyalty: false,
  jobRequests: false, requestStaff: false, tableAssistance: false, contactBusiness: false, productStore: false,
  environment: false, complaints: false, specialOffers: false,
  bizWorkspace: false, bizExpenses: false,
  bizInvoices: false, bizPolls: false, bizProjects: false, bizRecords: false,
  bizAiAssistant: false,
};

/** Convenience lookup used by the customer store to gate rendering. */
export function isCustomerVisible(key: ToolKey): boolean {
  return TOOLS.find((t) => t.key === key)?.customerVisible !== false;
}