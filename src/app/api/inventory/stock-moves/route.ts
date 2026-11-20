import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import StockMove from "@/models/stock-move";
import { createStockMove, inventoryScope } from "@/lib/inventory-server";

export async function GET() {
  const s = await inventoryScope();
  if (s.error) return s.error;
  return NextResponse.json({
    items: await StockMove.find({ school: s.schoolId }).populate("item", "name unit category").sort({ date: -1, createdAt: -1 }).lean(),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    return NextResponse.json({ item: await createStockMove(s.schoolId, await req.json()) });
  } catch (e: any) { return fail(e.message); }
}
