import { money } from "./api";
type School = { name?: string; logo?: string } | null | undefined;

const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const header = (s: School) =>
  `<div style="text-align:center">${s?.logo ? `<img src="${s.logo}" style="height:70px;margin-bottom:4px"/>` : ""}<h2 style="margin:2px">${esc(s?.name || "School")}</h2></div>`;

function openPrint(title: string, body: string, css = "") {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:6px;text-align:left}h2,h3{text-align:center;margin:4px}.copy{border:2px dashed #555;padding:16px;margin-bottom:16px}${css}</style></head><body>${body}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300); // let the logo load first
}

export function printChalan(f: any, school?: School) {
  const prev = f.previous || 0, thisPending = f.amount - f.paid, balance = prev + thisPending;
  const copy = (label: string) => `<div class="copy">${header(school)}<h3>Fee Chalan (${label})</h3><h3>Chalan # ${esc(f.chalanNo)}</h3>
  <table>
  <tr><th>Student</th><td>${esc(f.student?.name)}</td><th>Class</th><td>${esc(f.student?.className)}</td></tr>
  <tr><th>Father</th><td>${esc(f.student?.fatherName)}</td><th>Roll #</th><td>${esc(f.student?.rollNo)}</td></tr>
  <tr><th>Month</th><td>${esc(f.month)}</td><th>Actual fee</th><td>${money(f.actualFee)}</td></tr>
  <tr><th>Discount</th><td>${money(f.discount)}</td><th>Net fee (this month)</th><td>${money(f.amount)}</td></tr>
  <tr><th>Previous pending</th><td>${money(prev)}</td><th>Total payable</th><td>${money(prev + f.amount)}</td></tr>
  <tr><th>Received</th><td>${money(f.paid)}</td><th>This month pending</th><td>${money(thisPending)}</td></tr>
  <tr><th colspan="3">Balance</th><td><b>${money(balance)}</b></td></tr></table></div>`;
  openPrint("Fee Chalan", copy("Student Copy") + copy("School Copy"));
}

export function printPaper(p: any, school?: School) {
  const qs = String(p.questions || "").split("\n").filter(Boolean).map((q, i) => `<p><b>Q${i + 1}.</b> ${esc(q)}</p>`).join("");
  openPrint(p.title, `${header(school)}<h2>${esc(p.title)}</h2><h3>${esc(String(p.type).toUpperCase())} - Class ${esc(p.className)} - ${esc(p.subject)}</h3>
  <p>Date: ${esc(p.date)} &nbsp;&nbsp; Total Marks: ${esc(p.totalMarks)}</p><p>Name: ____________ &nbsp; Roll #: ______</p><hr/>${qs}`);
}

export function printElement(title: string, el: HTMLElement | null, school?: School, landscape = false) {
  if (!el) return;
  openPrint(title, `${header(school)}<h3>${esc(title)}</h3>${el.innerHTML}`, landscape ? "@page{size:landscape}table{font-size:11px}td,th{padding:4px}" : "");
}

const ddmmyyyy = (v?: string) => (v ? v.split("-").reverse().join("-") : "");
export function printCertificate(s: any, d: any, school?: School) {
  const female = s.gender === "Female", he = female ? "She" : "He", rel = female ? "D/O" : "S/O";
  const val = (v: any, w = 200) => `<span style="display:inline-block;min-width:${w}px;border-bottom:1px solid #000;padding:0 8px;font-weight:bold;text-align:center">${esc(v) || "&nbsp;"}</span>`;
  const row = (l: string, v: any) => `<p style="margin:14px 0"><span style="display:inline-block;width:190px">${l}</span>${val(v, 280)}</p>`;
  openPrint("School Leaving Certificate", `<div style="border:3px double #333;padding:28px">
    ${header(school)}
    <h2 style="text-decoration:underline;margin:22px 0">School Leaving Certificate</h2>
    ${row("Name of Student", s.name)}${row("Date of Birth", ddmmyyyy(d.dob))}${row("Reg. No.", d.regNo)}
    <p style="margin:14px 0">It is certified that ${val(s.name, 220)} ${rel} ${val(s.fatherName, 220)}</p>
    <p style="margin:14px 0">had been studying here till ${val(ddmmyyyy(d.leavingDate), 130)} in Class ${val(s.className, 80)}</p>
    <p style="margin:14px 0">${he} had ${val(String(d.result).toUpperCase(), 100)} the class and ${d.duesPaid === "Paid all dues" ? "had paid all the dues of school" : "<b>has dues pending</b>"}.</p>
    <p style="margin:26px 0 12px">It is to be certified that the given record of date of birth and enrolment is correct according to the register of admission/withdrawal.</p>
    <table style="text-align:center"><tr><th rowspan="2">Date of Admission</th><th rowspan="2">Date of Leaving</th><th colspan="2">Attendance of Year</th></tr><tr><th>From</th><th>To</th></tr>
      <tr><td>${ddmmyyyy(d.admissionDate)}</td><td>${ddmmyyyy(d.leavingDate)}</td><td>${ddmmyyyy(d.attendFrom)}</td><td>${ddmmyyyy(d.attendTo)}</td></tr></table>
    <div style="display:flex;justify-content:space-between;margin-top:70px"><div>Date of Issue: ${val(ddmmyyyy(d.issueDate), 120)}</div><div style="text-align:center"><div style="border-top:1px solid #000;padding-top:4px;min-width:200px">Principal's Signature<br><b>${esc(school?.name || "")}</b></div></div></div>
  </div>`);
}
