import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import PurchaseRequisition from "@/models/purchase-requisition";
import { cleanRequisition } from "@/lib/inventory-calc";
import { inventoryScope } from "@/lib/inventory-server";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    const item = await PurchaseRequisition.findOneAndUpdate({ _id: (await params).id, school: s.schoolId }, cleanRequisition(await req.json()), { new: true, runValidators: true });
    if (!item) return fail("Requisition not found", 404);
    return NextResponse.json({ item });
  } catch (e: any) { return fail(e.message); }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  const item = await PurchaseRequisition.findOneAndDelete({ _id: (await params).id, school: s.schoolId });
  if (!item) return fail("Requisition not found", 404);
  return NextResponse.json({ ok: true });
}
