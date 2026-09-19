"use client";

import { useEffect } from "react";
import { flushQueuedActions } from "@/lib/offline-queue";

export function OfflineSync() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const flush = () => { void flushQueuedActions(); };
    window.addEventListener("online", flush);
    if (navigator.onLine) flush();
    return () => window.removeEventListener("online", flush);
  }, []);
  return null;
}
