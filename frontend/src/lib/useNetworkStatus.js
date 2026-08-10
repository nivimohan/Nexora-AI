import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — useNetworkStatus
// Tracks browser online/offline events and exposes a reactive boolean.
// Also listens for 'nexora:network-error' custom events dispatched by the
// axios interceptor when a request fails due to network unavailability.
// ─────────────────────────────────────────────────────────────────────────────
export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  // apiToast: holds a short-lived message from the axios interceptor
  const [apiToast, setApiToast] = useState(null);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline  = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);

    // ── Listen for axios network-error events ──────────────────────────────
    const handleApiError = (e) => {
      const msg = e.detail?.message || "Unable to reach Nexora servers. Please check your connection.";
      setApiToast(msg);
      // Auto-dismiss after 5 s
      setTimeout(() => setApiToast(null), 5000);
    };
    window.addEventListener("nexora:network-error", handleApiError);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("nexora:network-error", handleApiError);
    };
  }, []);

  return { isOffline, apiToast };
}
