import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import { deleteStockMove, inventoryScope } from "@/lib/inventory-server";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    const move = await deleteStockMove(s.schoolId, (await params).id);
    if (!move) return fail("Movement not found", 404);
    return NextResponse.json({ ok: true });
  } catch (e: any) { return fail(e.message); }
}
