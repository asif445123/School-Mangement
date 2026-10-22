import { Swal } from "./alerts";
import { nz, PERIOD_OPTIONS } from "./teacher-scope";
import { BusySlot, conflictsFor, conflictText, Seat } from "./period-conflicts";
import { periodTime, SchoolSchedule } from "./timetable";

export type Directory = { items: any[]; hints: { classes: string[]; sections: string[]; subjects: string[] } };
export const emptyDirectory: Directory = { items: [], hints: { classes: [], sections: [], subjects: [] } };

// Everything the popups need to show period times and to warn about a period
// that is already given to another teacher of the same class.
export type DialogContext = {
  busy?: BusySlot[];
  schedule?: SchoolSchedule;
  myClass?: { className: string; section: string };
};

const TYPES = ["Class teacher", "Subject teacher"];
const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const lbl = (t: string) => `<label style="display:block;text-align:left;font-size:13px;margin-top:8px;color:#475569">${t}</label>`;
const inp = (k: string, v: any, list = "") => `<input data-k="${k}" ${list ? `list="${list}"` : ""} value="${esc(v)}" autocomplete="off" class="swal2-input" style="width:100%;margin:4px 0">`;

// Period options carry the school period time ("Period 3 · 09:20 – 10:00") and the
// teacher who already has that period of the chosen class ("... (Kamran taken)").
const periodOptions = (selected: any, schedule?: SchoolSchedule, busy?: BusySlot[], seat?: Seat) =>
  `<option value="">Select period</option>${PERIOD_OPTIONS.map((p) => {
    const time = periodTime(schedule, p);
    const taken = seat ? conflictsFor({ ...seat, period: p }, busy || []) : [];
    const who = taken.length ? ` (${[...new Set(taken.map((t) => t.teacherName))].join(", ")} taken)` : "";
    const label = `Period ${p}${time ? ` · ${time}` : ""}${who}`;
    return `<option value="${p}" ${String(selected ?? "") === p ? "selected" : ""}>${esc(label)}</option>`;
  }).join("")}`;
const options = (id: string, values: string[]) => `<datalist id="${id}">${values.map((o) => `<option value="${esc(o)}"></option>`).join("")}</datalist>`;
// saved classes / sections / subjects are offered when a field is clicked
const hintLists = (d: Directory) => options("dl-class", d.hints.classes) + options("dl-section", d.hints.sections) + options("dl-subject", d.hints.subjects)
  + `<datalist id="dl-names">${d.items.map((t) => `<option value="${esc(t.name)}" label="${esc(t.email)}"></option>`).join("")}</datalist>`;
const note = `<div id="t-existing-note" style="display:none;margin-top:10px;padding:8px 10px;border-radius:8px;background:#ecfdf5;color:#047857;font-size:13px;text-align:left">Saved teacher selected. His phone, email and password stay as they are - only the assignment below is added.</div>`;
const pwRow = `<div id="pw-row">${lbl("Password (6+ chars) *")}<div style="position:relative"><input id="t-password" type="password" class="swal2-input" style="width:100%;margin:4px 0;padding-right:44px"><button type="button" onclick="var i=document.getElementById('t-password');var s=i.type==='password';i.type=s?'text':'password';this.textContent=s?'👁️':'👁️‍🗨️'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;font-size:18px;cursor:pointer">👁️‍🗨️</button></div></div>`;
const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() || "";
// red warning shown inside an assignment block when that class period already has a teacher
const warnBox = () => `<div class="asg-warn" style="display:none;margin-top:6px;padding:7px 10px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:12px;text-align:left"></div>`;

