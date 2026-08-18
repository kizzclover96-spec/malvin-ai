import React, { useEffect, useState } from "react";
import "./MalvinSplash.css";

interface MalvinSplashProps {
  onComplete?: () => void;
}

export function MalvinSplash({
  onComplete,
}: MalvinSplashProps) {
  const [phase, setPhase] = useState<
    "boot" | "animate" | "hold" | "exit"
  >("boot");

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("animate");
    }, 100);

    const t2 = setTimeout(() => {
      setPhase("hold");
    }, 1500);

    const t3 = setTimeout(() => {
      setPhase("exit");
    }, 2400);

    const t4 = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      className={`splash-container ${
        phase === "exit" ? "splash-exit" : ""
      }`}
    >
      <div className="splash-lockup">

        {/* LOGO ROW */}
        <div
          className={`splash-logo ${
            phase === "animate" ? "animate" : ""
          } ${
            phase === "hold" ? "hold" : ""
          }`}
        >

          {/* STAR */}
          <div className="splash-star">
            <div className="splash-star-glow" />

            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="
                  M12 0
                  C12 6.62742 6.62742 12 0 12
                  C6.62742 12 12 17.3726 12 24
                  C12 17.3726 17.3726 12 24 12
                  C17.3726 12 12 6.62742 12 0Z
                "
                fill="url(#star-gradient)"
              />

              <defs>
                <linearGradient
                  id="star-gradient"
                  x1="0"
                  y1="0"
                  x2="24"
                  y2="24"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop
                    offset="0"
                    stopColor="#8B8FF8"
                  />

                  <stop
                    offset="0.5"
                    stopColor="#6366F1"
                  />

                  <stop
                    offset="1"
                    stopColor="#3730A3"
                  />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* MALVIN */}
          <span className="splash-brand-text">
            MALVIN
          </span>

        </div>

        {/* TAGLINE */}
        <div
          className={`splash-tagline ${
            phase === "animate" ? "animate" : ""
          } ${
            phase === "hold" ? "hold" : ""
          }`}
        >
          keeping your everything connected
        </div>

      </div>
    </div>
  );
}