import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import PurchaseInvoice from "@/models/purchase-invoice";
import { createPurchaseInvoice, inventoryScope } from "@/lib/inventory-server";

export async function GET() {
  const s = await inventoryScope();
  if (s.error) return s.error;
  return NextResponse.json({
    items: await PurchaseInvoice.find({ school: s.schoolId }).sort({ date: -1, createdAt: -1 }).lean(),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const s = await inventoryScope();
  if (s.error) return s.error;
  try {
    return NextResponse.json({ item: await createPurchaseInvoice(s.schoolId, await req.json()) });
  } catch (e: any) { return fail(e.code === 11000 ? "Invoice number already used, save again" : e.message); }
}
