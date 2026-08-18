import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, firestore as db, functions } from "./firebase";

import {
  registerPushNotifications,
  sendSignInNotification,
  resetSignInGreeting,
  notifyPendingWorkOnSignIn,
  resetPendingWorkReminder,
} from "./services/pushNotifications";

import {
  collection,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

import { MalvinSplash } from "./pages/system/MalvinSplash";
import Login from "./pages/auth/loginscreen";
import { UserOption } from "./pages/navigation/UserOption";

import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";


import AllAds from "./components/admin/AllAds";
import AdsManager from "./components/admin/AdsManagment";
import LandingPage from "./pages/system/LandingPage";
import CookieBanner from "./components/addons/CookieBanner";
import { InstallAppToast } from "./components/addons/InstallAppToast";
import PaymentResultScreen from "./components/addons/PaymentResultScreen";

import Terms from "./pages/system/Terms";
import Privacy from "./pages/system/Privacy";
import CookiePolicy from "./pages/system/CookiePolicy";
import CommunityGuidelines from "./pages/system/CommunityGuidelines";
import AiTransparencyNotice from "./pages/system/AiTransparencyNotice";
import About from "./pages/system/About";
import FAQ from "./pages/system/FAQ";
import RefundPolicy from "./pages/system/RefundPolicy";
import Impressum from "./pages/system/Impressum";

import MarketFront from "./components/business/MarketFront";
import Dashboard from "./components/business/dashboard";
import DeviceSwitch from "./pages/navigation/DeviceSwitch";
import MobileView from "./components/business/MobileView";
import Category from "./pages/navigation/Category";
import BVin from "./components/business/B-Vin";
import BVinStore from "./components/business/BVinStore";

import NoticeView from "./pages/system/NoticeView";
import ScannerPairClaim from "./pages/system/ScannerPairClaim";
import VinBackScan from "./components/vinback/VinBackScan";

import {
  BVinDeepLinkGate,
  consumePendingDeepLink,
} from "./components/addons/AppOpenGate";

import { FloatingTeamHub } from "./components/addons/FloatingTeamHub";
import { VinBackLauncher } from "./components/vinback/VinBackLauncher";
import { WorkerDashboard } from "./components/team/workerDashboard";
import { QrScannerView } from "./components/addons/QR Scanner";
import { SystemInventory } from "./components/records/SystemInventory";
import { MalvinAiPersonnelSystem } from "./components/admin/MalvinAiPersonnelSystem";
import { Front } from "./components/customer/Front";

import TicketCheckout from "./pages/auth/Ticket";
import Premium from "./components/addons/Premium";
import StripeSuccessPage from "./components/addons/StripeSuccess";

import { useSystemStatus } from "./hooks/useSystemStatus";
import {
  AccessGate,
  RestrictedScreen,
} from "./components/system/RestrictedScreen";

import { useAdminRole } from "./hooks/useAdminRole";
import AdminApplicationGate from "./components/admin/AdminApplicationGate";


function App() {
  /* ============================================================
     CORE APP STATE
  ============================================================ */

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  /*
    IMPORTANT:
    Splash is now completely independent from Firebase loading.

    This allows the animation to start immediately instead of waiting
    for authentication/network requests.
  */
  const [showSplash, setShowSplash] = useState(true);

  const [splashFinished, setSplashFinished] = useState(false);

  const [hasWokenUp, setHasWokenUp] = useState(false);

  const [showLogin, setShowLogin] = useState(false);

  const [dashboardToken, setDashboardToken] = useState("");

  const [uiMode, setUiMode] = useState(
    localStorage.getItem("ui_mode") || ""
  );

  const [isWorker, setIsWorker] = useState(false);

  const [assignedManagerUid, setAssignedManagerUid] = useState("");

  const [flowStep, setFlowStep] = useState("options");

  const [workerSubScreen, setWorkerSubScreen] =
    useState("dashboard");

  const [paymentResult, setPaymentResult] = useState(null);

  const [premiumStatus, setPremiumStatus] =
    useState("checking");

  const lastUidRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();


  /* ============================================================
     SYSTEM STATUS
  ============================================================ */

  const {
    status: systemStatus,
    loading: systemStatusLoading,
  } = useSystemStatus();


  /* ============================================================
     ADMIN ROLE
  ============================================================ */

  const adminRole = useAdminRole(user?.email);

  const isAdminUser = adminRole.isAdmin;


  /* ============================================================
     SPLASH COMPLETION
  ============================================================ */

  /*
    The splash animation itself controls when it is visually finished.

    Firebase loading is handled separately.

    The actual app is only revealed when BOTH are ready:

      1. Firebase/auth is ready
      2. Splash animation is finished
  */

  const handleSplashComplete = () => {
    setSplashFinished(true);

    /*
      Small delay is intentionally avoided.

      The splash CSS already performs its own fade-out.
    */
    setShowSplash(false);
  };


  /* ============================================================
     APP KILL SWITCH
  ============================================================ */

  useEffect(() => {
    if (
      systemStatus.appLocked &&
      user &&
      !isAdminUser
    ) {
      signOut(auth).catch((err) => {
        console.error(
          "Kill-switch forced sign-out failed:",
          err
        );
      });
    }
  }, [
    systemStatus.appLocked,
    user,
    isAdminUser,
  ]);


  /* ============================================================
     CAPACITOR DEEP LINKS
  ============================================================ */

  useEffect(() => {
    let removeListener;

    (async () => {
      try {
        const { Capacitor } =
          await import("@capacitor/core");

        if (!Capacitor.isNativePlatform()) {
          return;
        }

        const { App: CapacitorApp } =
          await import("@capacitor/app");

        const handle =
          await CapacitorApp.addListener(
            "appUrlOpen",
            ({ url }) => {
              try {
                const parsed = new URL(url);

                const uid =
                  parsed.pathname.replace(/^\/+/, "") ||
                  parsed.host;

                if (
                  parsed.protocol === "malvinai:" ||
                  url.startsWith("malvinai://")
                ) {
                  const kind =
                    url.includes("/salon/") ||
                    url.includes("salon:")
                      ? "salon"
                      : url.includes("/hotel/") ||
                        url.includes("hotel:")
                      ? "hotel"
                      : url.includes("/mechanic/") ||
                        url.includes("mechanic:")
                      ? "mechanic"
                      : url.includes("/service/") ||
                        url.includes("service:")
                      ? "service"
                      : "food";

                  const segments = url
                    .replace("malvinai://", "")
                    .split("/")
                    .filter(Boolean);

                  const routeUid =
                    segments[1] || uid;

                  const routeKind =
                    segments[0] === "salon"
                      ? "salon"
                      : segments[0] === "hotel"
                      ? "hotel"
                      : segments[0] === "mechanic"
                      ? "mechanic"
                      : segments[0] === "service"
                      ? "service"
                      : "food";

                  navigate(
                    `/${routeKind || kind}/${routeUid}`
                  );
                }
              } catch (err) {
                console.error(
                  "Failed to parse VinMoment deep link:",
                  err
                );
              }
            }
          );

        removeListener = () => {
          handle.remove();
        };
      } catch (err) {
        console.warn(
          "Capacitor App plugin unavailable for deep links:",
          err
        );
      }
    })();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [navigate]);


  /* ============================================================
     WALLET PAYMENT
  ============================================================ */

  const handleWalletPaymentExecution = async (
    amount,
    targetBusinessUid,
    customerUid,
    merchantType = "salon"
  ) => {
    if (!customerUid) {
      throw new Error(
        "Customer not authenticated."
      );
    }

    if (amount <= 0) {
      throw new Error(
        "Invalid checkout balance specification."
      );
    }

    const userDocRef = doc(
      db,
      "users",
      customerUid
    );

    const collectionName =
      merchantType === "food"
        ? "restaurantprofile"
        : "salons";

    const businessDocRef = doc(
      db,
      collectionName,
      targetBusinessUid
    );

    try {
      await runTransaction(
        db,
        async (transaction) => {
          const userSnap =
            await transaction.get(userDocRef);

          if (!userSnap.exists()) {
            throw new Error(
              "User file directory missing."
            );
          }

          const currentBalance =
            userSnap.data().wallet?.balance || 0;

          if (currentBalance < amount) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          const businessSnap =
            await transaction.get(
              businessDocRef
            );

          if (!businessSnap.exists()) {
            throw new Error(
              "Merchant registration not found."
            );
          }

          transaction.update(
            userDocRef,
            {
              "wallet.balance":
                currentBalance - amount,
            }
          );

          const currentStoreBalance =
            businessSnap.data().walletBalance ||
            businessSnap.data().wallet?.balance ||
            0;

          transaction.update(
            businessDocRef,
            {
              walletBalance:
                currentStoreBalance + amount,
            }
          );

          const userTxRef = doc(
            collection(
              db,
              "users",
              customerUid,
              "walletTransactions"
            )
          );

          transaction.set(
            userTxRef,
            {
              storeName:
                businessSnap.data().brandName ||
                businessSnap.data().salonName ||
                "Malvin Storefront Platform",

              amount,

              type: "spent",

              timestamp:
                serverTimestamp(),
            }
          );
        }
      );

      console.log(
        `Internal transfer finalized cleanly for ${collectionName}.`
      );

      setPaymentResult({
        status: "success",
      });
    } catch (error) {
      console.error(
        "Payment settlement error trace:",
        error
      );

      setPaymentResult({
        status: "failed",
        message:
          error?.message || undefined,
      });

      throw error;
    }
  };


  /* ============================================================
     SCAN ID REDIRECT
  ============================================================ */

  useEffect(() => {
    const urlParams =
      new URLSearchParams(
        window.location.search
      );

    const scanId =
      urlParams.get("scanId");

    if (
      scanId &&
      location.pathname === "/"
    ) {
      navigate(
        `/verify?scanId=${scanId}`,
        {
          replace: true,
        }
      );
    }
  }, [
    location,
    navigate,
  ]);


  /* ============================================================
     DIRECT PAYMENT FAILURE
  ============================================================ */

  useEffect(() => {
    const handleShellMessage = (
      event
    ) => {
      if (
        event.data?.type !==
        "DIRECT_PAYMENT_FAILURE"
      ) {
        return;
      }

      setPaymentResult({
        status: "failed",
        message:
          event.data.error ||
          undefined,
      });
    };

    window.addEventListener(
      "message",
      handleShellMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleShellMessage
      );
    };
  }, []);


  /* ============================================================
     STRIPE RETURN
  ============================================================ */

  useEffect(() => {
    const checkoutStatus =
      new URLSearchParams(
        location.search
      ).get("checkout");

    if (
      checkoutStatus !== "success" &&
      checkoutStatus !== "cancel"
    ) {
      return;
    }

    setFlowStep("front");

    setPaymentResult(
      checkoutStatus === "success"
        ? {
            status: "success",
          }
        : {
            status: "failed",
            message:
              "Payment was cancelled. Nothing was charged.",
          }
    );

    navigate(
      location.pathname,
      {
        replace: true,
        state: {},
      }
    );
  }, [
    location.search,
    location.pathname,
    navigate,
  ]);


  /* ============================================================
     FIREBASE AUTHENTICATION
     
     IMPORTANT PERFORMANCE CHANGE:
     
     Firebase initialization is now completely independent
     from the splash animation.

     Also:
     - No forced token refresh before claimTeamInvite
     - Push notifications don't block startup
     - Pending-work notification doesn't block startup
  ============================================================ */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {

          /* --------------------------------------------
             SIGNED OUT
          -------------------------------------------- */

          if (!currentUser) {
            if (lastUidRef.current) {
              resetSignInGreeting(
                lastUidRef.current
              );

              resetPendingWorkReminder(
                lastUidRef.current
              );

              lastUidRef.current = null;
            }

            setUser(null);
            setHasWokenUp(false);
            setShowLogin(false);
            setDashboardToken("");
            setPremiumStatus("checking");
            setIsWorker(false);
            setAssignedManagerUid("");

            localStorage.removeItem(
              "ui_mode"
            );

            setUiMode("");

            setLoading(false);

            return;
          }


          /* --------------------------------------------
             USER AUTHENTICATED
          -------------------------------------------- */

          setHasWokenUp(false);


          /*
            IMPORTANT:

            These operations are intentionally NOT awaited.

            They should happen in the background and never
            delay the visual application startup.
          */

          void sendSignInNotification(
            currentUser.uid,
            currentUser.displayName
          ).catch((error) => {
            console.error(
              "Sign-in notification failed:",
              error
            );
          });


          void notifyPendingWorkOnSignIn(
            currentUser.uid
          ).catch((error) => {
            console.error(
              "Pending work notification failed:",
              error
            );
          });


          /* --------------------------------------------
             OWNER ACCOUNT
          -------------------------------------------- */

          if (
            currentUser.email ===
            "kizzclover96@gmail.com"
          ) {
            lastUidRef.current =
              currentUser.uid;

            /*
              Don't block startup waiting for
              push registration.
            */
            void registerPushNotifications(
              currentUser.uid
            ).catch((error) => {
              console.error(
                "Push registration failed:",
                error
              );
            });

            setUser(currentUser);

            setLoading(false);

            return;
          }


          /* --------------------------------------------
             NORMAL ACCOUNT
          -------------------------------------------- */

          try {
            const targetEmail =
              currentUser.email
                ?.trim() || "";

            /*
              Team invite claim.

              We intentionally DO NOT call:

                await currentUser.getIdToken(true)

              before this.

              That forced network request was unnecessarily
              delaying startup.
            */

            if (targetEmail) {
              try {
                const claimTeamInvite =
                  httpsCallable(
                    functions,
                    "claimTeamInvite"
                  );

                const result =
                  await claimTeamInvite();

                const claimData =
                  result?.data || {};

                if (
                  claimData.isWorker &&
                  claimData.managerUid
                ) {
                  setAssignedManagerUid(
                    claimData.managerUid
                  );

                  setIsWorker(true);

                  /*
                    Only refresh the token AFTER the
                    server actually changed custom claims.
                  */
                  await currentUser.getIdToken(
                    true
                  );
                } else {
                  setIsWorker(false);
                  setAssignedManagerUid("");
                }
              } catch (claimError) {
                console.error(
                  "Team invite claim check failed:",
                  claimError
                );

                setIsWorker(false);
                setAssignedManagerUid("");
              }
            } else {
              setIsWorker(false);
              setAssignedManagerUid("");
            }

            lastUidRef.current =
              currentUser.uid;


            /*
              Push registration happens in the
              background.
            */
            void registerPushNotifications(
              currentUser.uid
            ).catch((error) => {
              console.error(
                "Push registration failed:",
                error
              );
            });


            setUser(currentUser);

            /*
              Firebase loading is now complete.

              The splash does NOT disappear yet.

              The splash controls its own animation timing.
            */
            setLoading(false);

          } catch (error) {
            console.error(
              "Error executing operational worker check:",
              error
            );

            lastUidRef.current =
              currentUser.uid;

            void registerPushNotifications(
              currentUser.uid
            ).catch((pushError) => {
              console.error(
                "Push registration failed:",
                pushError
              );
            });

            setUser(currentUser);

            setLoading(false);
          }
        }
      );

    return () => unsubscribe();
  }, []);


  /* ============================================================
     PREMIUM STATUS
     
     Runs AFTER user is available.
     
     IMPORTANT:
     No forced token refresh here.
  ============================================================ */

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        /*
          Don't force a network refresh here.

          The token cache is sufficient for the normal case.
        */
        let tokenResult =
          await user.getIdTokenResult();

        let isPremium =
          tokenResult.claims.premium === true;


        /*
          Only fall back to the Cloud Function if
          the claim isn't already present.
        */
        if (!isPremium) {
          const syncPremiumClaims =
            httpsCallable(
              functions,
              "syncPremiumClaims"
            );

          const result =
            await syncPremiumClaims();

          isPremium =
            result?.data?.premium === true;
        }


        if (!cancelled) {
          setPremiumStatus(
            isPremium
              ? "premium"
              : "free"
          );

          setDashboardToken(
            isPremium
              ? "MVN_PRM_VALID_2026_A9X7"
              : ""
          );
        }

      } catch (error) {
        console.error(
          "Premium status check failed:",
          error
        );

        if (!cancelled) {
          setPremiumStatus("free");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);


  /* ============================================================
     RESUME PENDING DEEP LINK
  ============================================================ */

  useEffect(() => {
    if (!user || isWorker) {
      return;
    }

    const pendingPath =
      consumePendingDeepLink();

    if (pendingPath) {
      navigate(
        pendingPath,
        {
          replace: true,
          state: {
            skipGate: true,
          },
        }
      );
    }
  }, [
    user,
    isWorker,
    navigate,
  ]);


  /* ============================================================
     FLOW STEP
  ============================================================ */

  useEffect(() => {
    if (!user || isWorker) {
      return;
    }

    if (location.state?.flowStep) {
      setFlowStep(
        location.state.flowStep
      );
    } else {
      setFlowStep("options");
    }
  }, [
    user,
    isWorker,
    location.state,
  ]);


  /* ============================================================
     CRITICAL STARTUP SCREEN
     
     THIS IS THE IMPORTANT FIX.
     
     Splash is rendered BEFORE loading finishes.

     Firebase can continue working in the background while
     the animation plays.
  ============================================================ */

  if (!splashFinished) {
    return (
      <MalvinSplash
        onComplete={handleSplashComplete}
      />
    );
  }


  /* ============================================================
     AUTH LOADING FALLBACK
  ============================================================ */

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "#fdfbf7",
          height: "100vh",
          width: "100%",
        }}
      />
    );
  }


  /* ============================================================
     ADMIN
  ============================================================ */

  const isAdmin =
    adminRole.isAdmin;

  const isPendingAdmin =
    !isAdmin &&
    !!adminRole.record &&
    adminRole.status !== "none";


  /* ============================================================
     KILL SWITCH
  ============================================================ */

  if (
    user &&
    !isAdmin &&
    systemStatus.appLocked
  ) {
    return (
      <RestrictedScreen
        message={systemStatus.message}
      />
    );
  }


  /* ============================================================
     STOREFRONT PATH
  ============================================================ */

  const isStorefrontPath =
    location.pathname.startsWith("/food/") ||
    location.pathname.startsWith("/salon/") ||
    location.pathname.startsWith("/hotel/") ||
    location.pathname.startsWith("/mechanic/") ||
    location.pathname.startsWith("/service/") ||
    location.pathname.startsWith("/store/") ||
    location.pathname.startsWith("/vinback/") ||
    location.pathname.startsWith("/chat/");


  /* ============================================================
     CATEGORY
  ============================================================ */

  const handleCategorySelect =
    (type) => {
      if (type === "fashion") {
        setFlowStep("device");
        return;
      }

      if (type === "records") {
        setFlowStep(
          "recordsDashboard"
        );
        return;
      }

      if (type === "premium") {
        setFlowStep("premiumView");
        return;
      }
    };


  /* ============================================================
     MAIN APPLICATION
  ============================================================ */

  return (
    <>
      <div
        className="App"
        style={{
          minHeight: "100vh",
        }}
      >
        <Routes>

          {/* ------------------------------------------
              STOREFRONTS
          ------------------------------------------ */}

          <Route
            path="/chat/:brandId"
            element={<MarketFront />}
          />

          <Route
            path="/vinback/:tagId"
            element={<VinBackScan />}
          />

          <Route
            path="/pair-scanner/:businessId/:sessionId"
            element={<ScannerPairClaim />}
          />

          <Route
            path="/store/:uid"
            element={
              <AccessGate
                locked={
                  systemStatus.storesLocked
                }
                message={
                  systemStatus.message
                }
              >
                <BVinDeepLinkGate />
                <BVinStore />
              </AccessGate>
            }
          />

          <Route
            path="/notice/:businessId"
            element={<NoticeView />}
          />


          {/* ------------------------------------------
              SYSTEM PAGES
          ------------------------------------------ */}

          <Route
            path="/terms"
            element={<Terms />}
          />

          <Route
            path="/cookiePolicy"
            element={<CookiePolicy />}
          />

          <Route
            path="/communityGuidelines"
            element={<CommunityGuidelines />}
          />

          <Route
            path="/aiTransparencyNotice"
            element={<AiTransparencyNotice />}
          />

          <Route
            path="/privacy"
            element={<Privacy />}
          />

          <Route
            path="/refund-policy"
            element={<RefundPolicy />}
          />

          <Route
            path="/impressum"
            element={<Impressum />}
          />

          <Route
            path="/allads"
            element={<AllAds />}
          />

          <Route
            path="/about"
            element={<About />}
          />

          <Route
            path="/faq"
            element={<FAQ />}
          />


          {/* ------------------------------------------
              VERIFICATION
          ------------------------------------------ */}

          <Route
            path="/verify"
            element={
              <MalvinAiPersonnelSystem
                userEmail={
                  user?.email || ""
                }
                currentUserId={
                  user?.uid || ""
                }
              />
            }
          />


          {/* ------------------------------------------
              PAYMENTS
          ------------------------------------------ */}

          <Route
            path="/ticket-checkout"
            element={
              <TicketCheckout
                onExecuteWalletPayment={
                  handleWalletPaymentExecution
                }
              />
            }
          />

          <Route
            path="/stripe-success"
            element={<StripeSuccessPage />}
          />

          <Route
            path="/customerchat"
            element={<MarketFront />}
          />


          {/* ------------------------------------------
              MAIN ROUTE
          ------------------------------------------ */}

          <Route
            path="/"
            element={
              !user ? (

                !showLogin ? (
                  <LandingPage
                    onLoginClick={() =>
                      setShowLogin(true)
                    }
                  />
                ) : (
                  <Login />
                )

              ) : isPendingAdmin ? (

                <AdminApplicationGate
                  record={
                    adminRole.record
                  }
                />

              ) : isAdmin ? (

                <AdsManager />

              ) : systemStatus.businessLocked &&
                (
                  isWorker ||
                  (
                    flowStep !== "options" &&
                    flowStep !== "front"
                  )
                ) ? (

                <RestrictedScreen
                  message={
                    systemStatus.message
                  }
                />

              ) : isWorker ? (

                workerSubScreen === "qr" ? (

                  <QrScannerView
                    businessUid={
                      assignedManagerUid
                    }

                    onScanSuccess={(
                      decodedText
                    ) => {
                      console.log(
                        "Scanned QR Text:",
                        decodedText
                      );

                      setWorkerSubScreen(
                        "dashboard"
                      );
                    }}

                    onBack={() =>
                      setWorkerSubScreen(
                        "dashboard"
                      )
                    }
                  />

                ) : (

                  <WorkerDashboard
                    businessUid={
                      assignedManagerUid
                    }

                    onNavigate={(
                      screen
                    ) => {
                      if (
                        screen === "qr"
                      ) {
                        setWorkerSubScreen(
                          "qr"
                        );
                      }
                    }}
                  />

                )

              ) : flowStep === "options" ? (

                <UserOption
                  onSelectCustomer={() =>
                    setFlowStep("front")
                  }

                  onSelectWorker={() =>
                    setFlowStep("BVin")
                  }

                  premiumStatus={
                    premiumStatus
                  }
                />

              ) : flowStep === "front" ? (

                <AccessGate
                  locked={
                    systemStatus.customerHubLocked
                  }
                  message={
                    systemStatus.message
                  }
                >
                  <Front
                    onExecuteWalletPayment={
                      handleWalletPaymentExecution
                    }
                  />
                </AccessGate>

              ) : flowStep === "BVin" ? (

                <BVin
                  businessId={
                    user?.uid
                  }

                  businessName={
                    user?.displayName ||
                    "My Business"
                  }

                  logoUrl={
                    user?.photoURL
                  }
                />

              ) : flowStep === "category" ? (

                <Category
                  onSelect={
                    handleCategorySelect
                  }
                />

              ) : flowStep ===
                "recordsDashboard" ? (

                <SystemInventory
                  userEmail={
                    user?.email
                  }
                  currentUserId={
                    user?.uid
                  }
                />

              ) : flowStep === "device" ? (

                <DeviceSwitch
                  onSelect={(mode) => {
                    setUiMode(mode);
                    setFlowStep("done");
                  }}
                />

              ) : flowStep ===
                "premiumView" ? (

                <Premium
                  onBack={() =>
                    setFlowStep(
                      "options"
                    )
                  }
                />

              ) : uiMode === "mobile" ? (

                <MobileView
                  brandId={
                    user.uid
                  }
                />

              ) : (

                <Dashboard
                  userEmail={
                    user.email
                  }
                  validationToken={
                    dashboardToken
                  }
                />
              )
            }
          />


          {/* ------------------------------------------
              FALLBACK
          ------------------------------------------ */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
              />
            }
          />

        </Routes>
      </div>


      {/* ========================================================
          FLOATING TEAM HUB
      ======================================================== */}

      {user &&
        !isAdmin &&
        !isStorefrontPath &&
        flowStep !== "BVin" &&
        (
          isWorker ||
          (
            flowStep !== "front" &&
            flowStep !== "options"
          )
        ) && (
          <FloatingTeamHub
            managerUid={
              isWorker
                ? assignedManagerUid
                : user.uid
            }
          />
        )}


      {/* ========================================================
          VINBACK LAUNCHER
      ======================================================== */}

      {user &&
        !isAdmin &&
        !isStorefrontPath &&
        flowStep !== "BVin" &&
        (
          isWorker ||
          (
            flowStep !== "front" &&
            flowStep !== "options"
          )
        ) && (
          <VinBackLauncher />
        )}


      {/* ========================================================
          GLOBAL UI
      ======================================================== */}

      <CookieBanner />

      <InstallAppToast />

      <PaymentResultScreen
        result={paymentResult}
        onDismiss={() =>
          setPaymentResult(null)
        }
      />
    </>
  );
}

export default App;