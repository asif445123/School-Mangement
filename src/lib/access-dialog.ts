import { Swal } from "./alerts";
import { CONTACT } from "./contact";

const ban = `<svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="38" fill="none" stroke="#ef4444" stroke-width="4"/><line x1="28" y1="56" x2="56" y2="28" stroke="#ef4444" stroke-width="5" stroke-linecap="round"/></svg>`;
const clock = `<svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="38" fill="none" stroke="#f59e0b" stroke-width="4"/><path d="M42 22v22l14 8" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const whatsappIcon = `<svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#fff" stroke-width="1.7"/><g transform="translate(4.8 4.8) scale(0.6)"><path fill="#fff" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></g></svg>`;
const mailIcon = `<svg width="26" height="26" viewBox="0 0 24 24"><path fill="#fff" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`;
const btn = (href: string, bg: string, title: string, icon: string, o: { newTab?: boolean; id?: string } = {}) =>
  `<a href="${href}" ${o.id ? `id="${o.id}"` : ""} ${o.newTab === false ? "" : 'target="_blank" rel="noopener"'} title="${title}" style="width:44px;height:44px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center">${icon}</a>`;

type Info = { email?: string; schoolName?: string; created?: boolean };

// Link to the Contact Us page (the page fills in the message itself)
export const contactLink = (kind: "rejected" | "pending", info: Info = {}) =>
  `/contact?${new URLSearchParams({ kind, name: info.schoolName || "", email: info.email || "" })}`;

// "Access Denied" (account rejected) or "Awaiting Approval" (new / pending account) with WhatsApp + email buttons.
// Resolves to which link was used: "login", "demo" or "closed".
export async function accessDialog(kind: "rejected" | "pending", info: Info = {}): Promise<"login" | "demo" | "contact" | "closed"> {
  const rejected = kind === "rejected";
  const who = [info.schoolName, info.email].filter(Boolean).join(" - ");
  const msg = rejected
    ? `Hello, my school account${who ? ` (${who})` : ""} was rejected. Please review it and approve it.`
    : `Hello, I registered my school${who ? ` (${who})` : ""} on the School Management System and I am waiting for approval.`;
  const wa = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`;
  const text = rejected
    ? "Your account was rejected by the admin. Please contact us on WhatsApp or by email for approval."
    : info.created
      ? "Your school has been registered and is waiting for admin approval. You can log in once it is approved. Contact us on WhatsApp or by email for quick approval."
      : "Your account is waiting for admin approval. Please contact us on WhatsApp or by email to get it approved.";
  const contactUrl = contactLink(kind, info);
  let choice = "closed" as "login" | "demo" | "contact" | "closed";
  await Swal.fire({
    background: "#f8fafc", showConfirmButton: false, showCloseButton: true, width: 440,
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding-top:6px">
      ${rejected ? ban : clock}
      <div style="font-weight:700;font-size:21px;line-height:1.3;color:${rejected ? "#b91c1c" : "#b45309"}">${rejected ? "Access Denied" : "Awaiting Approval"}</div>
      <div style="font-size:14px;color:#475569;line-height:1.55">${text}</div>
      <div style="display:flex;gap:14px;margin-top:4px">${btn(wa, "#22c55e", "WhatsApp", whatsappIcon)}${btn(contactUrl, "#2563eb", "Contact us", mailIcon, { newTab: false, id: "ad-contact" })}</div>
      <div style="font-size:14px;margin-top:6px"><a href="#" id="ad-login" style="color:#2563eb;font-weight:600;text-decoration:none">&larr; Back to Login</a> <span style="color:#94a3b8">or</span> <a href="#" id="ad-demo" style="color:#2563eb;font-weight:600;text-decoration:none">View Demo</a></div>
    </div>`,
    didOpen: (popup) => {
      popup.querySelector("#ad-login")?.addEventListener("click", (e) => { e.preventDefault(); choice = "login"; Swal.close(); });
      popup.querySelector("#ad-contact")?.addEventListener("click", (e) => { e.preventDefault(); choice = "contact"; Swal.close(); });
      popup.querySelector("#ad-demo")?.addEventListener("click", (e) => { e.preventDefault(); choice = "demo"; Swal.close(); });
    },
  });
  if (choice === "contact") {
    window.location.assign(contactUrl); // open the Contact Us page (prefilled)
    await new Promise((r) => setTimeout(r, 3000)); // the page is unloading; only continue if the navigation did not happen
    return "closed";
  }
  return choice;
}
