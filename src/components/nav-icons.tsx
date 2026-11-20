import React from "react";

export function NavIcon({ href }: { href: string }) {
  const cls = "h-[18px] w-[18px] shrink-0";
  switch (href) {
    case "/dashboard":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#ffffff" />
          <rect x="5" y="11" width="3.5" height="8" rx="1" fill="#16a34a" />
          <rect x="10.25" y="6" width="3.5" height="13" rx="1" fill="#ef4444" />
          <rect x="15.5" y="9" width="3.5" height="10" rx="1" fill="#2563eb" />
        </svg>
      );
    case "/students":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M12 3L1.5 8.5L12 14L22.5 8.5L12 3Z" fill="#38bdf8" />
          <path d="M6 11.2V16.2C6 18.2 8.7 19.8 12 19.8C15.3 19.8 18 18.2 18 16.2V11.2L12 14.3L6 11.2Z" fill="#eab308" />
          <path d="M20.5 9.5V16.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20.5" cy="17.5" r="1.6" fill="#f59e0b" />
        </svg>
      );
    case "/attendance":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="18" rx="2.5" fill="#ffffff" />
          <rect x="3.5" y="3.5" width="17" height="5" rx="2" fill="#2563eb" />
          <rect x="7" y="1.8" width="2.4" height="4" rx="1" fill="#fbbf24" />
          <rect x="14.6" y="1.8" width="2.4" height="4" rx="1" fill="#fbbf24" />
          <path d="M7 11.5H7.5M10.5 11.5H11M14 11.5H14.5M17 11.5H17.5M7 15H7.5M10.5 15H11M14 15H14.5" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="17" cy="17.5" r="4.2" fill="#22c55e" />
          <path d="M15 17.6L16.3 18.9L19 16.2" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "/gr-register":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="4" y="2.5" width="16" height="19" rx="2.5" fill="#10b981" />
          <rect x="4" y="2.5" width="3.5" height="19" rx="1.5" fill="#fde68a" />
          <rect x="9.5" y="6.5" width="8" height="5" rx="1" fill="#ffffff" />
          <path d="M9.5 14.5H17.5M9.5 17.5H15" stroke="#d1fae5" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "/fees":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M9 4L7.5 2H16.5L15 4H9Z" fill="#fde047" />
          <path d="M12 5C7.5 6.8 5 10.6 5 15.2C5 18.8 7.8 21 12 21C16.2 21 19 18.8 19 15.2C19 10.6 16.5 6.8 12 5Z" fill="#fbbf24" />
          <rect x="8.5" y="4.2" width="7" height="2" rx="1" fill="#ef4444" />
          <path d="M12 9.5V17.5M14.2 11.2C14.2 10.3 13.2 9.8 12 9.8C10.8 9.8 9.8 10.4 9.8 11.3C9.8 12.3 10.8 12.7 12 13.1C13.2 13.5 14.2 14 14.2 15.1C14.2 16.1 13.2 16.8 12 16.8C10.7 16.8 9.7 16.2 9.7 15.2" stroke="#14532d" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "/payroll":
    case "/fee-receivable":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="2" y="5" width="16" height="11" rx="2" fill="#22c55e" />
          <circle cx="10" cy="10.5" r="2.5" fill="#bbf7d0" />
          <circle cx="17.5" cy="16.5" r="4.5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
        </svg>
      );
    case "/diary":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="4" y="4" width="14" height="17.5" rx="2" fill="#ffffff" />
          <rect x="8" y="2" width="6" height="3.5" rx="1.2" fill="#f59e0b" />
          <path d="M7 9.5H15M7 13H14M7 16.5H11.5" stroke="#3b82f6" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M15 17.5L20 12.5L22 14.5L17 19.5L14.5 20L15 17.5Z" fill="#ef4444" />
        </svg>
      );
    case "/papers":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M5 2.5H14.5L19.5 7.5V21.5H5V2.5Z" fill="#ffffff" />
          <path d="M14.5 2.5V7.5H19.5L14.5 2.5Z" fill="#38bdf8" />
          <path d="M8 11H16M8 14.5H16M8 18H12.5" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17" cy="17.5" r="3.5" fill="#22c55e" />
          <path d="M15.6 17.5L16.6 18.5L18.6 16.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "/exams":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M5 2.5H14.5L19.5 7.5V21.5H5V2.5Z" fill="#ffffff" />
          <path d="M14.5 2.5V7.5H19.5L14.5 2.5Z" fill="#34d399" />
          <path d="M8 11H16M8 14.5H16M8 18H12.5" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16.5" cy="16.5" r="3.4" fill="#f59e0b" />
          <path d="M16.5 14.6L17.1 15.9L18.5 16L17.4 16.9L17.7 18.3L16.5 17.6L15.3 18.3L15.6 16.9L14.5 16L15.9 15.9L16.5 14.6Z" fill="#ffffff" />
        </svg>
      );
    case "/results":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="3" y="3.5" width="18" height="17" rx="2.5" fill="#ffffff" />
          <path d="M3 8.5H21" stroke="#f59e0b" strokeWidth="2.4" />
          <path d="M7 12.5H9.5V18H7V12.5Z" fill="#22c55e" />
          <path d="M11.2 10.5H13.7V18H11.2V10.5Z" fill="#3b82f6" />
          <path d="M15.4 14H17.9V18H15.4V14Z" fill="#ef4444" />
        </svg>
      );
    case "/marks":
    case "/teachers/marks":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="3" y="4" width="17" height="4.5" rx="1.2" fill="#22c55e" />
          <rect x="16.5" y="4.8" width="3" height="2.9" fill="#fef3c7" />
          <rect x="4" y="9.8" width="17" height="4.5" rx="1.2" fill="#ef4444" />
          <rect x="17.5" y="10.6" width="3" height="2.9" fill="#fef3c7" />
          <rect x="2.5" y="15.5" width="17" height="4.5" rx="1.2" fill="#3b82f6" />
          <rect x="16" y="16.3" width="3" height="2.9" fill="#fef3c7" />
        </svg>
      );
    case "/teachers":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="7" y="3" width="15" height="11" rx="1.8" fill="#16a34a" stroke="#fbbf24" strokeWidth="1.6" />
          <path d="M11 7.5H18.5M11 10.5H16" stroke="#dcfce7" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="6.5" cy="11.5" r="3" fill="#fdba74" />
          <path d="M2 20.5C2 17.6 4 15.8 6.5 15.8C9 15.8 11 17.6 11 20.5H2Z" fill="#38bdf8" />
        </svg>
      );
    case "/timetable":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M4.5 5.5L7.5 3M19.5 5.5L16.5 3" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="13" r="8.5" fill="#ef4444" />
          <circle cx="12" cy="13" r="6.3" fill="#ffffff" />
          <path d="M12 9.5V13L14.5 14.8" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "/account-types":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M3 6.5C3 5.4 3.9 4.5 5 4.5H9.5L11.5 6.8H19C20.1 6.8 21 7.7 21 8.8V18.5C21 19.6 20.1 20.5 19 20.5H5C3.9 20.5 3 19.6 3 18.5V6.5Z" fill="#f59e0b" />
          <rect x="5.5" y="10" width="13" height="7.5" rx="1.5" fill="#fef3c7" />
        </svg>
      );
    case "/accounts":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="4" y="2.5" width="16" height="19" rx="2.5" fill="#a855f7" />
          <path d="M14 2.5H17.5V9.5L15.75 8L14 9.5V2.5Z" fill="#fbbf24" />
          <path d="M8 12.5H16M8 16H13.5" stroke="#f3e8ff" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "/entries":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M4 3H16V19.5L14 18L12 19.5L10 18L8 19.5L6 18L4 19.5V3Z" fill="#ffffff" />
          <path d="M7 7.5H13M7 11H13M7 14.5H10.5" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17.5" cy="16.5" r="4.5" fill="#fbbf24" />
          <path d="M17.5 14.2V18.8M16.2 15.5H18.4M16.2 17.5H18.4" stroke="#92400e" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "/reports":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="3.5" y="2.5" width="15" height="19" rx="2.2" fill="#f59e0b" />
          <rect x="3.5" y="2.5" width="3" height="19" rx="1" fill="#fde047" />
          <rect x="9" y="7" width="11.5" height="11.5" rx="2" fill="#ffffff" />
          <path d="M11 15.5L13.5 12.5L15.5 14L18.5 10" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "/payment-accounts":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M12 2.5L2.5 8H21.5L12 2.5Z" fill="#fbbf24" />
          <rect x="5" y="9" width="2.5" height="8.5" fill="#ffffff" />
          <rect x="10.75" y="9" width="2.5" height="8.5" fill="#ffffff" />
          <rect x="16.5" y="9" width="2.5" height="8.5" fill="#ffffff" />
          <rect x="3" y="18" width="18" height="3" rx="1" fill="#38bdf8" />
        </svg>
      );
    case "/whatsapp-settings":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M12 2.5C6.8 2.5 2.6 6.6 2.6 11.7C2.6 13.5 3.1 15.2 4 16.6L2.8 21.2L7.6 20C9 20.7 10.4 21 12 21C17.2 21 21.4 16.9 21.4 11.8C21.4 6.6 17.2 2.5 12 2.5Z" fill="#25D366" />
          <path d="M8.8 7.6C8.5 7.6 8 7.8 7.7 8.2C7.3 8.6 6.8 9.3 6.8 10.6C6.8 11.9 7.8 13.3 8 13.5C8.2 13.7 9.9 16.4 12.7 17.5C15 18.4 15.5 18.2 16 18.1C16.5 18 17.6 17.4 17.8 16.8C18 16.2 18 15.7 17.9 15.6C17.8 15.5 17.6 15.4 17.2 15.2C16.8 15 15.4 14.3 15.1 14.2C14.8 14.1 14.6 14 14.4 14.3C14.2 14.6 13.7 15.2 13.5 15.4C13.3 15.6 13.1 15.6 12.8 15.4C12.5 15.2 11.4 14.9 10.2 13.8C9.3 13 8.7 12 8.5 11.6C8.3 11.3 8.5 11.1 8.7 10.9C8.9 10.7 9.1 10.5 9.2 10.3C9.4 10.1 9.4 9.9 9.5 9.7C9.6 9.5 9.5 9.3 9.4 9.1C9.3 8.9 8.9 7.9 8.8 7.6Z" fill="#ffffff" />
        </svg>
      );
    case "/staff-attendance":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" fill="#ffffff" />
          <circle cx="12" cy="9" r="2" fill="#2563eb" />
          <path d="M5 12H10M14 12H19M6 15.5H11M14 15.5H18" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 19V22" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "/users":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M12 3L3 9H21L12 3Z" fill="#ef4444" />
          <rect x="5" y="9" width="14" height="11.5" fill="#fde68a" />
          <rect x="10" y="14" width="4" height="6.5" rx="1" fill="#2563eb" />
          <circle cx="12" cy="11" r="1.6" fill="#ffffff" />
        </svg>
      );
    case "/my":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M3 6.5C6.2 5.8 9.2 6.5 12 8.2V19.8C9.2 18.1 6.2 17.4 3 18.1V6.5Z" fill="#38bdf8" />
          <path d="M21 6.5C17.8 5.8 14.8 6.5 12 8.2V19.8C14.8 18.1 17.8 17.4 21 18.1V6.5Z" fill="#34d399" />
          <circle cx="12" cy="4.2" r="2" fill="#fbbf24" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="#38bdf8" />
          <circle cx="12" cy="12" r="4" fill="#fbbf24" />
        </svg>
      );
  }
}
