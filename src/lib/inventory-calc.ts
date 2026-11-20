// Pure helpers for Inventory & Purchases (no database / mongoose imports, so
// they can be unit tested and reused by both the API routes and the pages).
export const ITEM_CATEGORIES = ["Stationery", "Books", "Furniture", "Equipment", "Other"];
export const ITEM_UNITS = ["pcs", "box", "set", "ream", "packet", "dozen", "kg", "ltr"];
export const REQUISITION_STATUS = ["Pending", "Approved", "Ordered", "Rejected"];
export const PAYMENT_MODES = ["Cash", "Bank", "Cheque", "Online / Transfer"];
export const INVENTORY_EXPENSE_ACCOUNT = "Inventory / Store expense";

export const stockLabel = "Items - Stationery, Books, Furniture & Equipment";

// What is physically in the store: the opening stock plus every Stock In and
// minus every Stock Out. Purchase invoices write their own Stock In rows, so a
// purchase immediately raises the stock without any extra bookkeeping.
export function stockOf(item: any, moves: any[]) {
  return (Number(item?.openingStock) || 0) + moves.reduce((sum, m) => sum + (m.type === "out" ? -1 : 1) * (Number(m.qty) || 0), 0);
}
export const stockValue = (item: any, moves: any[]) => stockOf(item, moves) * (Number(item?.rate) || 0);
export const belowAlert = (item: any, moves: any[]) => !!Number(item?.minStock) && stockOf(item, moves) <= Number(item.minStock);

const text = (v: any, max = 160) => String(v ?? "").trim().slice(0, max);
const amount = (v: any) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function cleanItem(body: any) {
  const name = text(body?.name, 120);
  if (!name) throw new Error("Item name is required");
  const category = ITEM_CATEGORIES.includes(body?.category) ? body.category : "Stationery";
  return {
    name,
    category,
    unit: text(body?.unit, 20) || "pcs",
    rate: amount(body?.rate),
    openingStock: amount(body?.openingStock),
    minStock: amount(body?.minStock),
  };
}

export function cleanSupplier(body: any) {
  const name = text(body?.name, 120);
  if (!name) throw new Error("Supplier name is required");
  return { name, phone: text(body?.phone, 30), address: text(body?.address, 240), openingPayable: amount(body?.openingPayable) };
}

export function cleanRequisition(body: any) {
  const item = text(body?.item, 160);
  if (!item) throw new Error("Item / description is required");
  const quantity = amount(body?.quantity);
  if (!(quantity > 0)) throw new Error("Quantity must be greater than 0");
  const status = REQUISITION_STATUS.includes(body?.status) ? body.status : "Pending";
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(body?.date || "") ? body.date : new Date().toISOString().slice(0, 10),
    item, quantity, department: text(body?.department, 80), requestedBy: text(body?.requestedBy, 80), status, note: text(body?.note, 300),
  };
}

// Supplier ledger = opening payable + every purchase invoice (credit) - every
// payment (debit, including the "Paid Now" amount typed on an invoice).
// Cash purchases carry no supplier, so they never reach the ledger.
export type LedgerRow = { date: string; description: string; credit: number; debit: number; balance: number; paymentId?: string };

export function supplierLedger(supplier: any, invoices: any[], payments: any[]) {
  const id = String(supplier?._id || "");
  const rows: LedgerRow[] = [];
  let balance = Number(supplier?.openingPayable) || 0;
  rows.push({ date: "", description: "Opening payable balance", credit: 0, debit: 0, balance });
  const events: (LedgerRow & { order: number })[] = [];
  for (const inv of invoices) {
    if (String(inv.supplier?._id || inv.supplier || "") !== id) continue;
    events.push({ date: inv.date, description: `Purchase invoice ${inv.invoiceNo}`, credit: Number(inv.total) || 0, debit: 0, balance: 0, order: 0 });
    if (Number(inv.paid) > 0) events.push({ date: inv.date, description: `Paid with invoice ${inv.invoiceNo} (${inv.mode || "Cash"})`, credit: 0, debit: Number(inv.paid) || 0, balance: 0, order: 1 });
  }
  for (const p of payments) {
    if (String(p.supplier?._id || p.supplier || "") !== id) continue;
    events.push({ date: p.date, description: `Payment to supplier (${p.mode || "Cash"})`, credit: 0, debit: Number(p.amount) || 0, balance: 0, order: 2, paymentId: String(p._id || "") });
  }
  events.sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.order - b.order || a.description.localeCompare(b.description));
  for (const e of events) {
    balance += e.credit - e.debit;
    rows.push({ date: e.date, description: e.description, credit: e.credit, debit: e.debit, balance, paymentId: e.paymentId });
  }
  return { rows, balance, credited: events.reduce((s, e) => s + e.credit, 0), debited: events.reduce((s, e) => s + e.debit, 0) };
}

// Ledger of one item: opening stock, then every Stock In / Stock Out.
export function itemLedger(item: any, moves: any[]) {
  const rows: { date: string; description: string; inQty: number; outQty: number; rate: number; balance: number }[] = [];
  const opening = Number(item?.openingStock) || 0;
  let balance = opening;
  rows.push({ date: "", description: "Opening stock", inQty: opening, outQty: 0, rate: Number(item?.rate) || 0, balance });
  for (const m of [...moves].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
    const qty = Number(m.qty) || 0;
    const out = m.type === "out";
    balance += out ? -qty : qty;
    rows.push({ date: m.date, description: m.note || m.ref || (out ? "Stock out" : "Stock in"), inQty: out ? 0 : qty, outQty: out ? qty : 0, rate: Number(m.rate) || 0, balance });
  }
  return rows;
}

// Invoice number PI-0001, PI-0002 ... unique per school.
export function nextInvoiceNo(last?: string) {
  const n = Number(String(last || "").replace(/\D/g, "")) || 0;
  return `PI-${String(n + 1).padStart(4, "0")}`;
}

export const invoiceTotal = (rows: { qty: any; rate: any }[]) =>
  (rows || []).reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
