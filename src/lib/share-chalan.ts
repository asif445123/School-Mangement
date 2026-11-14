import { chalanFileName } from "./chalan";

// Browser-side sharing of the rendered fee-chalan PNG. Used by the Share icon
// in the Fee Chalan table and by the WhatsApp preview dialog, so both share
// the image in exactly the same way.
//
// Sharing itself NEVER marks a chalan as sent: neither the OS share sheet nor
// opening a WhatsApp chat can prove the family received the image. Callers ask
// the user afterwards and only then record a manual send (whatsapp API route).

export async function fetchChalanImageFile(fee: any): Promise<File> {
  const response = await fetch(`/api/fees/${fee._id}/image`);
  if (!response.ok) throw new Error("Could not load the chalan image");
  return new File([await response.blob()], chalanFileName(fee), { type: "image/png" });
}

export function downloadChalanFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ShareMethod = "native" | "whatsapp" | "download";

/**
 * Share the chalan image: the native share sheet (with the PNG attached) where
 * the browser supports it, otherwise download the PNG and — when a recipient
 * number is known — open its WhatsApp chat so the image can be attached there.
 * Re-throws AbortError when the user closes the share sheet without sharing.
 */
export async function shareChalanImage(fee: any, recipientNumber = ""): Promise<ShareMethod> {
  const file = await fetchChalanImageFile(fee);
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "School fee chalan" });
    return "native";
  }
  downloadChalanFile(file);
  if (recipientNumber) {
    const text = `Fee chalan ${fee.chalanNo} - ${fee.student?.name || ""}. Please find the voucher image attached.`;
    window.open(`https://wa.me/${recipientNumber}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    return "whatsapp";
  }
  return "download";
}
