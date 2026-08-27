import React, { useState, useEffect, useRef } from "react";
import { TeamHub } from "../team/teamHub"; // Path to your TeamHub component
import { firestore as db, auth } from "../../firebase"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";

interface FloatingTeamHubProps {
  managerUid: string; 
}

export const FloatingTeamHub: React.FC<FloatingTeamHubProps> = ({ managerUid }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 }); 
  const [unreadCount, setUnreadCount] = useState(0);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 20, y: 20 });
  const currentUserId = auth.currentUser?.uid;

  // --- Sync Global Activity Counts ---
  useEffect(() => {
    if (!managerUid || !currentUserId) return;

    // 1. Listen for unread messages (where isRead == false and sender is NOT current user)
    const msgQuery = query(
      collection(db, 'managerMembers', managerUid, 'messages'),
      where('isRead', '==', false)
    );

    const unsubMsgs = onSnapshot(msgQuery, (snapshot) => {
      let incomingUnread = 0;
      snapshot.forEach((d) => {
        if (d.data().senderUid !== currentUserId) {
          incomingUnread++;
        }
      });
      
      // If the hub is open, you might want to auto-clear or reduce this count
      setUnreadCount(isOpen ? 0 : incomingUnread);
    });

    return () => unsubMsgs();
  }, [managerUid, currentUserId, isOpen]);

  // Reset count when user opens the workspace panel
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Handle Drag / Pointer Logic
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging.current) return;
    
    const deltaX = dragStart.current.x - e.clientX;
    const deltaY = dragStart.current.y - e.clientY;

    const newX = Math.max(10, Math.min(window.innerWidth - 70, initialPos.current.x + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 70, initialPos.current.y + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const moveDistance = Math.hypot(dragStart.current.x - e.clientX, dragStart.current.y - e.clientY);
    if (moveDistance < 5) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: "fixed",
          right: `${position.x}px`,
          bottom: `${position.y}px`,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(30, 30, 30, 0.75)", // Darkened slightly for clear badge contrast
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.36)",
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          touchAction: "none",
        }}
      >
        {/* Simple Chat Message SVG Icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>

        {/* 🔴 DYNAMIC NOTIFICATION BADGE */}
        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              backgroundColor: "#FF3B30", // iOS Red Alert color
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: "700",
              minWidth: "18px",
              height: "18px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
              boxSizing: "border-box",
              border: "1.5px solid rgba(30, 30, 30, 1)", // Clean visual knockout mask border
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              pointerEvents: "none"
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>

      {/* Embedded Full Screen Team Hub — TeamHub renders its own fixed, full-viewport frame */}
      {isOpen && (
        <>
          <style>{`
            @keyframes fthSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
            .fth-mount { animation: fthSlideUp 0.24s cubic-bezier(0.2,0.7,0.3,1) both; }
          `}</style>
          <div className="fth-mount" style={{ position: "fixed", inset: 0, zIndex: 9998 }}>
            <TeamHub managerUid={managerUid} onClose={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </>
  );
};