"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaCalendarAlt, FaChalkboardTeacher, FaClock, FaSave } from "react-icons/fa";
import { api } from "@/lib/api";
import { toast } from "@/lib/alerts";
import { classTeacherAssignment } from "@/lib/teacher-scope";
import { PERIODS, slotText, TimeSlot, TimetableItem } from "@/lib/timetable";
import { useSession } from "./session";

type Draft = Pick<TimetableItem, "regularPeriods" | "fridayPeriods" | "regularBreak" | "fridayBreak">;
type PeriodGroup = "regularPeriods" | "fridayPeriods";
type BreakGroup = "regularBreak" | "fridayBreak";

const copyDraft = (item: TimetableItem): Draft => ({
  regularPeriods: item.regularPeriods.map((slot) => ({ ...slot })),
  fridayPeriods: item.fridayPeriods.map((slot) => ({ ...slot })),
  regularBreak: { ...item.regularBreak },
  fridayBreak: { ...item.fridayBreak },
});

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

export default function TimetableBoard() {
  const { user } = useSession();
  const isManager = user.role === "school" || !!classTeacherAssignment(user);
  const [items, setItems] = useState<TimetableItem[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/timetable");
      setItems(data.items);
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
  useEffect(() => { setDraft(selected ? copyDraft(selected) : null); }, [selected]);

  function updatePeriod(group: PeriodGroup, index: number, field: keyof TimeSlot, value: string) {
    setDraft((current) => current ? { ...current, [group]: current[group].map((slot, i) => i === index ? { ...slot, [field]: value } : slot) } : current);
  }
  function updateBreak(group: BreakGroup, field: keyof TimeSlot, value: string) {
    setDraft((current) => current ? { ...current, [group]: { ...current[group], [field]: value } } : current);
  }

  async function save() {
    if (!selected?.editable || !draft) return;
    setSaving(true);
    try {
      await api("/api/timetable", { method: "PUT", body: { className: selected.className, section: selected.section, ...draft } });
      toast("success", "Timetable times saved");
      await load();
    } catch (error: any) {
      toast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card py-16 text-center text-slate-400">Loading timetable...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><FaCalendarAlt className="text-blue-600" /> {isManager ? "Set Timetable" : "My Timetable"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {user.role === "school"
              ? "Set period and break times for every class. Monday–Thursday shares one schedule; Friday has separate times."
              : isManager
                ? "Manage times for your own class and view your teaching schedule in other classes."
                : "Your classes, subjects, periods and school times. This timetable is read-only."}
          </p>
        </div>
        {isManager && <Link href="/teachers" className="btn-light flex items-center gap-2"><FaChalkboardTeacher /> Manage teachers & periods</Link>}
      </div>

      {!items.length ? (
        <div className="card py-14 text-center">
          <FaCalendarAlt className="mx-auto text-4xl text-slate-300" />
          <h2 className="mt-4 font-semibold">No classes in your timetable yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{canEdit ? "Add a teacher with a class, subject and period first. The class will then appear here." : "No class or subject period has been assigned to you yet. Please contact your school admin."}</p>
          {canEdit && <Link href="/teachers" className="btn mt-5 inline-flex items-center gap-2"><FaChalkboardTeacher /> Add teachers & subjects</Link>}
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-end justify-between gap-4">
            <div>
              <label htmlFor="timetable-class" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class / section</label>
              <select id="timetable-class" className="input mt-1 min-w-56" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
                {items.map((item) => <option key={item.key} value={item.key}>Class {item.className}{item.section ? ` — ${item.section}` : ""}</option>)}
              </select>
            </div>
            {selected && <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">Class teacher: <b>{selected.classTeachers.join(", ") || "Not assigned"}</b></span>
              <span className={`rounded-full px-3 py-1.5 font-medium ${selected.editable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{selected.editable ? "You can edit times" : "Read-only"}</span>
            </div>}
          </div>

          {selected && draft && (
            <>
              {selected.editable ? (
                <section className="card space-y-4">
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold"><FaClock className="text-blue-600" /> Period & break times</h2>
                    <p className="mt-1 text-sm text-slate-500">Set times for Class {selected.className}{selected.section ? ` ${selected.section}` : ""}. Leave a row blank only if it is not used.</p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ScheduleEditor title="Monday–Thursday" subtitle="One time slot for Monday, Tuesday, Wednesday and Thursday" periods={draft.regularPeriods} breakSlot={draft.regularBreak} saving={saving} onPeriod={(i, f, v) => updatePeriod("regularPeriods", i, f, v)} onBreak={(f, v) => updateBreak("regularBreak", f, v)} />
                    <ScheduleEditor title="Friday" subtitle="Separate period and break times for Friday" periods={draft.fridayPeriods} breakSlot={draft.fridayBreak} friday saving={saving} onPeriod={(i, f, v) => updatePeriod("fridayPeriods", i, f, v)} onBreak={(f, v) => updateBreak("fridayBreak", f, v)} />
                  </div>
                  <div className="flex justify-end"><button className="btn flex items-center gap-2" disabled={saving} onClick={save}><FaSave /> {saving ? "Saving..." : "Save timetable times"}</button></div>
                </section>
              ) : (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">You can view this class schedule, but only the school admin or its class teacher can change its times.</div>
              )}

              <section className="card overflow-hidden p-0">
                <div className="border-b px-5 py-4">
                  <h2 className="font-semibold">Class {selected.className}{selected.section ? ` ${selected.section}` : ""} timetable</h2>
                  <p className="mt-1 text-xs text-slate-500">Subjects and teachers come from their assigned periods on the Teachers page.</p>
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
                            <td className="td whitespace-nowrap text-slate-600">{slotText(selected.regularPeriods[index])}</td>
                            <td className="td whitespace-nowrap text-slate-600">{slotText(selected.fridayPeriods[index])}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t bg-amber-50/60">
                        <td className="td font-semibold text-amber-900">Break</td><td className="td" colSpan={2}>School break</td>
                        <td className="td whitespace-nowrap font-medium text-amber-800">{slotText(selected.regularBreak)}</td><td className="td whitespace-nowrap font-medium text-amber-800">{slotText(selected.fridayBreak)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {selected.entries.some((entry) => !entry.period) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <b>Subjects still needing a period:</b> {selected.entries.filter((entry) => !entry.period).map((entry) => `${entry.subject} (${entry.teacherName})`).join(", ")}.
                  {selected.editable && <> Open <Link href="/teachers" className="font-semibold underline">Teachers</Link> to select periods 1–8.</>}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
