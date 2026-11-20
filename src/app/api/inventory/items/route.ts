import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import InventoryItem from "@/models/inventory-item";
import { cleanItem } from "@/lib/inventory-calc";
import { inventoryScope } from "@/lib/inventory-server";

export async function GET() {
  const s = await inventoryScope();
  if (s.error) return s.error;
  return NextResponse.json({ items: await InventoryItem.find({ school: s.schoolId }).sort({ name: 1 }).lean() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    return NextResponse.json({ item: await InventoryItem.create({ ...cleanItem(await req.json()), school: s.schoolId }) });
  } catch (e: any) { return fail(e.code === 11000 ? "An item with this name already exists" : e.message); }
}
