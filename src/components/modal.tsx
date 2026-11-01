"use client";
import { useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";
export default function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    const focusable = () => Array.from(el?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []);
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key === "Tab") { const all = focusable(), first = all[0], last = all[all.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", key); previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`max-h-[94dvh] w-full overflow-y-auto rounded-xl bg-white shadow-xl ${wide ? "max-w-3xl" : "max-w-xl"}`}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-5 py-3"><h2 className="text-lg font-bold">{title}</h2><button className="icon-btn" aria-label="Close dialog" onClick={onClose}><FaTimes /></button></div>
      <div className="p-5">{children}</div>
    </div>
  </div>;
}
