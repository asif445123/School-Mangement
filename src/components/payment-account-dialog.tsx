"use client";
import { api } from "@/lib/api";
import { formDialog, toast } from "@/lib/alerts";
import { cleanPaymentAccount, paymentAccountFields } from "@/lib/payment-accounts";
export async function editPaymentAccount(row?: any) {
  const values = await formDialog(row ? "Edit payment account" : "Add payment account", paymentAccountFields, row || { type: "bank", active: true }, (v) => { try { cleanPaymentAccount(v); } catch (e: any) { return e.message; } });
  if (!values) return false;
  try { await api(row ? `/api/payment-accounts/${row._id}` : "/api/payment-accounts", { method: row ? "PUT" : "POST", body: values }); toast("success", "Payment account saved. Active accounts appear on fee vouchers."); window.dispatchEvent(new Event("payment-accounts-changed")); return true; }
  catch (e: any) { toast("error", e.message); return false; }
}
