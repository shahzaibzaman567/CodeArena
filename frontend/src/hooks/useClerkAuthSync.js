import { useAuth, useUser } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";

export async function waitForClerkToken(maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const token =
      (typeof window !== "undefined" && window.__clerk_token) ||
      (typeof window !== "undefined" && window.localStorage?.getItem("__clerk_token"));
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

export function useClerkAuthSync() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const [authTokenReady, setAuthTokenReady] = useState(false);

  const refreshToken = useCallback(async () => {
    if (!isLoaded) return null;

    if (!isSignedIn) {
      if (typeof window !== "undefined") {
        window.__clerk_token = null;
        window.localStorage?.removeItem("__clerk_token");
      }
      return null;
    }

    const token = await getToken({ skipCache: true });
    if (typeof window !== "undefined") {
      window.__clerk_token = token || null;
      if (token) window.localStorage.setItem("__clerk_token", token);
      else window.localStorage.removeItem("__clerk_token");
    }
    return token;
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__clerk_refresh_token = refreshToken;
    }

    return () => {
      if (typeof window !== "undefined") {
        delete window.__clerk_refresh_token;
      }
    };
  }, [refreshToken]);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (!isLoaded) {
        if (!cancelled) {
          setAuthReady(false);
          setAuthTokenReady(false);
        }
        return;
      }

      if (!isSignedIn) {
        if (typeof window !== "undefined") {
          window.__clerk_token = null;
          window.localStorage?.removeItem("__clerk_token");
        }
        if (!cancelled) {
          setAuthReady(true);
          setAuthTokenReady(false);
        }
        return;
      }

      try {
        const token = await getToken({ skipCache: true });
        if (cancelled) return;

        if (typeof window !== "undefined") {
          window.__clerk_token = token || null;
          if (token) window.localStorage.setItem("__clerk_token", token);
          else window.localStorage.removeItem("__clerk_token");
        }
        setAuthTokenReady(!!token);
      } catch (err) {
        console.error("[AuthSync] Failed to resolve Clerk token:", err?.message || err);
        if (typeof window !== "undefined") {
          window.__clerk_token = null;
          window.localStorage?.removeItem("__clerk_token");
        }
        setAuthTokenReady(false);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };

    setAuthReady(false);
    sync();
    const interval = setInterval(sync, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLoaded, isSignedIn, getToken]);

  return { authReady, authTokenReady, isLoaded, isSignedIn, refreshToken };
}
