import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "../store";
import {
  PageHeader, Card, Btn, Modal, ConfirmModal, Skeleton, CustomDropdown
} from "../components/ui";
import { SearchFilter, DateRangePicker } from "../components/ui/Filters";
import { toast } from "react-hot-toast";
import { Fuel, Download, Trash2, Pencil, User, Truck, MapPin, Gauge, Plus, X } from "lucide-react";


const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  driverName: "",
  equipment: "",
  site: "",
  qtyUsed: "",
  meterReading: "",
  remarks: "",
};

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5";
const inputCls = "w-full px-3 py-2 h-[38px] text-[13px] border border-gray-200/50 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all";

export function DieselConsumption() {
  const { api, user, settings } = useAppStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const PROJECTS = settings?.projects || [];

  const [entries, setEntries]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [editEntry, setEditEntry]         = useState(null); // entry being edited
  const [editForm, setEditForm]           = useState({});
  const [saving, setSaving]              = useState(false);

  const [search, setSearch]               = useState("");
  const [filterSite, setFilterSite]       = useState("");
  const [startDate, setStartDate]         = useState("");
  const [endDate, setEndDate]             = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 500 };
      if (startDate)  params.startDate = startDate;
      if (endDate)    params.endDate   = endDate;
      if (filterSite) params.site      = filterSite;
      const res = await api.get("diesel-consumption", params);
      setEntries(Array.isArray(res?.data) ? res.data : []);
    } catch {
      toast.error("Failed to load diesel entries");
    } finally {
      setLoading(false);
    }
  }, [api, startDate, endDate, filterSite]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      (e.driverName || "").toLowerCase().includes(q) ||
      (e.equipment  || "").toLowerCase().includes(q) ||
      (e.site       || "").toLowerCase().includes(q) ||
      (e.id         || "").toLowerCase().includes(q) ||
      (e.remarks    || "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  const totalLitres = useMemo(() =>
    filtered.reduce((s, e) => s + (Number(e.qtyUsed) || 0), 0)
  , [filtered]);

  const bySite = useMemo(() => {
    const m = {};
    filtered.forEach(e => { m[e.site] = (m[e.site] || 0) + (Number(e.qtyUsed) || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byEquipment = useMemo(() => {
    const m = {};
    filtered.forEach(e => { m[e.equipment] = (m[e.equipment] || 0) + (Number(e.qtyUsed) || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const siteOptions = useMemo(() => {
    const list = PROJECTS.length
      ? PROJECTS
      : [...new Set(entries.map(e => e.site).filter(Boolean))].sort();
    return [{ value: "", label: "All Projects" }, ...list.map(s => ({ label: s, value: s }))];
  }, [PROJECTS, entries]);

  async function handleSubmit(ev) {
    ev.preventDefault();
    const { date, driverName, equipment, site, qtyUsed } = form;
    if (!date || !driverName.trim() || !equipment.trim() || !site.trim() || !qtyUsed) {
      toast.error("Fill all required fields"); return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("diesel-consumption", { ...form, qtyUsed: Number(form.qtyUsed) });
      if (!res?.success) throw new Error(res?.message || "Failed");
      toast.success("Entry logged");
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      fetchEntries();
    } catch (e) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = localStorage.getItem("token");
      const r = await fetch(`${base}/diesel-consumption/${deleteConfirm}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      if (data.success) { toast.success("Entry deleted"); fetchEntries(); }
      else toast.error(data.message || "Delete failed");
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); setDeleteConfirm(null); }
  }

  function handleExport() {
    const header = ["ID", "Date", "Driver", "Equipment", "Site", "Qty (L)", "Meter Reading", "Remarks", "Submitted By"];
    const rows = filtered.map(e => [
      e.id, e.date, e.driverName, e.equipment, e.site,
      Number(e.qtyUsed).toFixed(1), e.meterReading || "", e.remarks || "", e.submittedBy || ""
    ]);
    const csv = [header, ...rows].map(r =>
      r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `diesel-consumption-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openEdit(entry) {
    setEditEntry(entry);
    setEditForm({
      date:          entry.date || "",
      driverName:    entry.driverName || "",
      equipment:     entry.equipment || "",
      site:          entry.site || "",
      qtyUsed:       entry.qtyUsed ?? "",
      meterReading:  entry.meterReading || "",
      remarks:       entry.remarks || "",
    });
  }

  async function handleSaveEdit(ev) {
    ev.preventDefault();
    const { date, driverName, equipment, site, qtyUsed } = editForm;
    if (!date || !driverName.trim() || !equipment.trim() || !site.trim() || !qtyUsed) {
      toast.error("Fill all required fields"); return;
    }
    setSaving(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = localStorage.getItem("token");
      const r = await fetch(`${base}/diesel-consumption/${editEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...editForm, qtyUsed: Number(editForm.qtyUsed) }),
      });
      const data = await r.json();
      if (data.success) { toast.success("Entry updated"); setEditEntry(null); fetchEntries(); }
      else toast.error(data.message || "Update failed");
    } catch { toast.error("Update failed"); }
    finally { setSaving(false); }
  }

  const colCount = isSuperAdmin ? 10 : 9;

  return (
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title="Diesel Consumption"
        sub="Track fuel usage across all sites and equipment"
        actions={
          <>
            <Btn label="Export CSV" icon={Download} outline onClick={handleExport} />
            {isSuperAdmin && (
              <Btn label="Add Entry" icon={Plus} onClick={() => setShowForm(true)} />
            )}
          </>
        }
      />

      {/* Add Entry Drawer */}
      {showForm && (
        <Modal
          title="Log Diesel Consumption"
          subtitle="Record fuel usage for a site or equipment"
          icon={Fuel}
          onClose={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
          wide
          footer={
            <div className="flex justify-end gap-2">
              <Btn label="Cancel" outline onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }} />
              <Btn label={submitting ? "Saving..." : "Log Consumption"} icon={Fuel} onClick={handleSubmit} disabled={submitting} loading={submitting} />
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" className={inputCls + " [color-scheme:light] dark:[color-scheme:dark]"}
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className={labelCls}>Driver / Operator *</label>
              <input className={inputCls} placeholder="Driver name"
                value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Equipment / Vehicle *</label>
              <input className={inputCls} placeholder="e.g. JCB, DG Set, Truck HR-26-1234"
                value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Site / Project *</label>
              <CustomDropdown
                value={form.site}
                onChange={v => setForm(f => ({ ...f, site: v }))}
                options={[{ value: "", label: "Select site..." }, ...PROJECTS.map(p => ({ value: p, label: p }))]}
                placeholder="Select site..."
              />
            </div>
            <div>
              <label className={labelCls}>Qty Used (Litres) *</label>
              <input type="number" min="0.1" step="0.1" className={inputCls} placeholder="0.0"
                value={form.qtyUsed} onChange={e => setForm(f => ({ ...f, qtyUsed: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Meter / Odometer Reading</label>
              <input className={inputCls} placeholder="e.g. 12450 hrs / km (optional)"
                value={form.meterReading} onChange={e => setForm(f => ({ ...f, meterReading: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Remarks</label>
              <input className={inputCls} placeholder="Any notes (optional)"
                value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Consumed", value: `${totalLitres.toFixed(1)} L`, icon: Fuel,   cls: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10" },
          { label: "Total Entries",  value: filtered.length,               icon: null,    cls: "text-blue-500 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Top Site",       value: bySite[0]?.[0] || "—",         sub: bySite[0] ? `${bySite[0][1].toFixed(1)} L` : null, cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Top Equipment",  value: byEquipment[0]?.[0] || "—",    sub: byEquipment[0] ? `${byEquipment[0][1].toFixed(1)} L` : null, cls: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
        ].map(({ label, value, sub, icon: Icon, cls, bg }) => (
          <div key={label} className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm px-4 py-3 flex items-center gap-3">
            {Icon && (
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${cls}`} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
              <p className={`text-[15px] font-bold truncate ${cls}`}>{value}</p>
              {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tabular-nums">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Site breakdown */}
      {bySite.length > 1 && (
        <Card className="p-4">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Consumption by Site</p>
          <div className="space-y-2.5">
            {bySite.map(([site, qty]) => (
              <div key={site} className="flex items-center gap-3">
                <span className="text-[12px] text-gray-700 dark:text-gray-300 w-40 truncate shrink-0">{site}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(qty / totalLitres) * 100}%` }}
                  />
                </div>
                <span className="text-[12px] font-bold text-gray-600 dark:text-gray-300 w-16 text-right shrink-0 font-mono tabular-nums">
                  {qty.toFixed(1)} L
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters — mobile: stacked, desktop: single row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-nowrap">
        {/* Search — full width on mobile, grows on desktop */}
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search driver, equipment, site, ID…"
          className="w-full sm:flex-1"
        />
        {/* Date + Project — side-by-side on mobile, fixed on desktop */}
        <div className="flex gap-3 items-center">
          <DateRangePicker
            value={{ start: startDate, end: endDate }}
            onChange={v => { setStartDate(v.start); setEndDate(v.end); }}
          />
          <CustomDropdown
            value={filterSite}
            onChange={setFilterSite}
            options={siteOptions}
            placeholder="All Projects"
            className="w-[160px] sm:w-[180px]"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[860px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-[#E8ECF0] dark:border-gray-800">
                {["Ref. No.", "Date", "Driver / Operator", "Equipment / Vehicle", "Site", "Qty (L)", "Meter Reading", "Remarks", "Submitted By", ...(isSuperAdmin ? [""] : [])].map(h => (
                  <th key={h} className="px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap overflow-hidden">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF0] dark:divide-gray-800">
              {loading && entries.length === 0
                ? [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(colCount)].map((__, j) => (
                        <td key={j} className="px-3 py-2.5"><Skeleton className="h-6 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : filtered.map(entry => (
                    <tr key={entry.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2.5 overflow-hidden">
                        <span className="block truncate text-[11px] font-mono text-gray-400" title={entry.id}>{entry.id}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#6B7280] dark:text-gray-400 whitespace-nowrap overflow-hidden">
                        {fmtDate(entry.date)}
                      </td>
                      <td className="px-3 py-2.5 overflow-hidden">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="block truncate text-[13px] font-medium text-[#1A1A2E] dark:text-white">{entry.driverName}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 overflow-hidden">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="block truncate text-[13px] text-[#1A1A2E] dark:text-gray-300">{entry.equipment}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 overflow-hidden">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 whitespace-nowrap">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />{entry.site}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap overflow-hidden">
                        <span className="text-[14px] font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                          {Number(entry.qtyUsed).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-0.5">L</span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#6B7280] dark:text-gray-400 overflow-hidden">
                        {entry.meterReading
                          ? <span className="flex items-center gap-1"><Gauge className="w-3 h-3 text-gray-400 shrink-0" />{entry.meterReading}</span>
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 overflow-hidden">
                        <span className="block truncate text-[13px] text-[#6B7280] dark:text-gray-400" title={entry.remarks}>{entry.remarks || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 overflow-hidden">
                        <span className="block truncate text-[12px] text-[#6B7280] dark:text-gray-400">{entry.submittedBy || "—"}</span>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Btn icon={Pencil} small outline onClick={() => openEdit(entry)} />
                            <Btn icon={Trash2} small outline color="red" onClick={() => setDeleteConfirm(entry.id)} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
              }
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-8 text-center text-[13px] text-gray-500 dark:text-gray-400">
                    No diesel consumption records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-[#E8ECF0] dark:border-gray-800 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"} · <span className="font-mono tabular-nums font-bold">{totalLitres.toFixed(1)} L</span> total
            </span>
          </div>
        )}
      </Card>

      {/* Edit Drawer */}
      {editEntry && (
        <Modal
          title="Edit Entry"
          subtitle={editEntry.id}
          icon={Pencil}
          onClose={() => setEditEntry(null)}
          wide
          footer={
            <div className="flex justify-end gap-2">
              <Btn label="Cancel" outline onClick={() => setEditEntry(null)} />
              <Btn label={saving ? "Saving..." : "Save Changes"} icon={Pencil} onClick={handleSaveEdit} disabled={saving} loading={saving} />
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" className={inputCls + " [color-scheme:light] dark:[color-scheme:dark]"}
                value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Driver / Operator *</label>
              <input className={inputCls} placeholder="Driver name"
                value={editForm.driverName} onChange={e => setEditForm(f => ({ ...f, driverName: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Equipment / Vehicle *</label>
              <input className={inputCls} placeholder="e.g. JCB, DG Set"
                value={editForm.equipment} onChange={e => setEditForm(f => ({ ...f, equipment: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Site / Project *</label>
              <CustomDropdown
                value={editForm.site}
                onChange={v => setEditForm(f => ({ ...f, site: v }))}
                options={[{ value: "", label: "Select site..." }, ...PROJECTS.map(p => ({ value: p, label: p }))]}
                placeholder="Select site..."
              />
            </div>
            <div>
              <label className={labelCls}>Qty Used (Litres) *</label>
              <input type="number" min="0.1" step="0.1" className={inputCls} placeholder="0.0"
                value={editForm.qtyUsed} onChange={e => setEditForm(f => ({ ...f, qtyUsed: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Meter / Odometer Reading</label>
              <input className={inputCls} placeholder="e.g. 12450 hrs / km"
                value={editForm.meterReading} onChange={e => setEditForm(f => ({ ...f, meterReading: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Remarks</label>
              <input className={inputCls} placeholder="Any notes (optional)"
                value={editForm.remarks} onChange={e => setEditForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete Entry"
          message={`Delete entry ${deleteConfirm}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