// one assignment = teacher type + class + section + subject + period
function block(a: any, i: number, schedule?: SchoolSchedule, busy?: BusySlot[]) {
  return `<div class="asg" style="border:1px solid #e2e8f0;border-radius:8px;padding:4px 12px 10px;margin-top:12px;text-align:left">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><b style="font-size:13px">${i === 0 ? "Teacher assignment" : "Extra assignment"}</b>${i > 0 ? '<button type="button" class="asg-del" title="Remove" style="border:0;background:none;color:#dc2626;font-size:18px;cursor:pointer">✕</button>' : ""}</div>
    ${lbl("Teacher type")}<select data-k="teacherType" class="swal2-select" style="width:100%;margin:4px 0">${TYPES.map((t) => `<option ${t === a.teacherType ? "selected" : ""}>${t}</option>`).join("")}</select>
    ${lbl("Teacher class (e.g. 5 or 5, 6)")}${inp("className", a.className, "dl-class")}
    ${lbl("Teacher section (e.g. A)")}${inp("section", a.section, "dl-section")}
    ${lbl("Teacher subject")}${inp("subject", a.subject, "dl-subject")}
    ${lbl("Period (for this subject)")}<select data-k="period" class="swal2-select" style="width:100%;margin:4px 0">${periodOptions(a.period, schedule, busy, { className: a.className, section: a.section })}</select>
    ${warnBox()}
  </div>`;
}

// Typing / choosing a saved teacher's name fills (and locks) his phone and email and hides the password
function wireExisting(dir: Directory, setExisting: (t: any | null) => void) {
  const nameEl = document.getElementById("t-name") as HTMLInputElement, phone = document.getElementById("t-phone") as HTMLInputElement, email = document.getElementById("t-email") as HTMLInputElement;
  const pw = document.getElementById("pw-row"), msg = document.getElementById("t-existing-note");
  let locked = false;
  const sync = () => {
    const t = dir.items.find((x) => nz(x.name) === nz(nameEl.value)) || null;
    setExisting(t);
    if (t) { phone.value = t.phone || ""; email.value = t.email || ""; phone.disabled = email.disabled = true; if (pw) pw.style.display = "none"; if (msg) msg.style.display = "block"; locked = true; }
    else if (locked) { phone.value = ""; email.value = ""; phone.disabled = email.disabled = false; if (pw) pw.style.display = ""; if (msg) msg.style.display = "none"; locked = false; }
  };
  nameEl.addEventListener("input", sync); nameEl.addEventListener("change", sync);
}

const readBlocks = () => [...document.querySelectorAll(".asg")].map((el) => Object.fromEntries([...el.querySelectorAll("[data-k]")].map((i) => [(i as HTMLInputElement).dataset.k, (i as HTMLInputElement).value.trim()])));

/**
 * Live period check.
 * - the period list is rewritten when the class / section changes, so every period
 *   already given to another teacher is marked with his name;
 * - a red note under the period names the teacher holding the chosen period;
 * - returns a function that re-reads every assignment block.
 */
function wireConflicts(getBusy: () => BusySlot[], seats: (a: any) => Seat, single?: () => any, schedule?: SchoolSchedule) {
  const show = (box: HTMLElement | null, message: string) => {
    if (!box) return;
    box.textContent = message;
    box.style.display = message ? "block" : "none";
  };
  if (single) { // class teacher popup: one fixed class, so only the period changes
    const period = document.getElementById("t-period") as HTMLSelectElement | null;
    const box = document.getElementById("t-period-warn");
    const recheck = () => {
      const seat = seats(single());
      const hits = conflictsFor(seat, getBusy());
      show(box, hits.length ? conflictText(seat, hits) : "");
    };
    period?.addEventListener("change", recheck);
    recheck();
    return recheck;
  }
  const draw = (el: HTMLElement, relabel: boolean) => {
    const read = (k: string) => (el.querySelector(`[data-k="${k}"]`) as HTMLInputElement | null)?.value.trim() || "";
    const select = el.querySelector<HTMLSelectElement>('select[data-k="period"]');
    if (relabel && select) {
      const chosen = select.value;
      select.innerHTML = periodOptions(chosen, schedule, getBusy(), { className: read("className"), section: read("section") });
      select.value = chosen;
    }
    const seat = seats({ className: read("className"), section: read("section"), period: read("period") });
    const hits = conflictsFor(seat, getBusy());
    show(el.querySelector<HTMLElement>(".asg-warn"), hits.length ? conflictText(seat, hits) : "");
  };
  const wire = (el: HTMLElement) => {
    if (el.dataset.wired) return; // an already wired block is never wired twice
    el.dataset.wired = "1";
    el.addEventListener("change", (e) => {
      const key = (e.target as HTMLElement)?.dataset?.k;
      draw(el, key === "className" || key === "section");
    });
    el.addEventListener("input", () => draw(el, false));
  };
  const recheck = (relabel = true) => document.querySelectorAll<HTMLElement>(".asg").forEach((el) => { wire(el); draw(el, relabel); });
  recheck(true);
  return recheck;
}

