import { money } from "./api";
import { chalanRows, accountLines, formatMonth } from "./chalan";
import { accountTypeLabel } from "./payment-accounts";
type School = { name?: string; logo?: string } | null | undefined;

const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const header = (s: School) =>
  `<div style="text-align:center">${/^data:image\/(png|jpeg|webp);base64,/.test(s?.logo || "") ? `<img src="${esc(s.logo)}" style="height:70px;margin-bottom:4px"/>` : ""}<h2 style="margin:2px">${esc(s?.name || "School")}</h2></div>`;

function openPrint(title: string, body: string, css = "") {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:6px;text-align:left}h2,h3{text-align:center;margin:4px}.copy{border:2px dashed #555;padding:16px;margin-bottom:16px}${css}</style></head><body>${body}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300); // let the logo load first
}

export function printChalan(f: any, school?: School, accounts: any[] = []) {
  const r = chalanRows(f);
  const paymentAccounts = accounts.filter((a) => a.active !== false);
  const financialEntries: [string, string][] = [
    ["Month", esc(formatMonth(f.month))],
    ["Monthly fee", money(r.monthly)],
    ...(r.discount > 0 ? [["Discount", money(r.discount)] as [string, string]] : []),
    ["Admission fee", money(r.admission)],
    ["Annual charges", money(r.annual)],
    ["Payable", money(f.amount)],
    ["Previous pending", money(r.previous)],
    ["Total payable", money(r.total)],
    ["Received", money(r.paid)],
    ["Balance due", `<b>${money(r.balance)}</b>`],
  ];
  let financialRows = "";
  for (let i = 0; i < financialEntries.length; i += 2) {
    const a = financialEntries[i], b = financialEntries[i + 1];
    financialRows += `<tr><th>${esc(a[0])}</th><td>${a[1]}</td>${b ? `<th>${esc(b[0])}</th><td>${b[1]}</td>` : `<th></th><td></td>`}</tr>`;
  }
  const copy = (label: string) => `<div class="copy">${header(school)}<h3>Fee Chalan (${label})</h3><h3>Chalan # ${esc(f.chalanNo)}</h3>
  <table>
  <tr><th>Student</th><td>${esc(f.student?.name)}</td><th>Class / section</th><td>${esc(f.student?.className)} ${esc(f.student?.section)}</td></tr>
  <tr><th>Father</th><td>${esc(f.student?.fatherName)}</td><th>Roll #</th><td>${esc(f.student?.rollNo)}</td></tr>
  ${financialRows}</table>
  <h3 style="margin-top:14px">School payment accounts</h3>
  ${paymentAccounts.length ? `<table>${paymentAccounts.map((a) => `<tr><th style="width:35%">${esc(accountTypeLabel(a.type))}<br>For online payment</th><td>${accountLines(a).slice(1).map((line) => esc(line)).join("<br>")}</td></tr>`).join("")}</table>` : '<p style="text-align:center">Contact the school office for payment details.</p>'}
  <p style="font-size:11px;text-align:center">Verify the account title and number before paying. Keep your payment receipt and share it with the school office.</p></div>`;
  openPrint("Fee Chalan", copy("Student Copy") + copy("School Copy"), ".copy{break-inside:avoid}.copy+.copy{break-before:page}@page{margin:10mm}");
}

export function printPaper(p: any, school?: School) {
  const qs = String(p.questions || "").split("\n").filter(Boolean).map((q, i) => `<p><b>Q${i + 1}.</b> ${esc(q)}</p>`).join("");
  openPrint(p.title, `${header(school)}<h2>${esc(p.title)}</h2><h3>${esc(String(p.type).toUpperCase())} - Class ${esc(p.className)} - ${esc(p.subject)}</h3>
  <p>Date: ${esc(p.date)} &nbsp;&nbsp; Total Marks: ${esc(p.totalMarks)}</p><p>Name: ____________ &nbsp; Roll #: ______</p><hr/>${qs}`);
}

// Printable result card of one student: subject wise obtained / total marks,
// overall total, percentage, grade and pass / fail.
const resultCardHtml = (r: any, school?: School, session = "") => {
  const rows = (r.subjects || []).map((s: any) =>
    `<tr><td>${esc(s.paper?.subject)}</td><td>${esc(s.paper?.title)}</td><td>${s.entered ? s.obtained : "not entered"}</td><td>${esc(s.paper?.totalMarks)}</td><td>${s.pass ? "Pass" : "Fail"}</td></tr>`).join("");
  return `${header(school)}<h3>Result Card${session ? ` - ${esc(session)}` : ""}</h3>
  <p><b>${esc(r.student?.name)}</b> &nbsp; S/O ${esc(r.student?.fatherName || "")}</p>
  <p>Class ${esc(r.student?.className)}${r.student?.section ? " " + esc(r.student.section) : ""} &nbsp; Roll # ${esc(r.student?.rollNo || "")}</p>
  <table><thead><tr><th>Subject</th><th>Exam</th><th>Obtained</th><th>Total</th><th>Result</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No exam papers</td></tr>'}</tbody></table>
  <p style="margin-top:12px">Total: <b>${r.obtained} / ${r.total}</b> &nbsp; Percentage: <b>${r.pct.toFixed(1)}%</b> &nbsp; Grade: <b>${r.grade}</b> &nbsp; Result: <b>${r.passed ? "PASS" : "FAIL"}</b></p>
  <p style="margin-top:44px">Class teacher's signature: ____________________</p>`;
};

