import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import SupplierPayment from "@/models/supplier-payment";
import { createSupplierPayment, inventoryScope } from "@/lib/inventory-server";

export async function GET() {
  const s = await inventoryScope();
  if (s.error) return s.error;
  return NextResponse.json({
    items: await SupplierPayment.find({ school: s.schoolId }).populate("supplier", "name").sort({ date: -1, createdAt: -1 }).lean(),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    return NextResponse.json({ item: await createSupplierPayment(s.schoolId, await req.json()) });
  } catch (e: any) { return fail(e.message); }
}
