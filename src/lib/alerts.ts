import Swal from "sweetalert2";

export const toast = (icon: "success" | "error" | "info" | "warning", title: string) =>
  Swal.fire({ toast: true, position: "top-end", icon, title, showConfirmButton: false, timer: 2500 });

export const confirmDelete = async (text = "This cannot be undone.") =>
  (await Swal.fire({ title: "Are you sure?", text, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Yes, delete", width: 420 })).isConfirmed;

export type Field = {
  name: string; label: string; type?: string;
  options?: string[]; // simple option list (value = label)
  choices?: { value: string; label: string; disabled?: boolean }[]; // options whose text differs from the saved value (disabled = cannot be picked)
  required?: boolean; hint?: string;
  wide?: boolean; // always take the full popup width (long text, address...)
};
const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// One consistent, readable popup form: 13px labels, 14px / 40px fields
// (16px on phones so iOS does not zoom), two short fields per row on
// screens >= 560px, full-width rows for textarea / image / long fields.
// Styling lives in globals.css (.swal2-*, .sms-form) so every popup —
// Add Teacher, Daily Diary, Papers & Tests, Marks, Students, Fees... —
// looks the same without each caller passing sizes.
const WIDE_TYPES = ["textarea", "image", "radio", "checkbox"];
const WIDE_NAMES = /address|narration|questions|text|note|remarks|title|description/i;

export async function formDialog(title: string, fields: Field[], values: any = {}, validate?: (values: any) => string | null | void) {
  const html = `<div class="sms-form">${fields.map((f) => {
    const id = `f-${f.name}`, val = values[f.name] ?? "";
    const wide = f.wide || WIDE_TYPES.includes(f.type || "") || WIDE_NAMES.test(f.name) ? " sms-field--wide" : "";
    const label = `<label for="${id}" style="display:block;text-align:left;font-size:13px;font-weight:500;margin-top:10px;color:#475569">${f.label}${f.required ? " *" : ""}</label>`;
    if (f.type === "checkbox") return `<div class="sms-field${wide}"><label style="display:flex;align-items:center;gap:8px;text-align:left;margin-top:12px;color:#334155;font-size:14px"><input id="${id}" type="checkbox" ${val ? "checked" : ""}> ${f.label}</label>${f.hint ? `<small style="display:block;text-align:left;font-size:12px;color:#94a3b8;margin:3px 0 0 25px">${f.hint}</small>` : ""}</div>`;
    if (f.type === "radio") return `<div class="sms-field${wide}"><span style="display:block;text-align:left;font-size:13px;font-weight:500;margin-top:10px;color:#475569">${f.label}${f.required ? " *" : ""}</span><div style="display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:6px">${(f.options || []).map((o) => `<label style="display:flex;align-items:center;gap:6px;font-size:14px;color:#334155"><input type="radio" name="${id}" value="${esc(o)}" ${o === val ? "checked" : ""}> ${o}</label>`).join("")}</div></div>`;
    if (f.type === "image") return `<div class="sms-field${wide}">${label}<div style="display:flex;align-items:center;gap:12px;margin-top:6px">${val ? `<img src="${esc(val)}" style="height:44px;border-radius:6px" alt="">` : ""}<input id="${id}" type="file" accept="image/*" style="font-size:13px;min-width:0"></div></div>`;
    if (f.type === "textarea") return `<div class="sms-field${wide}">${label}<textarea id="${id}" class="swal2-textarea">${esc(val)}</textarea>${f.hint ? `<small style="display:block;font-size:12px;color:#94a3b8;margin-top:3px">${f.hint}</small>` : ""}</div>`;
    if (f.type === "select") {
      const choices: { value: string; label: string; disabled?: boolean }[] = f.choices || (f.options || []).map((o) => ({ value: o, label: o }));
      return `<div class="sms-field">${label}<select id="${id}" class="swal2-select">${choices.map((o) => `<option value="${esc(o.value)}" ${o.disabled ? "disabled" : ""} ${String(o.value) === String(val ?? "") ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></div>`;
    }
    if (f.type === "password") return `<div class="sms-field">${label}<div style="position:relative"><input id="${id}" type="password" value="${esc(val)}" class="swal2-input" style="padding-right:44px !important"><button type="button" aria-label="Show password" onclick="var i=document.getElementById('${id}');var s=i.type==='password';i.type=s?'text':'password';this.textContent=s?'👁️':'👁️‍🗨️'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;font-size:16px;cursor:pointer">👁️‍🗨️</button></div></div>`;
    return `<div class="sms-field${wide}">${label}<input id="${id}" type="${f.type || "text"}" value="${esc(val)}" class="swal2-input">${f.hint ? `<small style="display:block;font-size:12px;color:#94a3b8;margin-top:3px">${f.hint}</small>` : ""}</div>`;
  }).join("")}</div>`;
  const res = await Swal.fire({
    title, html, focusConfirm: false, showCancelButton: true, confirmButtonText: "Save", confirmButtonColor: "#2563eb",
    width: 580,
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
      const problem = validate?.(out);
      if (problem) { Swal.showValidationMessage(problem); return false; }
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
