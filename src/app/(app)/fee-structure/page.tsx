"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaPen } from "react-icons/fa";
import { api, money } from "@/lib/api";
import { formDialog, toast } from "@/lib/alerts";
import { matchesStudentSearch, studentClassSection } from "@/lib/student-details";

export default function FeeStructurePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [className, setClassName] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/students");
      setStudents(data.items || []);
    } catch (error: any) {
      toast("error", error.message || "Could not load fee structure");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const classes = useMemo(
    () => [...new Set(students.map((student) => String(student.className || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [students],
  );

  const shown = useMemo(
    () => students
      .filter((student) => !className || student.className === className)
      .filter((student) => matchesStudentSearch(student, query))
      .sort((a, b) => studentClassSection(a).localeCompare(studentClassSection(b), undefined, { numeric: true }) || String(a.name).localeCompare(String(b.name))),
    [students, className, query],
  );

  async function edit(student: any) {
    const values = await formDialog(
      `Fee structure - ${student.name}`,
      [
        { name: "monthlyFee", label: "Actual monthly fee (Rs)", type: "number", required: true },
        { name: "discount", label: "Monthly discount (Rs)", type: "number", required: true },
      ],
      { monthlyFee: Number(student.monthlyFee) || 0, discount: Number(student.discount) || 0 },
      (value) => {
        if (value.monthlyFee < 0 || value.discount < 0) return "Fee and discount cannot be negative";
        if (value.discount > value.monthlyFee) return "Discount cannot exceed the monthly fee";
        return null;
      },
    );
    if (!values) return;

    setSavingId(student._id);
    try {
      const data = await api(`/api/students/${student._id}`, { method: "PUT", body: values });
      setStudents((old) => old.map((row) => row._id === student._id ? { ...row, ...data.item } : row));
      toast("success", "Fee structure updated");
    } catch (error: any) {
      toast("error", error.message || "Could not update fee structure");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Fee Structure</h1>
          <p className="mt-1 text-sm text-slate-500">Set each student&apos;s monthly fee and recurring discount.</p>
        </div>
        <div className="flex w-full flex-col gap-2 min-[440px]:flex-row sm:w-auto">
          <select
            aria-label="Filter by class"
            className="input min-[440px]:w-40"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input
            className="input min-[440px]:w-64"
            placeholder="Search admission no. or name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr>
              {[
                "Admission / Roll #",
                "Student",
                "Father",
                "Class / Section",
                "Monthly fee",
                "Discount",
                "Net monthly fee",
                "Action",
              ].map((heading) => <th key={heading} className="th">{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((student) => {
              const monthlyFee = Number(student.monthlyFee) || 0;
              const discount = Number(student.discount) || 0;
              return (
                <tr key={student._id} className="border-t">
                  <td className="td whitespace-nowrap">{student.rollNo || "—"}</td>
                  <td className="td font-medium text-slate-900">{student.name}</td>
                  <td className="td">{student.fatherName || "—"}</td>
                  <td className="td whitespace-nowrap">{studentClassSection(student)}</td>
                  <td className="td whitespace-nowrap">{money(monthlyFee)}</td>
                  <td className="td whitespace-nowrap">{money(discount)}</td>
                  <td className="td whitespace-nowrap font-semibold">{money(Math.max(0, monthlyFee - discount))}</td>
                  <td className="td">
                    <button
                      type="button"
                      className="icon-btn text-blue-600 disabled:opacity-50"
                      title="Edit fee structure"
                      aria-label={`Edit fee structure for ${student.name}`}
                      disabled={savingId === student._id}
                      onClick={() => edit(student)}
                    >
                      <FaPen />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={8} className="td py-8 text-center text-slate-400">
                  {loading ? "Loading fee structure…" : "No students found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
