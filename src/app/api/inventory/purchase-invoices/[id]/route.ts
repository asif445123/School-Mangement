import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import { deletePurchaseInvoice, inventoryScope } from "@/lib/inventory-server";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  const invoice = await deletePurchaseInvoice(s.schoolId, (await params).id);
  if (!invoice) return fail("Invoice not found", 404);
  return NextResponse.json({ ok: true });
}
