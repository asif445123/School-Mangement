import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import InventoryItem from "@/models/inventory-item";
import { cleanItem } from "@/lib/inventory-calc";
import { deleteItem, inventoryScope } from "@/lib/inventory-server";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    const item = await InventoryItem.findOneAndUpdate({ _id: (await params).id, school: s.schoolId }, cleanItem(await req.json()), { new: true, runValidators: true });
    if (!item) return fail("Item not found", 404);
    return NextResponse.json({ item });
  } catch (e: any) { return fail(e.code === 11000 ? "An item with this name already exists" : e.message); }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    const item = await deleteItem(s.schoolId, (await params).id);
    if (!item) return fail("Item not found", 404);
    return NextResponse.json({ ok: true });
  } catch (e: any) { return fail(e.message); }
}
