"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaChalkboardTeacher, FaClock, FaSave } from "react-icons/fa";
import { api } from "@/lib/api";
import { toast } from "@/lib/alerts";
import { classTeacherClasses } from "@/lib/teacher-scope";
import { blankSchedule, MyPeriod, ownsClass, PERIODS, periodTime, SchoolSchedule, slotText, TimeSlot, TimetableItem } from "@/lib/timetable";
import { useSession } from "./session";

type PeriodGroup = "regularPeriods" | "fridayPeriods";
type BreakGroup = "regularBreak" | "fridayBreak";

const copySchedule = (schedule?: SchoolSchedule): SchoolSchedule => {
  const source = schedule || blankSchedule();
  return {
    regularPeriods: source.regularPeriods.map((slot) => ({ ...slot })),
    fridayPeriods: source.fridayPeriods.map((slot) => ({ ...slot })),
    regularBreak: { ...source.regularBreak },
    fridayBreak: { ...source.fridayBreak },
  };
};

function ScheduleEditor({ title, subtitle, periods, breakSlot, friday, saving, onPeriod, onBreak }: {
  title: string;
  subtitle: string;
  periods: TimeSlot[];
  breakSlot: TimeSlot;
  friday?: boolean;
  saving: boolean;
  onPeriod: (index: number, field: keyof TimeSlot, value: string) => void;
  onBreak: (field: keyof TimeSlot, value: string) => void;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border ${friday ? "border-amber-200" : "border-blue-200"}`}>
      <header className={`px-4 py-3 ${friday ? "bg-amber-50" : "bg-blue-50"}`}>
        <h3 className={`font-semibold ${friday ? "text-amber-900" : "text-blue-900"}`}>{title}</h3>
        <p className={`mt-0.5 text-xs ${friday ? "text-amber-700" : "text-blue-700"}`}>{subtitle}</p>
      </header>
      <div className="divide-y divide-slate-100 bg-white">
        <div className="grid grid-cols-[72px_1fr_1fr] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Period</span><span>Start time</span><span>End time</span>
        </div>
        {PERIODS.map((period, index) => (
          <div key={period} className="grid grid-cols-[72px_1fr_1fr] items-center gap-2 px-3 py-2">
            <span className="text-sm font-medium text-slate-600">Period {period}</span>
            <input aria-label={`${title} period ${period} start`} type="time" className="input min-w-0 px-2 py-1.5 text-xs" value={periods[index]?.start || ""} disabled={saving} onChange={(e) => onPeriod(index, "start", e.target.value)} />
            <input aria-label={`${title} period ${period} end`} type="time" className="input min-w-0 px-2 py-1.5 text-xs" value={periods[index]?.end || ""} disabled={saving} onChange={(e) => onPeriod(index, "end", e.target.value)} />
          </div>
        ))}
        <div className={`grid grid-cols-[72px_1fr_1fr] items-center gap-2 px-3 py-3 ${friday ? "bg-amber-50/60" : "bg-slate-50"}`}>
          <span className="text-sm font-semibold text-slate-700">Break</span>
          <input aria-label={`${title} break start`} type="time" className="input min-w-0 px-2 py-1.5 text-xs" value={breakSlot.start} disabled={saving} onChange={(e) => onBreak("start", e.target.value)} />
          <input aria-label={`${title} break end`} type="time" className="input min-w-0 px-2 py-1.5 text-xs" value={breakSlot.end} disabled={saving} onChange={(e) => onBreak("end", e.target.value)} />
        </div>
      </div>
    </section>
  );
}

// The teacher's own periods (his class + the classes he teaches), with the school times.
function MyPeriodsTable({ title, hint, rows, schedule }: {
  title: string;
  hint: string;
  rows: MyPeriod[];
  schedule: SchoolSchedule;
}) {
  if (!rows.length) return null;
  return (
    <section className="card overflow-hidden p-0">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead><tr><th className="th">Class</th><th className="th">Section</th><th className="th">Subject</th><th className="th">Period</th><th className="th">Monday–Thursday</th><th className="th">Friday</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const monThu = periodTime(schedule, row.period), friday = periodTime(schedule, row.period, true);
              return (
                <tr key={row.key} className="border-t">
                  <td className="td font-semibold">{row.className}</td>
                  <td className="td">{row.section || "-"}</td>
                  <td className="td">{row.subject || "-"}</td>
                  <td className="td">{row.period ? `Period ${row.period}` : <span className="text-slate-400">Not set</span>}</td>
                  <td className={`td whitespace-nowrap ${monThu ? "text-slate-600" : "text-slate-400"}`}>{monThu || "Not set"}</td>
                  <td className={`td whitespace-nowrap ${friday ? "text-slate-600" : "text-slate-400"}`}>{friday || "Not set"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TimetableBoard() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const myClasses = useMemo(() => classTeacherClasses(user), [user]);
  const isClassTeacher = myClasses.length > 0;
  const [items, setItems] = useState<TimetableItem[]>([]);
  const [myPeriods, setMyPeriods] = useState<MyPeriod[]>([]);
  const [schedule, setSchedule] = useState<SchoolSchedule>(blankSchedule());
  const [canEdit, setCanEdit] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<SchoolSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/timetable");
      setItems(data.items);
      setMyPeriods(data.myPeriods || []);
      setSchedule(copySchedule(data.schedule));
      setCanEdit(!!data.canEdit);
      setSelectedKey((current) => data.items.some((item: TimetableItem) => item.key === current) ? current : data.items[0]?.key || "");
    } catch (error: any) {
      toast("error", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const selected = items.find((item) => item.key === selectedKey) || null;
  useEffect(() => { setDraft(canEdit ? copySchedule(schedule) : null); }, [schedule, canEdit]);

  // the teacher's own periods that are NOT in the class he is class teacher of
  const otherPeriods = useMemo(() => myPeriods.filter((p) => !myClasses.some((c) => ownsClass(c, p))), [myPeriods, myClasses]);

  function updatePeriod(group: PeriodGroup, index: number, field: keyof TimeSlot, value: string) {
    setDraft((current) => current ? { ...current, [group]: current[group].map((slot, i) => i === index ? { ...slot, [field]: value } : slot) } : current);
  }
  function updateBreak(group: BreakGroup, field: keyof TimeSlot, value: string) {
    setDraft((current) => current ? { ...current, [group]: { ...current[group], [field]: value } } : current);
  }

  async function save() {
    if (!canEdit || !draft) return;
    setSaving(true);
    try {
      await api("/api/timetable", { method: "PUT", body: draft });
      toast("success", "School period times saved");
      await load();
    } catch (error: any) {
      toast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card py-16 text-center text-slate-400">Loading timetable...</div>;

  const title = canEdit ? "Set Timetable" : isClassTeacher ? "Timetable" : "My Timetable";
  const subtitle = canEdit
    ? "Set the period and break times once for the whole school. Every class follows the same times; Monday–Thursday shares one schedule and Friday has separate times."
    : isClassTeacher
      ? "The timetable of the class you are class teacher of. Your own periods in other classes are listed below it."
      : "The classes, subjects and periods assigned to you, with the school period times.";

  const classTimetable = selected && (
    <section className="card overflow-hidden p-0">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Class {selected.className}{selected.section ? ` ${selected.section}` : ""} timetable</h2>
        <p className="mt-1 text-xs text-slate-500">Subjects and teachers come from their assigned periods on the Teachers page. Every period shows its school time.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className="th">Period</th><th className="th">Subject</th><th className="th">Teacher</th><th className="th">Monday–Thursday</th><th className="th">Friday</th></tr></thead>
          <tbody>
            {PERIODS.map((period, index) => {
              const entries = selected.entries.filter((entry) => entry.period === period);
              return (
                <tr key={period} className="border-t align-top">
                  <td className="td font-semibold text-slate-700">Period {period}</td>
                  <td className="td">{entries.length ? entries.map((entry) => <div key={entry.id} className="py-0.5 font-medium">{entry.subject}</div>) : <span className="text-slate-400">Not assigned</span>}</td>
                  <td className="td text-slate-600">{entries.length ? entries.map((entry) => <div key={entry.id} className="py-0.5">{entry.teacherName}</div>) : "—"}</td>
                  <td className="td whitespace-nowrap text-slate-600">{slotText(schedule.regularPeriods[index])}</td>
                  <td className="td whitespace-nowrap text-slate-600">{slotText(schedule.fridayPeriods[index])}</td>
                </tr>
              );
            })}
            <tr className="border-t bg-amber-50/60">
              <td className="td font-semibold text-amber-900">Break</td><td className="td" colSpan={2}>School break</td>
              <td className="td whitespace-nowrap font-medium text-amber-800">{slotText(schedule.regularBreak)}</td><td className="td whitespace-nowrap font-medium text-amber-800">{slotText(schedule.fridayBreak)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><FaCalendarAlt className="text-blue-600" /> {title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
        </div>
        {canEdit && <Link href="/teachers" className="btn-light flex items-center gap-2"><FaChalkboardTeacher /> Manage teachers & periods</Link>}
      </div>

      {canEdit && draft && (
        <section className="card space-y-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold"><FaClock className="text-blue-600" /> School period times</h2>
            <p className="mt-1 text-sm text-slate-500">These times apply to every class. Leave a row blank only if that period is not used.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ScheduleEditor title="Monday–Thursday" subtitle="One time slot for Monday, Tuesday, Wednesday and Thursday" periods={draft.regularPeriods} breakSlot={draft.regularBreak} saving={saving} onPeriod={(i, f, v) => updatePeriod("regularPeriods", i, f, v)} onBreak={(f, v) => updateBreak("regularBreak", f, v)} />
            <ScheduleEditor title="Friday" subtitle="Separate period and break times for Friday" periods={draft.fridayPeriods} breakSlot={draft.fridayBreak} friday saving={saving} onPeriod={(i, f, v) => updatePeriod("fridayPeriods", i, f, v)} onBreak={(f, v) => updateBreak("fridayBreak", f, v)} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Changing these times updates the timetable of all classes.</p>
            <button className="btn flex items-center gap-2" disabled={saving} onClick={save}><FaSave /> {saving ? "Saving..." : "Save school period times"}</button>
          </div>
        </section>
      )}

      {items.length ? (
        <>
          <div className={`card flex flex-wrap items-end gap-4 ${items.length > 1 ? "justify-between" : "justify-end"}`}>
            {items.length > 1 && (
              <div>
                <label htmlFor="timetable-class" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class / section</label>
                <select id="timetable-class" className="input mt-1 min-w-56" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
                  {items.map((item) => <option key={item.key} value={item.key}>Class {item.className}{item.section ? ` — ${item.section}` : ""}</option>)}
                </select>
              </div>
            )}
            {selected && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">Class teacher: <b>{selected.classTeachers.join(", ") || "Not assigned"}</b></span>}
          </div>
          {classTimetable}
        </>
      ) : isSchool ? (
        <div className="card py-14 text-center">
          <FaCalendarAlt className="mx-auto text-4xl text-slate-300" />
          <h2 className="mt-4 font-semibold">No classes in your timetable yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Add a teacher with a class, subject and period first. The class will then appear here.</p>
          <Link href="/teachers" className="btn mt-5 inline-flex items-center gap-2"><FaChalkboardTeacher /> Add teachers & subjects</Link>
        </div>
      ) : null}

      {!canEdit && isClassTeacher && !items.length && (
        <div className="card py-14 text-center">
          <FaCalendarAlt className="mx-auto text-4xl text-slate-300" />
          <h2 className="mt-4 font-semibold">Your class timetable is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">No subject teacher with a period has been added to your class yet.</p>
          <Link href="/teachers" className="btn mt-5 inline-flex items-center gap-2"><FaChalkboardTeacher /> Add subject teachers</Link>
        </div>
      )}

      {!canEdit && isClassTeacher && (
        <MyPeriodsTable title="My periods in other classes" hint="The subjects you teach in other classes." rows={otherPeriods} schedule={schedule} />
      )}

      {!canEdit && !isClassTeacher && (
        myPeriods.length ? (
          <MyPeriodsTable title="My periods" hint="The classes, subjects and periods assigned to you by the school or your class teacher." rows={myPeriods} schedule={schedule} />
        ) : (
          <div className="card py-14 text-center">
            <FaCalendarAlt className="mx-auto text-4xl text-slate-300" />
            <h2 className="mt-4 font-semibold">No periods assigned yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">No class or subject period has been assigned to you yet. Please contact your school admin.</p>
          </div>
        )
      )}
    </div>
  );
}
