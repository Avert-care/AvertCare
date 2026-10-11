/**
 * AvertCare Frontend · API Client Configuration & Resiliency
 * 
 * Provides:
 * 1. getApiBaseUrl(): Intelligent resolution of backend endpoint.
 *    - Uses NEXT_PUBLIC_API_URL if explicitly set and valid.
 *    - Defaults to 'https://avertcare.onrender.com' in browser production/Vercel environments.
 *    - Defaults to 'http://localhost:8000' during local machine development.
 * 2. fetchWithColdStartRetry(): Seamless handling of Render free-tier spin-up delay (502/503/504).
 * 3. prewarmBackend(): Background fire-and-forget ping to wake dormant containers.
 */

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const isHosted =
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  if (envUrl && (!isHosted || !envUrl.includes("localhost"))) {
    return envUrl;
  }

  return isHosted ? "https://avertcare.onrender.com" : "http://localhost:8000";
}

export function isHostedEnvironment(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  );
}

export function prewarmBackend(): void {
  try {
    const base = getApiBaseUrl();
    fetch(`${base}/health`, { method: "GET" }).catch(() => {});
  } catch {
    // Suppress background errors during prewarm
  }
}

export async function fetchWithColdStartRetry(
  url: string,
  options: RequestInit,
  onProgress?: (message: string) => void,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1 && onProgress) {
        onProgress(`Waking up cloud engine (cold start, attempt ${attempt}/${maxRetries})…`);
      }
      const res = await fetch(url, options);
      // If Render is in cold boot cycle (502, 503, 504), wait and retry
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
        if (onProgress) {
          onProgress(`Cloud backend warming up (attempt ${attempt}/${maxRetries}, please wait)…`);
        }
        await new Promise((resolve) => setTimeout(resolve, 3500));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        if (onProgress) {
          onProgress(`Waking up cloud backend (attempt ${attempt}/${maxRetries}, please wait)…`);
        }
        await new Promise((resolve) => setTimeout(resolve, 3500));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Cloud backend unavailable after retry");
}
