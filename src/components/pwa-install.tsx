"use client";
import { useEffect, useState } from "react";
import { FaDownload, FaMobileAlt, FaTimes } from "react-icons/fa";

/**
 * Install-this-app (PWA) support, shown on EVERY page / link of the site:
 * - registers the service worker (/sw.js),
 * - a dismissible bottom banner invites the user to install the app on
 *   mobile, PC or laptop (Chrome/Edge fire `beforeinstallprompt`; iOS
 *   Safari gets Share → "Add to Home Screen" instructions instead),
 * - an "Install" button in the header (public-chrome / app header) reopens
 *   it any time by dispatching `window` event "sms:show-install",
 * - once installed (or running standalone) it never shows again.
 */

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "sms-install-dismissed-at";
const RE_SHOW_AFTER = 3 * 24 * 60 * 60 * 1000; // ask again after 3 days

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true; // iOS home-screen app

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

export default function PwaInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1) service worker (needed before Chrome/Edge offer the install prompt)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (isStandalone()) { setInstalled(true); return; }
    setIos(isIOS());

    // 2) Chrome / Edge / Android: the browser tells us the app can be installed
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - dismissedAt > RE_SHOW_AFTER) setVisible(true);
    };
    const onInstalled = () => { setInstalled(true); setVisible(false); setDeferred(null); };
    const onReopen = () => { // header "Install App" button
      if (isStandalone()) return;
      localStorage.removeItem(DISMISS_KEY);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("sms:show-install", onReopen);

    // Show the install offer on ANY page/link a visitor opens: Chrome/Edge
    // usually fire beforeinstallprompt above; iOS Safari and other browsers
    // get the manual instructions below instead. (Unless recently dismissed
    // — after "Later" we ask again in 3 days, and the header Install App
    // button can reopen it at any time.)
    const timer = setTimeout(() => {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - dismissedAt > RE_SHOW_AFTER) setVisible(true);
    }, 1500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("sms:show-install", onReopen);
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("pwa-banner-visible", visible);
    return () => document.body.classList.remove("pwa-banner-visible");
  }, [visible]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  async function install() {
    if (!deferred) return; // manual browsers: the banner text gives the steps
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => ({ outcome: "dismissed" }));
    setDeferred(null);
    if (choice.outcome === "accepted") setVisible(false);
    else dismiss();
  }

  if (installed || !visible) return null;

  return (
    <div className="pwa-install-banner fixed inset-x-3 bottom-3 z-50 sm:left-auto sm:right-5 sm:w-[380px]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }} role="dialog" aria-label="Install this app">
      <div className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-2xl ring-1 ring-slate-200">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl ring-1 ring-slate-200" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
            <FaMobileAlt className="shrink-0 text-blue-600" /> Install School Management
          </p>
          {ios && !deferred ? (
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500">
              On iPhone / iPad: tap the <b>Share</b> button, then <b>Add to Home Screen</b> to install this app.
            </p>
          ) : deferred ? (
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500">
              Install this app on your mobile, PC or laptop for quick, full-screen access — no app store needed.
            </p>
          ) : (
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500">
              Open your browser menu <b>(⋮)</b> and choose <b>Install app</b> / <b>Add to Home screen</b> to install it on this device.
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            {deferred ? (
              <button onClick={install} className="btn !min-h-[36px] flex-1 !px-3 !py-1.5 text-[13px] sm:flex-none sm:px-4">
                <FaDownload /> Install App
              </button>
            ) : (
              <button onClick={dismiss} className="btn !min-h-[36px] flex-1 !px-3 !py-1.5 text-[13px] sm:flex-none sm:px-4">Got it</button>
            )}
            <button onClick={dismiss} className="btn-light !min-h-[36px] !px-3 !py-1.5 text-[13px]">Later</button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Close install message" title="Close"
          className="icon-btn !h-7 !w-7 shrink-0 text-slate-400 hover:text-slate-600"><FaTimes /></button>
      </div>
    </div>
  );
}

/** Small header button (every page's top bar) that reopens the install banner. */
export function InstallButton({ className = "" }: { className?: string }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const check = () => setGone(isStandalone());
    check();
    const onInstalled = () => setGone(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);
  if (gone) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("sms:show-install"))}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/40 hover:bg-white/25 ${className}`}
      title="Install this app on your mobile, PC or laptop">
      <FaDownload className="text-xs" /> Install App
    </button>
  );
}
