import { fail, getSessionUser } from "./auth";
import { connectDb } from "./db";
import Account from "@/models/account";
import AccountType from "@/models/account-type";
import Entry from "@/models/entry";
import InventoryItem from "@/models/inventory-item";
import PurchaseInvoice from "@/models/purchase-invoice";
import StockMove from "@/models/stock-move";
import Supplier from "@/models/supplier";
import SupplierPayment from "@/models/supplier-payment";
import { INVENTORY_EXPENSE_ACCOUNT, cleanItem, invoiceTotal, nextInvoiceNo } from "./inventory-calc";

// Only the school admin keeps the store and buys for it.
export async function inventoryScope() {
  const user = await getSessionUser();
  if (user?.role !== "school") return { error: fail("School administrators only", 403) };
  await connectDb();
  return { user, schoolId: user._id as any };
}

// The expense account used for every automatic inventory posting. It is created
// on first use (with an expense account type) so the purchase / stock out
// amounts show up in Enter Expenses and in the reports straight away.
export async function inventoryExpenseAccount(schoolId: any) {
  const existing = await Account.findOne({ school: schoolId, name: INVENTORY_EXPENSE_ACCOUNT });
  if (existing) return existing;
  let type = await AccountType.findOne({ school: schoolId, name: "Store & inventory" });
  if (!type) type = await AccountType.create({ school: schoolId, name: "Store & inventory", isExpense: true });
  const last = await Account.findOne({ school: schoolId }).sort({ code: -1 }).select("code").lean();
  const code = String((Number((last as any)?.code) || 0) + 1).padStart(4, "0");
  return Account.create({ school: schoolId, code, name: INVENTORY_EXPENSE_ACCOUNT, accountType: type._id });
}

// Posts one expense row (same shape as Enter Expenses) on a new journal voucher.
export async function postExpense(schoolId: any, date: string, amount: number, narration: string) {
  if (!(Number(amount) > 0)) return null;
  const account = await inventoryExpenseAccount(schoolId);
  const last: any = await Entry.findOne({ school: schoolId, jv: { $exists: true } }).sort({ jv: -1 }).select("jv").lean();
  return Entry.create({ school: schoolId, jv: (last?.jv || 0) + 1, date, account: account._id, narration: narration.slice(0, 300), amount: Number(amount) });
}
export const dropExpense = async (entryId: any) => { if (entryId) await Entry.deleteOne({ _id: entryId }); };