// The first assignment of the popup that clashes with another teacher
function firstConflict(blocks: any[], busy: BusySlot[], seats: (a: any) => Seat) {
  for (const a of blocks) {
    const seat = seats(a);
    const hits = conflictsFor(seat, busy);
    if (hits.length) return conflictText(seat, hits);
  }
  return "";
}

// School admin: add a teacher (or add assignments to a saved teacher) / edit a teacher
export async function schoolTeacherDialog(title: string, t: any, isNew: boolean, dir: Directory, ctx: DialogContext = {}) {
  const busy = ctx.busy || [];
  const blocks = [{ teacherType: t.teacherType || "Class teacher", className: t.className, section: t.section, subject: t.subject, period: t.period }, ...(t.assignments || [])];
  const seats = (a: any) => ({ className: a.className, section: a.section, period: a.period });
  let existing: any = null;
  let busyNow = busy; // a saved teacher's own assignments do not block his new entry
  let recheck: (relabel?: boolean) => void = () => {};
  const res = await Swal.fire({
    title, focusConfirm: false, showCancelButton: true, confirmButtonText: "Save", confirmButtonColor: "#2563eb",
    html: `${hintLists(dir)}${lbl("Teacher name *")}<input id="t-name" ${isNew ? 'list="dl-names"' : ""} autocomplete="off" class="swal2-input" style="width:100%;margin:4px 0" value="${esc(t.name)}">${isNew ? note : ""}
      <div id="asg-list">${blocks.map((a, i) => block(a, i, ctx.schedule, busy)).join("")}</div>
      <button type="button" id="asg-add" style="margin-top:12px;border:1px dashed #94a3b8;background:#f8fafc;border-radius:8px;padding:8px 14px;color:#047857;font-weight:600;cursor:pointer">+ Add new entry</button>
      ${lbl("Phone")}<input id="t-phone" class="swal2-input" style="width:100%;margin:4px 0" value="${esc(t.phone)}">
      ${lbl("Email (login) *")}<input id="t-email" type="email" class="swal2-input" style="width:100%;margin:4px 0" value="${esc(t.email)}">${isNew ? pwRow : ""}`,
    didOpen: () => {
      const list = document.getElementById("asg-list")!;
      recheck = wireConflicts(() => busyNow, seats, undefined, ctx.schedule);
      document.getElementById("asg-add")!.onclick = () => {
        list.insertAdjacentHTML("beforeend", block({ teacherType: "Subject teacher" }, list.children.length + 1, ctx.schedule, busyNow));
        recheck(true); // the new block must also answer to the live check
      };
      list.onclick = (e) => { const b = (e.target as HTMLElement).closest(".asg-del"); if (b) b.closest(".asg")!.remove(); };
      if (isNew) wireExisting(dir, (x) => {
        existing = x;
        busyNow = x ? busy.filter((s) => s.teacherId !== String(x._id)) : busy;
        recheck(true);
      });
    },
    preConfirm: () => {
      const all = readBlocks();
      const clash = firstConflict(all, busyNow, seats);
      if (clash) { Swal.showValidationMessage(clash); return false; }
      if (all.some((a) => a.subject && !PERIOD_OPTIONS.includes(a.period))) { Swal.showValidationMessage("Select a period from 1 to 8 for every subject"); return false; }
      if (existing) { // saved teacher: only the assignments are added
        if (!(all[0].className || all[0].subject)) { Swal.showValidationMessage("Enter the class and subject to add"); return false; }
        return { existingId: existing._id, ...all[0], extras: all.slice(1) };
      }
      if (!val("t-name")) { Swal.showValidationMessage("Teacher name is required"); return false; }
      if (!val("t-email")) { Swal.showValidationMessage("Email is required"); return false; }
      if (isNew && val("t-password").length < 6) { Swal.showValidationMessage("Password must be 6+ characters"); return false; }
      return { name: val("t-name"), phone: val("t-phone"), email: val("t-email"), ...(isNew ? { password: val("t-password") } : {}), ...all[0], extras: all.slice(1) };
    },
  });
  return res.isConfirmed ? res.value : null;
}

