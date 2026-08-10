import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Pre-configured Axios Instance
// Base URL is /api — Vite dev server proxies this to http://localhost:5000
// ─────────────────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// ── Request interceptor: attach JWT from localStorage if present ──────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("nexora_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Helper: dispatch a nexora:network-error custom event ─────────────────────
// The OfflineBanner component listens for this and shows a floating toast.
function dispatchNetworkToast(message) {
  window.dispatchEvent(
    new CustomEvent("nexora:network-error", {
      detail: { message },
    })
  );
}

// ── Response interceptor: handle errors gracefully ───────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {

    // 1. Request timed out (Gemini AI long responses)
    if (error.code === "ECONNABORTED") {
      console.warn("[Nexora] AI request timed out — consider retrying.");
      // Don't toast for timeouts — calling code handles it with its own UI
    }

    // 2. Pure network failure — no internet or server unreachable
    //    Covers: ERR_INTERNET_DISCONNECTED, ERR_NAME_NOT_RESOLVED,
    //            ERR_CONNECTION_REFUSED, and the Axios "Network Error" string.
    else if (
      !navigator.onLine ||
      error.message === "Network Error" ||
      error.code === "ERR_NETWORK" ||
      error.code === "ERR_INTERNET_DISCONNECTED"
    ) {
      console.warn("[Nexora] Network unavailable:", error.message);
      dispatchNetworkToast(
        "Unable to reach Nexora servers. Please check your internet connection."
      );
    }

    // 3. 401 Unauthorised — token expired or revoked
    else if (error.response?.status === 401) {
      localStorage.removeItem("nexora_token");
      localStorage.removeItem("nexora_user");
      // Redirect to landing only if not already there
      if (!window.location.pathname.includes("/")) {
        window.location.href = "/";
      }
    }

    // 4. 429 Rate Limit (surfaced from Gemini key rotation fallback)
    else if (error.response?.status === 429) {
      console.warn("[Nexora] Rate limit hit — key rotation should handle this.");
    }

    // 5. 5xx Server errors — log but don't toast (feature components handle UI)
    else if (error.response?.status >= 500) {
      console.error("[Nexora] Server error:", error.response.status, error.response.data);
    }

    return Promise.reject(error);
  }
);

export default api;
