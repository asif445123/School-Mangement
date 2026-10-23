"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa";
import { api } from "@/lib/api";
import { Field, confirmDelete, formDialog, toast } from "@/lib/alerts";

type Column = { key: string; label: string; render?: (row: any) => React.ReactNode };
type Props = { resource: string; title: string; columns: Column[]; fields: Field[]; defaults?: any; formValues?: (row: any) => any; extra?: any; editFields?: Field[]; transform?: (v: any, isNew: boolean) => any; actions?: (row: any, reload: () => void) => React.ReactNode;
  toolbar?: React.ReactNode; // class / section pickers etc., shown next to the title
  onLoaded?: (rows: any[]) => void; // lets the parent build its pickers from the loaded rows
  filterRows?: (rows: any[]) => any[]; // narrows the table (class + section selection)
  canAdd?: boolean; // false hides the Add button (a read-only list)
  canEdit?: (row: any) => boolean; // false hides Edit / Delete for that row
};

export default function CrudPage({ resource, title, columns, fields, defaults = {}, formValues, extra, editFields, transform, actions, toolbar, onLoaded, filterRows, canAdd = true, canEdit }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const loaded = useRef(onLoaded);
  loaded.current = onLoaded;
  const load = useCallback(() => api(`/api/${resource}`).then((d) => { setRows(d.items); loaded.current?.(d.items); }).catch((e) => toast("error", e.message)), [resource]);
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
  const picked = filterRows ? filterRows(rows) : rows;
  const shown = picked.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-bold">{title}s</h1>{toolbar}</div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input className="input min-w-0 flex-1 sm:w-48 sm:flex-none" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          {canAdd && <button className="btn shrink-0" onClick={() => save()}><FaPlus /> Add</button>}
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr>{columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}<th className="th">Actions</th></tr></thead>
          <tbody>
            {shown.map((r) => {
              const editable = canEdit ? canEdit(r) : true;
              return (
              <tr key={r._id} className="border-t">
                {columns.map((c) => <td key={c.key} className="td">{c.render ? c.render(r) : r[c.key]}</td>)}
                <td className="td whitespace-nowrap">
                  {actions?.(r, load)}
                  {editable && <button className="icon-btn text-blue-600" title="Edit" onClick={() => save(r)}><FaPen /></button>}
                  {editable && <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(r)}><FaTrash /></button>}
                </td>
              </tr>
            );})}
            {!shown.length && <tr><td className="td py-8 text-center text-slate-400" colSpan={columns.length + 1}>No records yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