const dateOk = (v: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const money = (v: any) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

// ---------------------------------------------------------------------------
// Purchase invoices: they raise the stock and (when paid) post the expense.
// ---------------------------------------------------------------------------
export async function createPurchaseInvoice(schoolId: any, body: any) {
  if (!dateOk(body?.date)) throw new Error("Select the date");
  const rows = Array.isArray(body?.rows) ? body.rows.filter((r: any) => r?.item && Number(r?.qty) > 0) : [];
  if (!rows.length) throw new Error("Add at least one item with quantity");
  const items = await InventoryItem.find({ school: schoolId, _id: { $in: rows.map((r: any) => r.item) } }).lean();
  const byId = new Map(items.map((i: any) => [String(i._id), i]));
  if (byId.size !== new Set(rows.map((r: any) => String(r.item))).size) throw new Error("Invalid item");

  let supplier: any = null;
  if (body?.supplier) {
    supplier = await Supplier.findOne({ _id: body.supplier, school: schoolId }).lean();
    if (!supplier) throw new Error("Invalid supplier");
  }
  const clean = rows.map((r: any) => {
    const item: any = byId.get(String(r.item));
    const qty = money(r.qty), rate = Number(r.rate) >= 0 ? Number(r.rate) : Number(item.rate) || 0;
    return { item: item._id, name: item.name, unit: item.unit, qty, rate, amount: qty * rate };
  });
  const total = invoiceTotal(clean);
  const paid = Math.min(money(body?.paid), total);
  let account: any = null;
  if (body?.account) account = await Account.findOne({ _id: body.account, school: schoolId }).select("_id").lean();

  const last: any = await PurchaseInvoice.findOne({ school: schoolId }).sort({ invoiceNo: -1 }).select("invoiceNo").lean();
  const invoiceNo = nextInvoiceNo(last?.invoiceNo);
  const entry = await postExpense(schoolId, body.date, paid, `Purchase ${invoiceNo}${supplier ? ` - ${supplier.name}` : " - Cash purchase"}`);

  const invoice = await PurchaseInvoice.create({
    school: schoolId, invoiceNo, date: body.date,
    supplier: supplier?._id || null, supplierName: supplier?.name || "Cash Purchase",
    rows: clean, total, paid,
    mode: String(body?.mode || "Cash").slice(0, 30),
    account: account?._id || null,
    note: String(body?.note || "").slice(0, 300),
    entry: entry?._id || null,
  });
  await StockMove.insertMany(clean.map((r: any) => ({
    school: schoolId, date: body.date, item: r.item, type: "in", qty: r.qty, rate: r.rate,
    note: `Purchase${supplier ? ` - ${supplier.name}` : ""}`, ref: invoiceNo,
  })));
  return invoice;
}

export async function deletePurchaseInvoice(schoolId: any, id: string) {
  const invoice: any = await PurchaseInvoice.findOne({ _id: id, school: schoolId });
  if (!invoice) return null;
  await StockMove.deleteMany({ school: schoolId, ref: invoice.invoiceNo });
  await dropExpense(invoice.entry);
  await invoice.deleteOne();
  return invoice;
}

// ---------------------------------------------------------------------------
// Stock In / Out: a Stock Out is also an expense (qty x rate).
// ---------------------------------------------------------------------------
export async function createStockMove(schoolId: any, body: any) {
  if (!dateOk(body?.date)) throw new Error("Select the date");
  const item: any = await InventoryItem.findOne({ _id: body?.item, school: schoolId }).lean();
  if (!item) throw new Error("Select a valid item");
  const qty = Number(body?.qty);
  if (!(qty > 0)) throw new Error("Quantity must be greater than 0");
  const type = body?.type === "out" ? "out" : "in";
  const rate = Number(body?.rate) >= 0 && body?.rate !== undefined && body?.rate !== "" ? Number(body.rate) : Number(item.rate) || 0;
  const note = String(body?.note || "").slice(0, 200);
  const entry = type === "out" ? await postExpense(schoolId, body.date, qty * rate, `Stock out - ${item.name}${note ? ` (${note})` : ""}`) : null;
  return StockMove.create({ school: schoolId, date: body.date, item: item._id, type, qty, rate, note, ref: String(body?.ref || "").slice(0, 40), entry: entry?._id || null });
}

export async function deleteStockMove(schoolId: any, id: string) {
  const move: any = await StockMove.findOne({ _id: id, school: schoolId });
  if (!move) return null;
  if (move.ref) throw new Error("This movement belongs to a purchase invoice. Delete the invoice instead.");
  await dropExpense(move.entry);
  await move.deleteOne();
  return move;
}

// ---------------------------------------------------------------------------
// Supplier payments: reduce the payable balance and post the expense.
// ---------------------------------------------------------------------------
export async function createSupplierPayment(schoolId: any, body: any) {
  if (!dateOk(body?.date)) throw new Error("Select the date");
  const supplier: any = await Supplier.findOne({ _id: body?.supplier, school: schoolId }).lean();
  if (!supplier) throw new Error("Select a supplier");
  const amount = Number(body?.amount);
  if (!(amount > 0)) throw new Error("Amount must be greater than 0");
  let account: any = null;
  if (body?.account) account = await Account.findOne({ _id: body.account, school: schoolId }).select("_id").lean();
  const entry = await postExpense(schoolId, body.date, amount, `Payment to supplier - ${supplier.name}`);
  return SupplierPayment.create({
    school: schoolId, supplier: supplier._id, date: body.date, amount,
    mode: String(body?.mode || "Cash").slice(0, 30), account: account?._id || null,
    note: String(body?.note || "").slice(0, 300), entry: entry?._id || null,
  });
}

export async function deleteSupplierPayment(schoolId: any, id: string) {
  const payment: any = await SupplierPayment.findOne({ _id: id, school: schoolId });
  if (!payment) return null;
  await dropExpense(payment.entry);
  await payment.deleteOne();
  return payment;
}

// Deleting an item / supplier is only allowed while nothing depends on it.
export async function deleteItem(schoolId: any, id: string) {
  if (await StockMove.exists({ school: schoolId, item: id })) throw new Error("This item has stock movements. Remove them first.");
  const invoice = await PurchaseInvoice.findOne({ school: schoolId, "rows.item": id }).select("invoiceNo").lean();
  if (invoice) throw new Error(`This item is used in purchase invoice ${(invoice as any).invoiceNo}.`);
  return InventoryItem.findOneAndDelete({ _id: id, school: schoolId });
}

export async function deleteSupplier(schoolId: any, id: string) {
  if (await PurchaseInvoice.exists({ school: schoolId, supplier: id })) throw new Error("This supplier has purchase invoices and cannot be deleted.");
  if (await SupplierPayment.exists({ school: schoolId, supplier: id })) throw new Error("This supplier has payments and cannot be deleted.");
  return Supplier.findOneAndDelete({ _id: id, school: schoolId });
}

export const ensureItem = (body: any) => cleanItem(body);
