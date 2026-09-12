import { useState, useEffect } from "react";

/**
 * Detects if the current user is running inside the native Android App,
 * Android WebView (e.g. YouPro APK wrapper), or installed PWA standalone mode.
 */
export function isRunningInApp(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Check URL parameters (e.g., ?app=true, ?source=app, ?platform=android, ?inapp=true)
  try {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("app") === "true" ||
      params.get("isApp") === "true" ||
      params.get("source") === "app" ||
      params.get("platform") === "android" ||
      params.get("platform") === "app" ||
      params.get("inapp") === "true" ||
      params.get("ref") === "apk"
    ) {
      localStorage.setItem("is_running_in_app", "true");
      return true;
    }
  } catch {}

  // 2. Check localStorage persistence
  try {
    if (localStorage.getItem("is_running_in_app") === "true") {
      return true;
    }
  } catch {}

  // 3. Check for Standalone / Installed PWA / TWA mode
  try {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return true;
  } catch {}

  // 4. Check Android WebView / Native App signatures
  try {
    const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();

    // Specific APK / App signatures
    if (
      ua.includes("youpro") ||
      ua.includes("app.youpro") ||
      ua.includes("androidapp")
    ) {
      return true;
    }

    // Android WebView signature ('wv' or 'Version/4.0' or 'Build' in standard WebView)
    const isAndroid = ua.includes("android");
    const isWebView =
      ua.includes("; wv") ||
      ua.includes(" wv)") ||
      /version\/[0-9.]+\s+chrome\/[0-9.]+\s+mobile\s+safari/i.test(ua) ||
      (isAndroid && ua.includes("version/") && !ua.includes("chrome/"));

    if (isAndroid && isWebView) {
      return true;
    }

    // Check window bridge object injected by native Android apps
    if (
      (window as any).Android ||
      (window as any).YouPro ||
      (window as any).AndroidBridge ||
      (window as any).jsBridge
    ) {
      return true;
    }

    // 5. Referrer from native app
    if (document.referrer && document.referrer.startsWith("android-app://")) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * React hook to reactively track if the user is running inside the app.
 */
export function useIsRunningInApp(): boolean {
  const [isInApp, setIsInApp] = useState<boolean>(() => isRunningInApp());

  useEffect(() => {
    setIsInApp(isRunningInApp());

    // Listen for display mode changes (e.g. user installs or launches PWA)
    try {
      const mediaQuery = window.matchMedia("(display-mode: standalone)");
      const handler = (e: MediaQueryListEvent) => {
        if (e.matches) setIsInApp(true);
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
      }
    } catch {}
  }, []);

  return isInApp;
}
