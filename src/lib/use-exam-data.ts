"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { toast } from "./alerts";
import { studentRights } from "./student-scope";
import { byClassName } from "./results";

// Exam papers, their marks and the students, shared by the Result & Card and the
// Student Promotion tabs. A teacher only gets the classes (and sections) he is
// assigned to; the school gets everything.
export function useExamData(user: any) {
  const isSchool = user?.role === "school";
  const [papers, setPapers] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const load = useCallback(() => Promise.all([api("/api/papers"), api("/api/marks"), api("/api/students")]).then(([p, m, s]) => {
    let papers = (p.items || []).filter((x: any) => x.type === "exam");
    let students = (s.items || []).filter((x: any) => !x.leftDate); // students still studying
    if (!isSchool && user) {
      papers = papers.filter((x: any) => studentRights(user, { className: x.className, section: x.section }));
      students = students.filter((x: any) => studentRights(user, x));
    }
    setPapers(papers);
    setMarks(m.items || []);
    setStudents(students);
  }).catch((e: any) => toast("error", e.message)), [isSchool, user]);

  useEffect(() => { load(); }, [load]);

  // Sessions actually used by the exam papers (latest first); "" = papers with no session
  const sessions = useMemo(
    () => [...new Set(papers.map((p) => String(p.session || "").trim()))].sort().reverse(),
    [papers],
  );
  const classes = useMemo(
    () => [...new Set(students.map((s) => s.className))].sort(byClassName),
    [students],
  );

  return { papers, marks, students, sessions, classes, reload: load };
}
