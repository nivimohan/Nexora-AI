import { GoogleGenAI } from "@google/genai";

let currentKeyIndex = 0;

/** Retrieves all configured Gemini API keys in priority order */
export function getApiKeys() {
  const rawKeys = [
    process.env.GEMINI_API_KEY_PRIMARY,
    process.env.GEMINI_API_KEY_SECONDARY,
    process.env.GEMINI_API_KEY,
  ].filter((key) => key && key.trim() !== "");

  // Deduplicate while preserving order
  return [...new Set(rawKeys)];
}

/**
 * Executes a generateContent call against Gemini 2.5 Flash.
 * Automatically catches 429 Rate Limit errors, rotates to the secondary key,
 * and retries the request seamlessly.
 */
export async function callGeminiWithRotation({ model = "gemini-2.5-flash", contents, config }) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("No valid GEMINI_API_KEY defined in environment variables.");
  }

  let lastError = null;
  const maxAttempts = Math.max(1, keys.length);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const activeKey = keys[currentKeyIndex % keys.length];
    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return response;
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.code || err?.statusCode;
      const msg = (err?.message || "").toLowerCase();

      const isRateLimit =
        status === 429 ||
        msg.includes("429") ||
        msg.includes("resource_exhausted") ||
        msg.includes("quota") ||
        msg.includes("rate limit") ||
        msg.includes("rate_limit");

      if (isRateLimit && keys.length > 1) {
        const prevKeyIndex = currentKeyIndex;
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        console.warn(
          `⚠️ Gemini 429 Rate Limit on Key #${prevKeyIndex + 1}. Swapping to key #${currentKeyIndex + 1} and retrying immediately...`
        );
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}