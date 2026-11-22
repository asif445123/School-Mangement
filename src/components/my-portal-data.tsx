"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

// One /api/my call feeds the whole portal (overview + every child section),
// so switching between Fee Chalan, Daily Diary, Tests and Exams does not
// download the family's fees, diary, papers and marks again on every click.
export type PortalBundle = {
  student: any;
  fees: any[];
  diary: any[];
  marks: any[];
  papers: any[];
  feeSummary?: { total: number; paid: number; balance: number };
};

type PortalValue = {
  data: any;
  bundles: PortalBundle[];
  guardianName: string;
  reload: () => void;
};

const PortalContext = createContext<PortalValue>({ data: null, bundles: [], guardianName: "", reload: () => {} });
export const usePortal = () => useContext(PortalContext);

// children[] is one bundle per linked child; the original single-student
// fields are still in the response, so an older API answer keeps working too.
export function toBundles(data: any): PortalBundle[] {
  if (!data) return [];
  if (data.children?.length) return data.children;
  if (!data.student) return [];
  return [{ student: data.student, fees: data.fees || [], diary: data.diary || [], marks: data.marks || [], papers: data.papers || [] }];
}

export default function MyPortalProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setError("");
    api("/api/my")
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message || "Could not load your portal"); });
    return () => { alive = false; };
  }, [tick]);

  if (!data) {
    return error ? (
      <div className="card space-y-3 text-center">
        <p className="font-semibold text-red-600">{error}</p>
        <button className="btn-light mx-auto" onClick={() => setTick((t) => t + 1)}>Try again</button>
      </div>
    ) : <p className="p-6 text-center text-slate-500">Loading portal...</p>;
  }

  const bundles = toBundles(data);
  const guardianName = data.guardian?.fatherName || data.guardian?.name || bundles[0]?.student?.fatherName || "Guardian";
  return (
    <PortalContext.Provider value={{ data, bundles, guardianName, reload: () => setTick((t) => t + 1) }}>
      {children}
    </PortalContext.Provider>
  );
}

// The child of the current address (/my/<childId>/...). The provider has
// already loaded the data, so a missing bundle only means a wrong link.
export function usePortalChild() {
  const { bundles } = usePortal();
  const params = useParams<{ childId?: string }>();
  const childId = typeof params?.childId === "string" ? params.childId : "";
  return { childId, bundle: bundles.find((b) => String(b.student?._id) === childId) };
}
