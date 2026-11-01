import "server-only";
import { decryptCredential } from "./credential-crypto";
import { rupees } from "./chalan";
const version = () => process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
async function graph(path: string, token: string, init: RequestInit) {
  let response: Response;
  try { response = await fetch(`https://graph.facebook.com/${version()}/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers }, signal: AbortSignal.timeout(25_000), cache: "no-store" }); }
  catch { throw new Error("WhatsApp did not respond. Check the connection and delivery before sending again."); }
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const error = data.error || {};
    throw new Error(`WhatsApp: ${String(error.error_user_msg || error.message || `Request failed (${response.status})`).slice(0, 350)}${error.code ? ` [${error.code}]` : ""}`);
  }
  return data;
}
export async function sendWhatsAppImage(config: any, to: string, png: Uint8Array, filename: string, fee: any) {
  if (!config?.enabled || !config.phoneNumberId || !config.accessToken) throw new Error("WhatsApp is not connected. Open Settings → WhatsApp settings first.");
  const token = decryptCredential(config.accessToken);
  const base = `${encodeURIComponent(config.phoneNumberId)}`;
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), filename);
  const media = await graph(`${base}/media`, token, { method: "POST", body: form });
  if (!media.id) throw new Error("WhatsApp did not return an image media ID");
  const caption = `${fee.student?.name || "Student"} · Fee chalan ${fee.chalanNo} · ${fee.month}. Balance: ${rupees(Number(fee.previous || 0) + Number(fee.amount || 0) - Number(fee.paid || 0))}.`;
  // An approved IMAGE-header template is needed outside the 24-hour customer
  // service window. Body variables are: student, chalan number, month, balance.
  const message = config.templateName ? {
    type: "template", template: { name: config.templateName, language: { code: config.templateLanguage || "en_US" }, components: [
      { type: "header", parameters: [{ type: "image", image: { id: media.id } }] },
      { type: "body", parameters: [String(fee.student?.name || "Student"), String(fee.chalanNo), String(fee.month), rupees(Number(fee.previous || 0) + Number(fee.amount || 0) - Number(fee.paid || 0))].map((text) => ({ type: "text", text })) },
    ] },
  } : { type: "image", image: { id: media.id, caption } };
  const result = await graph(`${base}/messages`, token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...message }) });
  const id = result.messages?.[0]?.id;
  if (!id) throw new Error("WhatsApp did not confirm the image message");
  return { id, status: result.messages?.[0]?.message_status || "accepted" };
}
