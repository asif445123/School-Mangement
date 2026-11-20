import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import PurchaseRequisition from "@/models/purchase-requisition";
import { cleanRequisition } from "@/lib/inventory-calc";
import { inventoryScope } from "@/lib/inventory-server";

export async function GET() {
  const s = await inventoryScope();
  if (s.error) return s.error;
  return NextResponse.json({ items: await PurchaseRequisition.find({ school: s.schoolId }).sort({ date: -1, createdAt: -1 }).lean() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    return NextResponse.json({ item: await PurchaseRequisition.create({ ...cleanRequisition(await req.json()), school: s.schoolId }) });
  } catch (e: any) { return fail(e.message); }
}
