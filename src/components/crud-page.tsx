"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa";
import { api } from "@/lib/api";
import { Field, confirmDelete, formDialog, toast } from "@/lib/alerts";

type Column = { key: string; label: string; render?: (row: any) => React.ReactNode };
type Props = { resource: string; title: string; columns: Column[]; fields: Field[]; defaults?: any; formValues?: (row: any) => any; extra?: any; editFields?: Field[]; transform?: (v: any, isNew: boolean) => any; actions?: (row: any, reload: () => void) => React.ReactNode };

export default function CrudPage({ resource, title, columns, fields, defaults = {}, formValues, extra, editFields, transform, actions }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const load = useCallback(() => api(`/api/${resource}`).then((d) => setRows(d.items)).catch((e) => toast("error", e.message)), [resource]);
  useEffect(() => { load(); }, [load]);

  async function save(row?: any) {
    const v = await formDialog(row ? `Edit ${title}` : `Add ${title}`, row && editFields ? editFields : fields, row ? (formValues ? formValues(row) : row) : defaults);
    if (!v) return;
    try {
      await api(row ? `/api/${resource}/${row._id}` : `/api/${resource}`, { method: row ? "PUT" : "POST", body: row ? (transform ? transform(v, false) : v) : { ...extra, ...(transform ? transform(v, true) : v) } });
      toast("success", "Saved"); load();
    } catch (e: any) { toast("error", e.message); }
  }
  async function remove(row: any) {
    if (!(await confirmDelete())) return;
    try { await api(`/api/${resource}/${row._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  const shown = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{title}s</h1>
        <div className="flex gap-2">
          <input className="input w-48" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn flex items-center gap-2" onClick={() => save()}><FaPlus /> Add</button>
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>{columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}<th className="th">Actions</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-t">
                {columns.map((c) => <td key={c.key} className="td">{c.render ? c.render(r) : r[c.key]}</td>)}
                <td className="td whitespace-nowrap">
                  {actions?.(r, load)}
                  <button className="icon-btn text-blue-600" title="Edit" onClick={() => save(r)}><FaPen /></button>
                  <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(r)}><FaTrash /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td className="td py-8 text-center text-slate-400" colSpan={columns.length + 1}>No records yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