export function printResultCard(r: any, school?: School, session = "") {
  openPrint("Result Card", resultCardHtml(r, school, session));
}

// Every student's card in one print window (one card per page).
export function printResultCards(rows: any[], school?: School, session = "") {
  if (!rows.length) return;
  openPrint("Result Cards", rows.map((r) => `<section>${resultCardHtml(r, school, session)}</section>`).join(""), "section{break-after:page}section:last-child{break-after:auto}");
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

export function printPayroll(rows: any[], month: string, school: School, voucher = false) {
  const title = voucher ? "Salary payment voucher" : "Salary slip";
  const fields = [["Basic salary", "basic"], ["Allowances", "allowances"], ["Bonus", "bonus"], ["Overtime", "overtime"],
    ["Attendance deduction", "attendance"], ["Advance recovery", "advance"], ["Other deduction", "other"], ["Net salary", "net"]];
  openPrint(title, rows.map(r => `<section>${header(school)}<h3>${title} · ${esc(month)}</h3><p><b>${esc(r.name)}</b> · ${esc(r.designation)}</p>
    <p>${r.paidOn ? `Paid on ${esc(String(r.paidOn).slice(0,10))} · Ref: ${esc(r._id)}` : "Draft — not paid"}</p>
    <table>${fields.map(([label,key]) => `<tr><th>${label}</th><td>${money(r[key])}</td></tr>`).join("")}</table>
    ${voucher ? '<p style="margin-top:56px">Received by: ____________________</p>' : ""}</section>`).join(""), "section:not(:last-child){break-after:page}");
}

// ---------------------------------------------------------------------------
// Inventory & Purchases (purchase invoice, supplier ledger, stock report)
// ---------------------------------------------------------------------------
const inventoryHeader = (title: string, school?: School) => `${header(school)}<h3>${esc(title)}</h3>`;

export function printPurchaseInvoice(inv: any, school?: School) {
  const rows = (inv.rows || []).map((r: any) =>
    `<tr><td>${esc(r.name)}</td><td>${esc(r.unit)}</td><td style="text-align:right">${esc(r.qty)}</td><td style="text-align:right">${money(r.rate)}</td><td style="text-align:right">${money(r.amount)}</td></tr>`).join("");
  const due = (Number(inv.total) || 0) - (Number(inv.paid) || 0);
  openPrint("Purchase Invoice", `${inventoryHeader("Purchase Invoice", school)}
    <p><b>Invoice #:</b> ${esc(inv.invoiceNo)} &nbsp;&nbsp; <b>Date:</b> ${esc(inv.date)} &nbsp;&nbsp; <b>Supplier:</b> ${esc(inv.supplierName)}</p>
    <table><thead><tr><th>Item</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No items</td></tr>'}</tbody>
      <tfoot><tr><th colspan="4" style="text-align:right">Total</th><th style="text-align:right">${money(inv.total)}</th></tr>
      <tr><th colspan="4" style="text-align:right">Paid now</th><th style="text-align:right">${money(inv.paid)}</th></tr>
      <tr><th colspan="4" style="text-align:right">Payable</th><th style="text-align:right">${money(due)}</th></tr></tfoot></table>
    ${inv.note ? `<p>Note: ${esc(inv.note)}</p>` : ""}
    <p style="margin-top:52px">Received by: ____________________ &nbsp;&nbsp;&nbsp;&nbsp; Authorised signature: ____________________</p>`);
}

export function printSupplierLedger(supplier: any, ledger: any, school?: School) {
  const rows = (ledger?.rows || []).map((r: any) =>
    `<tr><td>${esc(r.date || "-")}</td><td>${esc(r.description)}</td><td style="text-align:right">${r.credit ? money(r.credit) : "-"}</td><td style="text-align:right">${r.debit ? money(r.debit) : "-"}</td><td style="text-align:right">${money(r.balance)}</td></tr>`).join("");
  openPrint("Supplier Ledger", `${inventoryHeader(`Supplier Ledger - ${esc(supplier?.name || "")}`, school)}
    <p>Phone: ${esc(supplier?.phone || "-")} &nbsp;&nbsp; Address: ${esc(supplier?.address || "-")}</p>
    <table><thead><tr><th>Date</th><th>Description</th><th>Purchase (credit)</th><th>Payment (debit)</th><th>Balance payable</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">No transactions</td></tr>'}</tbody>
      <tfoot><tr><th colspan="2" style="text-align:right">Total</th><th style="text-align:right">${money(ledger?.credited)}</th><th style="text-align:right">${money(ledger?.debited)}</th><th style="text-align:right">${money(ledger?.balance)}</th></tr></tfoot></table>`);
}

export function printStockReport(rows: { name: string; category: string; unit: string; rate: number; stock: number; value: number }[], school?: School) {
  openPrint("Stock Report", `${inventoryHeader("Items - Stationery, Books, Furniture & Equipment", school)}
    <table><thead><tr><th>Item</th><th>Category</th><th>Unit</th><th>Rate</th><th>In stock</th><th>Value</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.category)}</td><td>${esc(r.unit)}</td><td style="text-align:right">${money(r.rate)}</td><td style="text-align:right">${esc(r.stock)}</td><td style="text-align:right">${money(r.value)}</td></tr>`).join("") || '<tr><td colspan="6">No items</td></tr>'}</tbody>
      <tfoot><tr><th colspan="5" style="text-align:right">Total value</th><th style="text-align:right">${money(rows.reduce((s, r) => s + r.value, 0))}</th></tr></tfoot></table>`);
}
