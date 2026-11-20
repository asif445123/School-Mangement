import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import Supplier from "@/models/supplier";
import { cleanSupplier } from "@/lib/inventory-calc";
import { deleteSupplier, inventoryScope } from "@/lib/inventory-server";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    const item = await Supplier.findOneAndUpdate({ _id: (await params).id, school: s.schoolId }, cleanSupplier(await req.json()), { new: true, runValidators: true });
    if (!item) return fail("Supplier not found", 404);
    return NextResponse.json({ item });
  } catch (e: any) { return fail(e.code === 11000 ? "A supplier with this name already exists" : e.message); }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    const item = await deleteSupplier(s.schoolId, (await params).id);
    if (!item) return fail("Supplier not found", 404);
    return NextResponse.json({ ok: true });
  } catch (e: any) { return fail(e.message); }
}
