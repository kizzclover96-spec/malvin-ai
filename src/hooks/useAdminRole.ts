import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { auth, db } from "../firebase";

// ============================================================================
// OWNER / SUPER-ADMIN
// ============================================================================
// The single hard-coded founder account. It always has every capability and
// is the only account that can grant the two highest-risk capabilities
// (manageAdmins, managePayments) to anyone else, and the only one that can
// revoke another admin entirely. Every other admin is provisioned through
// the invite -> application -> grant workflow below.
export const OWNER_EMAIL = "kizzclover96@gmail.com";

// ============================================================================
// CAPABILITIES
// ============================================================================
export type AdminCapabilityKey =
  | "viewUsers"
  | "viewBusinesses"
  | "manageReports"
  | "managePayments"
  | "manageAdmins"
  | "suspendUsers"
  | "deleteAccounts"
  | "viewSensitiveInfo"
  | "manageSupport";

export interface AdminCapabilityDef {
  key: AdminCapabilityKey;
  label: string;
  description: string;
  // Owner-restricted capabilities can only be GRANTED by the Owner account
  // (any admin can still request them via the application form).
  ownerOnly?: boolean;
}

export const ADMIN_CAPABILITIES: AdminCapabilityDef[] = [
  { key: "viewUsers", label: "View users", description: "See the merchant directory and user profiles." },
  { key: "viewBusinesses", label: "View businesses", description: "See business/brand details, category & activity." },
  { key: "manageReports", label: "Manage reports", description: "Review and resolve user/business reports." },
  { key: "managePayments", label: "Manage payments", description: "Edit balances, refunds & payment-related data.", ownerOnly: true },
  { key: "manageAdmins", label: "Manage admins", description: "Invite, approve, edit or revoke other admins.", ownerOnly: true },
  { key: "suspendUsers", label: "Suspend users", description: "Warn, suspend or ban user accounts." },
  { key: "deleteAccounts", label: "Delete accounts", description: "Permanently remove accounts & their data.", ownerOnly: true },
  { key: "viewSensitiveInfo", label: "View sensitive information", description: "See IP/device data & other sensitive fields.", ownerOnly: true },
  { key: "manageSupport", label: "Manage support inbox", description: "Read and reply to customer support emails in the Support tab." },
];

export type AdminCapabilities = Partial<Record<AdminCapabilityKey, boolean>>;

export const EMPTY_CAPABILITIES: AdminCapabilities = ADMIN_CAPABILITIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: false }),
  {} as AdminCapabilities
);

export const OWNER_CAPABILITIES: AdminCapabilities = ADMIN_CAPABILITIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: true }),
  {} as AdminCapabilities
);

// ============================================================================
// ADMIN RECORD
// ============================================================================
export type AdminStatus = "invited" | "pending_review" | "active" | "rejected" | "revoked";

export interface AdminApplication {
  fullName: string;
  reason: string;
  responsibilities: string;
  experience?: string;
  agreedToPolicy: boolean;
  submittedAt: number;
}

export interface AdminRecord {
  id: string; // sanitized email key
  email: string;
  status: AdminStatus;
  roleLabel?: string;
  capabilities: AdminCapabilities;
  invitedBy?: string; // email of inviting admin
  invitedByUid?: string;
  invitedAt?: number;
  expiresAt?: number;
  application?: AdminApplication;
  respondedBy?: string;
  respondedAt?: number;
  uid?: string; // filled in once the invited person actually signs in
}

// Realtime Database keys can't contain '.', '#', '$', '[' or ']'.
export function emailToAdminKey(email: string): string {
  return email.trim().toLowerCase().replace(/[.#$\[\]]/g, ",");
}

// ============================================================================
// LIVE HOOK — current signed-in user's admin standing
// ============================================================================
interface AdminRoleState {
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean; // owner OR an active admin record
  status: AdminStatus | "owner" | "none";
  record: AdminRecord | null;
  capabilities: AdminCapabilities;
  can: (key: AdminCapabilityKey) => boolean;
}

export function useAdminRole(email?: string | null): AdminRoleState {
  const resolvedEmail = email ?? auth.currentUser?.email ?? null;
  const [record, setRecord] = useState<AdminRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolvedEmail) {
      setRecord(null);
      setLoading(false);
      return;
    }
    const isOwner = resolvedEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
    if (isOwner) {
      // Owner never needs a DB record — skip the read entirely.
      setRecord(null);
      setLoading(false);
      return;
    }
    const key = emailToAdminKey(resolvedEmail);
    const recRef = ref(db, `admin/admins/${key}`);
    const unsub = onValue(
      recRef,
      (snap) => {
        const data = snap.val();
        setRecord(data ? { id: key, ...data } : null);
        setLoading(false);
      },
      (err) => {
        console.error("useAdminRole: read failed", err);
        setRecord(null);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [resolvedEmail]);

  const isOwner = !!resolvedEmail && resolvedEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isActiveAdmin = record?.status === "active";
  const isAdmin = isOwner || isActiveAdmin;
  const capabilities = isOwner ? OWNER_CAPABILITIES : record?.capabilities || EMPTY_CAPABILITIES;
  const status: AdminRoleState["status"] = isOwner ? "owner" : record?.status || "none";

  return {
    loading,
    isOwner,
    isAdmin,
    status,
    record,
    capabilities,
    can: (key: AdminCapabilityKey) => isOwner || !!capabilities[key],
  };
}
