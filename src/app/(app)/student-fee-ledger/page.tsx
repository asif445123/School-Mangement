"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FaPrint } from "react-icons/fa";
import { api } from "@/lib/api";
import { toast } from "@/lib/alerts";
import { printStudentFeeLedger } from "@/lib/print";
import { studentClassSection } from "@/lib/student-details";
import { useSession } from "@/components/session";
import { StudentFeeLedgerDetails, useStudentFeeLedger } from "@/components/student-ledger-dialog";

const optionLabel = (student: any) => {
  const admission = String(student.rollNo || "").trim();
  const name = String(student.name || "Student").trim();
  const className = studentClassSection(student);
  return `${admission ? `${admission} - ` : ""}${name}${className !== "-" ? ` (${className})` : ""}`;
};

export default function StudentFeeLedgerPage() {
  const { user } = useSession();
  const [students, setStudents] = useState<any[]>([]);
  const [studentInput, setStudentInput] = useState("");
  const [shownStudentId, setShownStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    let active = true;
    api("/api/students")
      .then((data) => {
        if (!active) return;
        const rows = [...(data.items || [])].sort((a: any, b: any) =>
          String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true }),
        );
        setStudents(rows);
        if (rows.length) setStudentInput((current) => current || optionLabel(rows[0]));
      })
      .catch((error: any) => toast("error", error.message || "Could not load students"))
      .finally(() => { if (active) setLoadingStudents(false); });
    return () => { active = false; };
  }, []);

  const byLabel = useMemo(
    () => new Map(students.map((student) => [optionLabel(student), student])),
    [students],
  );
  const selectedStudent = byLabel.get(studentInput.trim());
  const shownStudent = students.find((student) => student._id === shownStudentId);
  const ledger = useStudentFeeLedger(shownStudent?._id);

  function showLedger(event?: FormEvent) {
    event?.preventDefault();
    if (!selectedStudent) {
      toast("info", "Select a student from the list");
      return;
    }
    setShownStudentId(selectedStudent._id);
  }

  function printLedger() {
    if (!shownStudent || ledger.loading) return;
    printStudentFeeLedger(shownStudent, ledger.fees, user?.schoolInfo);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={showLedger} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block w-full text-sm font-medium text-slate-700 sm:w-80">
          Student (type admission no. or name)
          <input
            className="input mt-1"
            list="student-fee-ledger-options"
            placeholder={loadingStudents ? "Loading students…" : "Select a student"}
            value={studentInput}
            onChange={(event) => setStudentInput(event.target.value)}
            autoComplete="off"
          />
          <datalist id="student-fee-ledger-options">
            {students.map((student) => <option key={student._id} value={optionLabel(student)} />)}
          </datalist>
        </label>
        <button type="submit" className="btn" disabled={!selectedStudent || loadingStudents}>
          Show Ledger
        </button>
        <button
          type="button"
          className="btn-light"
          disabled={!shownStudent || ledger.loading}
          onClick={printLedger}
        >
          <FaPrint /> Print
        </button>
      </form>

      {shownStudent ? (
        <StudentFeeLedgerDetails
          key={shownStudent._id}
          student={shownStudent}
          schoolInfo={user?.schoolInfo}
          {...ledger}
        />
      ) : (
        <div className="card min-h-20">
          <p className="text-sm text-slate-400">
            {loadingStudents ? "Loading students…" : students.length ? "Select a student and click Show Ledger." : "No students found."}
          </p>
        </div>
      )}
    </div>
  );
}
