import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import { deleteSupplierPayment, inventoryScope } from "@/lib/inventory-server";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  const payment = await deleteSupplierPayment(s.schoolId, (await params).id);
  if (!payment) return fail("Payment not found", 404);
  return NextResponse.json({ ok: true });
}
