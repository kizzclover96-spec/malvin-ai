import React from "react";

/**
 * The exact screen a blocked user sees, wherever they hit a locked scope.
 * Deliberately generic — it never says *why* (maintenance vs abuse
 * response vs a launch-day pause), since that's the admin's call to make
 * per-incident, not something to hardcode here.
 */
export function RestrictedScreen({ message }: { message?: string }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px",
        zIndex: 99999,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "2px solid #ff4d4d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          marginBottom: 24,
        }}
      >
        🔒
      </div>
      <h1 style={{ fontSize: "1.1rem", letterSpacing: "1px", marginBottom: 12 }}>
        ACCESS RESTRICTED
      </h1>
      <p style={{ opacity: 0.75, fontSize: "0.9rem", maxWidth: 380, lineHeight: 1.5 }}>
        {message || "Access to this feature has been restricted."}
      </p>
    </div>
  );
}

/**
 * Wrap any route/branch with this. When `locked` is true it swaps the
 * children out for the restricted screen instead of rendering them — the
 * protected component never mounts, so there's nothing for the frontend to
 * "hide" or fail to hide; it simply isn't there.
 *
 * This is a UX gate, not the security boundary — a determined attacker
 * could still call a Cloud Function directly while a scope is locked. The
 * actual enforcement for money-moving/write endpoints lives server-side in
 * malvinbackend (see assertNotLocked in systemStatus.ts). This component's
 * job is just to make sure real users never see or interact with a locked
 * section.
 */
export function AccessGate({
  locked,
  message,
  children,
}: {
  locked: boolean;
  message?: string;
  children: React.ReactNode;
}) {
  if (locked) return <RestrictedScreen message={message} />;
  return <>{children}</>;
}
