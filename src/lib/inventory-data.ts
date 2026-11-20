"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export type InventoryData = {
  items: any[]; suppliers: any[]; requisitions: any[]; moves: any[];
  invoices: any[]; payments: any[]; accounts: any[];
};
const empty: InventoryData = { items: [], suppliers: [], requisitions: [], moves: [], invoices: [], payments: [], accounts: [] };

// Loads everything the six inventory tabs need in one go.
export function useInventory() {
  const [d, setD] = useState<InventoryData>(empty);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    return Promise.all([
      api("/api/inventory/items"), api("/api/inventory/suppliers"), api("/api/inventory/requisitions"),
      api("/api/inventory/stock-moves"), api("/api/inventory/purchase-invoices"),
      api("/api/inventory/supplier-payments"), api("/api/accounts"),
    ]).then(([items, suppliers, requisitions, moves, invoices, payments, accounts]) => {
      setD({
        items: items.items, suppliers: suppliers.items, requisitions: requisitions.items,
        moves: moves.items, invoices: invoices.items, payments: payments.items, accounts: accounts.items,
      });
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { reload().catch(() => setLoading(false)); }, [reload]);
  return { ...d, loading, reload, setD };
}

// Bank / cash accounts of the school, shown as "code - name".
export const accountLabel = (a: any) => `${a.code} - ${a.name}`;
export const accountOption = (a: any) => ({ value: a._id, label: accountLabel(a) });
