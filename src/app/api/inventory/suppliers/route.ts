import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import Supplier from "@/models/supplier";
import { cleanSupplier } from "@/lib/inventory-calc";
import { inventoryScope } from "@/lib/inventory-server";

export async function GET() {
  const s = await inventoryScope();
  if (s.error) return s.error;
  return NextResponse.json({ items: await Supplier.find({ school: s.schoolId }).sort({ name: 1 }).lean() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    return NextResponse.json({ item: await Supplier.create({ ...cleanSupplier(await req.json()), school: s.schoolId }) });
  } catch (e: any) { return fail(e.code === 11000 ? "A supplier with this name already exists" : e.message); }
}
