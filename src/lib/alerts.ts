import Swal from "sweetalert2";

export const toast = (icon: "success" | "error" | "info" | "warning", title: string) =>
  Swal.fire({ toast: true, position: "top-end", icon, title, showConfirmButton: false, timer: 2500 });

export const confirmDelete = async (text = "This cannot be undone.") =>
  (await Swal.fire({ title: "Are you sure?", text, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Yes, delete" })).isConfirmed;

export type Field = { name: string; label: string; type?: string; options?: string[]; required?: boolean; hint?: string };
const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export async function formDialog(title: string, fields: Field[], values: any = {}) {
  const html = fields.map((f) => {
    const id = `f-${f.name}`, val = values[f.name] ?? "";
    const label = `<label style="display:block;text-align:left;font-size:13px;margin-top:10px;color:#475569">${f.label}${f.required ? " *" : ""}</label>`;
    if (f.type === "checkbox") return `<label style="display:flex;align-items:center;gap:8px;text-align:left;margin-top:12px;color:#334155;font-size:15px"><input id="${id}" type="checkbox" ${val ? "checked" : ""} style="width:18px;height:18px"> ${f.label}</label>${f.hint ? `<small style="display:block;text-align:left;color:#94a3b8;margin-left:26px">${f.hint}</small>` : ""}`;
    if (f.type === "radio") return `<div style="text-align:left;margin-top:12px"><span style="font-size:13px;color:#475569">${f.label}${f.required ? " *" : ""}</span><div style="display:flex;gap:18px;margin-top:6px">${(f.options || []).map((o) => `<label style="display:flex;align-items:center;gap:6px"><input type="radio" name="${id}" value="${esc(o)}" ${o === val ? "checked" : ""}> ${o}</label>`).join("")}</div></div>`;
    if (f.type === "image") return `${label}<div style="display:flex;align-items:center;gap:12px;margin-top:6px">${val ? `<img src="${esc(val)}" style="height:48px;border-radius:6px" alt="">` : ""}<input id="${id}" type="file" accept="image/*" style="font-size:13px"></div>`;
    if (f.type === "textarea") return `${label}<textarea id="${id}" class="swal2-textarea" style="width:100%;margin:4px 0">${esc(val)}</textarea>`;
    if (f.type === "select") return `${label}<select id="${id}" class="swal2-select" style="width:100%;margin:4px 0">${(f.options || []).map((o) => `<option ${o === val ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    if (f.type === "password") return `${label}<div style="position:relative"><input id="${id}" type="password" value="${esc(val)}" class="swal2-input" style="width:100%;margin:4px 0;padding-right:44px"><button type="button" onclick="var i=document.getElementById('${id}');var s=i.type==='password';i.type=s?'text':'password';this.textContent=s?'👁️':'👁️‍🗨️'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;font-size:18px;cursor:pointer">👁️‍🗨️</button></div>`;
    return `${label}<input id="${id}" type="${f.type || "text"}" value="${esc(val)}" class="swal2-input" style="width:100%;margin:4px 0">`;
  }).join("");
  const res = await Swal.fire({
    title, html, focusConfirm: false, showCancelButton: true, confirmButtonText: "Save", confirmButtonColor: "#2563eb",
    preConfirm: async () => {
      const out: any = {};
      for (const f of fields) {
        if (f.type === "radio") {
          const c = document.querySelector(`input[name="f-${f.name}"]:checked`) as HTMLInputElement | null;
          if (f.required && !c) { Swal.showValidationMessage(`${f.label} is required`); return false; }
          out[f.name] = c?.value || ""; continue;
        }
        const el = document.getElementById(`f-${f.name}`) as HTMLInputElement;
        if (f.type === "image") { out[f.name] = el.files?.[0] ? await resizeImage(el.files[0]) : ""; continue; }
        if (f.type === "checkbox") { out[f.name] = el.checked; continue; }
        const v = el.value.trim();
        if (f.required && !v) { Swal.showValidationMessage(`${f.label} is required`); return false; }
        out[f.name] = f.type === "number" ? Number(v) : v;
      }
      return out;
    },
  });
  return res.isConfirmed ? res.value : null;
}
export { Swal };

// shrinks an uploaded picture to max 200px (PNG data URL) so it stays small in the database
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 200 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = url;
  });
}
