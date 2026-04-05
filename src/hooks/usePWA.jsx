import { useEffect, useState } from "react";

let deferredPrompt = null;

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("[PWA] SW register error:", err));

    const beforeInstallHandler = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    return () => window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
  };

  return { canInstall, install };
}

export function InstallButton() {
  const { canInstall, install } = usePWA();

  if (!canInstall) return null;

  return (
    <button
      onClick={install}
      className="min-h-[36px] rounded-full border border-amber-400 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/10"
    >
      Install App
    </button>
  );
}
