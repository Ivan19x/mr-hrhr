// Web vs installed app. Offline play, the sync queue and the service worker are
// app-only features (Capacitor mobile / desktop build); the website is always online.
type CapacitorGlobal = { isNativePlatform?: () => boolean };

export function isApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  // Desktop build / installed PWA runs in standalone display mode.
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}