// Class teacher: add a subject teacher to his class (class and section are filled in automatically)
export async function classTeacherDialog(dir: Directory, ctx: DialogContext = {}) {
  const busy = ctx.busy || [];
  const myClass = ctx.myClass || { className: "", section: "" };
  const seats = (a: any) => ({ className: a.className || myClass.className, section: a.section ?? myClass.section, period: a.period });
  let existing: any = null;
  const res = await Swal.fire({
    title: "Add subject teacher", focusConfirm: false, showCancelButton: true, confirmButtonText: "Save", confirmButtonColor: "#2563eb",
    html: `${hintLists(dir)}${lbl("Teacher name *")}<input id="t-name" list="dl-names" autocomplete="off" class="swal2-input" style="width:100%;margin:4px 0">${note}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#eff6ff;color:#1d4ed8;font-size:13px;text-align:left">Your class: <b>${esc(myClass.className)}${myClass.section ? " " + esc(myClass.section) : ""}</b> - the teacher is added to this class.</div>
      ${lbl("Teacher subject *")}<input id="t-subject" list="dl-subject" autocomplete="off" class="swal2-input" style="width:100%;margin:4px 0">
      ${lbl("Period *")}<select id="t-period" class="swal2-select" style="width:100%;margin:4px 0">${periodOptions("", ctx.schedule, busy, myClass)}</select>
      <div id="t-period-warn" style="display:none;margin-top:6px;padding:7px 10px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:12px;text-align:left"></div>
      ${lbl("Phone")}<input id="t-phone" class="swal2-input" style="width:100%;margin:4px 0">
      ${lbl("Email (login) *")}<input id="t-email" type="email" class="swal2-input" style="width:100%;margin:4px 0">${pwRow}`,
    didOpen: () => {
      wireExisting(dir, (x) => (existing = x));
      wireConflicts(() => busy, seats, () => ({ className: myClass.className, section: myClass.section, period: val("t-period") }), ctx.schedule);
    },
    preConfirm: () => {
      const seat = { className: myClass.className, section: myClass.section, period: val("t-period") };
      const clash = firstConflict([seat], busy, (a) => a);
      if (clash) { Swal.showValidationMessage(clash); return false; }
      if (!val("t-subject")) { Swal.showValidationMessage("Teacher subject is required"); return false; }
      if (!PERIOD_OPTIONS.includes(val("t-period"))) { Swal.showValidationMessage("Select a period from 1 to 8"); return false; }
      if (existing) return { existingId: existing._id, subject: val("t-subject"), period: val("t-period") };
      if (!val("t-name")) { Swal.showValidationMessage("Teacher name is required"); return false; }
      if (!val("t-email")) { Swal.showValidationMessage("Email is required"); return false; }
      if (val("t-password").length < 6) { Swal.showValidationMessage("Password must be 6+ characters"); return false; }
      return { name: val("t-name"), subject: val("t-subject"), period: val("t-period"), phone: val("t-phone"), email: val("t-email"), password: val("t-password") };
    },
  });
  return res.isConfirmed ? res.value : null;
}
