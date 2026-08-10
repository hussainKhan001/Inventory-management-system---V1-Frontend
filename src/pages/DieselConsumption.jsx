import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "../store";
import { toast } from "react-hot-toast";
import {
  Fuel, Plus, Trash2, Search, X, RefreshCw, Download,
  CalendarDays, Gauge, MapPin, User, Truck
} from "lucide-react";

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  driverName: "",
  equipment: "",
  site: "",
  qtyUsed: "",
  meterReading: "",
  remarks: "",
};

const inputCls = "w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all";
const labelCls = "text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";

function formatDate(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export function DieselConsumption() {
  const { api, user, settings, hasPermission } = useAppStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const PROJECTS = settings?.projects || [];

  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]     = useState(null);

  // Filters
  const [search, setSearch]         = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 500 };
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      if (filterSite) params.site     = filterSite;
      const res = await api.get("diesel-consumption", params);
      setEntries(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      toast.error("Failed to load entries");
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

  // Summary stats
  const totalLitres  = useMemo(() => filtered.reduce((s, e) => s + (Number(e.qtyUsed) || 0), 0), [filtered]);
  const bySite       = useMemo(() => {
    const map = {};
    filtered.forEach(e => { map[e.site] = (map[e.site] || 0) + (Number(e.qtyUsed) || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const byEquipment  = useMemo(() => {
    const map = {};
    filtered.forEach(e => { map[e.equipment] = (map[e.equipment] || 0) + (Number(e.qtyUsed) || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const siteOptions = useMemo(() => {
    const s = new Set(entries.map(e => e.site).filter(Boolean));
    return [...s].sort();
  }, [entries]);

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

  async function handleDelete(id) {
    if (!window.confirm(`Delete entry ${id}?`)) return;
    setDeleting(id);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = localStorage.getItem("token");
      const r = await fetch(`${base}/diesel-consumption/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      if (data.success) { toast.success("Deleted"); fetchEntries(); }
      else toast.error(data.message || "Delete failed");
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(null); }
  }

  function handleExport() {
    const header = ["ID", "Date", "Driver", "Equipment", "Site", "Qty (L)", "Meter Reading", "Remarks", "Submitted By"];
    const rows = filtered.map(e => [
      e.id, e.date, e.driverName, e.equipment, e.site,
      Number(e.qtyUsed).toFixed(1), e.meterReading || "", e.remarks || "", e.submittedBy || ""
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `diesel-consumption-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Fuel className="w-6 h-6 text-amber-500" /> Diesel Consumption
          </h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Track fuel usage across all sites and equipment</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchEntries} disabled={loading}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          {isSuperAdmin && (
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          )}
        </div>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800/40 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Fuel className="w-4 h-4 text-amber-500" /> Log Diesel Consumption
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Date *</label>
                <input type="date" className={inputCls + " [color-scheme:light] dark:[color-scheme:dark]"}
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Driver / Operator *</label>
                <input className={inputCls} placeholder="Driver name"
                  value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Equipment / Vehicle *</label>
                <input className={inputCls} placeholder="e.g. JCB, DG Set, Truck HR-26-1234"
                  value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Site / Project *</label>
                {PROJECTS.length > 0 ? (
                  <select className={inputCls + " [color-scheme:light] dark:[color-scheme:dark]"}
                    value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} required>
                    <option value="">Select site...</option>
                    {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <input className={inputCls} placeholder="Site / project"
                    value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} required />
                )}
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Diesel Qty (Litres) *</label>
                <input type="number" min="0.1" step="0.1" className={inputCls} placeholder="0.0"
                  value={form.qtyUsed} onChange={e => setForm(f => ({ ...f, qtyUsed: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Meter / Odometer Reading</label>
                <input className={inputCls} placeholder="e.g. 12450 hrs / km (optional)"
                  value={form.meterReading} onChange={e => setForm(f => ({ ...f, meterReading: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className={labelCls}>Remarks</label>
                <input className={inputCls} placeholder="Any notes (optional)"
                  value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-[13px] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2 text-[13px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
                <Fuel className="w-4 h-4" />
                {submitting ? "Saving..." : "Log Consumption"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Fuel className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide">Total Consumed</div>
            <div className="text-[20px] font-black text-amber-700 dark:text-amber-300 leading-none">{totalLitres.toFixed(1)} <span className="text-[13px] font-semibold">L</span></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Total Entries</div>
            <div className="text-[20px] font-black text-gray-900 dark:text-white leading-none">{filtered.length}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Top Site</div>
            <div className="text-[13px] font-black text-gray-900 dark:text-white leading-tight truncate max-w-[100px]">{bySite[0]?.[0] || "—"}</div>
            {bySite[0] && <div className="text-[11px] text-green-600 font-semibold">{bySite[0][1].toFixed(1)} L</div>}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Top Equipment</div>
            <div className="text-[13px] font-black text-gray-900 dark:text-white leading-tight truncate max-w-[100px]">{byEquipment[0]?.[0] || "—"}</div>
            {byEquipment[0] && <div className="text-[11px] text-purple-600 font-semibold">{byEquipment[0][1].toFixed(1)} L</div>}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            placeholder="Search driver, equipment, site..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="space-y-0.5">
          <div className={labelCls}>Site</div>
          <select className="text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 [color-scheme:light] dark:[color-scheme:dark]"
            value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>
            {siteOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-0.5">
          <div className={labelCls}>From</div>
          <input type="date" className="text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 [color-scheme:light] dark:[color-scheme:dark]"
            value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-0.5">
          <div className={labelCls}>To</div>
          <input type="date" className="text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 [color-scheme:light] dark:[color-scheme:dark]"
            value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {(filterSite || startDate || endDate) && (
          <button onClick={() => { setFilterSite(""); setStartDate(""); setEndDate(""); }}
            className="flex items-center gap-1 px-3 py-2 text-[12px] text-gray-500 hover:text-red-500 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-300 transition-colors">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Site breakdown bar */}
      {bySite.length > 1 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Consumption by Site</div>
          <div className="space-y-2">
            {bySite.map(([site, qty]) => (
              <div key={site} className="flex items-center gap-3">
                <div className="text-[12px] text-gray-700 dark:text-gray-300 w-32 truncate shrink-0">{site}</div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="h-2 bg-amber-500 rounded-full transition-all"
                    style={{ width: `${(qty / totalLitres) * 100}%` }} />
                </div>
                <div className="text-[12px] font-bold text-amber-600 dark:text-amber-400 w-16 text-right shrink-0">{qty.toFixed(1)} L</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[13px] text-gray-400 flex flex-col items-center gap-2">
            <Fuel className="w-8 h-8 text-amber-400 animate-pulse" />
            Loading entries...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-gray-400 flex flex-col items-center gap-2">
            <Fuel className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            No fuel entries found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/90 dark:bg-gray-800/90 border-b border-gray-100 dark:border-gray-800">
                  {["ID", "Date", "Driver / Operator", "Equipment / Vehicle", "Site", "Qty (L)", "Meter Reading", "Remarks", "Submitted By", ...(isSuperAdmin ? [""] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-800/60 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-mono text-gray-400 whitespace-nowrap">{entry.id}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-[12px] font-semibold text-gray-900 dark:text-white whitespace-nowrap">{entry.driverName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-[12px] text-gray-600 dark:text-gray-300">{entry.equipment}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md whitespace-nowrap">
                        <MapPin className="w-2.5 h-2.5" />{entry.site}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[14px] font-black text-amber-600 dark:text-amber-400">{Number(entry.qtyUsed).toFixed(1)}</span>
                      <span className="text-[10px] text-gray-400 ml-1">L</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">
                      {entry.meterReading ? (
                        <div className="flex items-center gap-1"><Gauge className="w-3 h-3 text-gray-400" /> {entry.meterReading}</div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500 max-w-[160px]">
                      <span className="line-clamp-1">{entry.remarks || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">{entry.submittedBy || "—"}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(entry.id)} disabled={deleting === entry.id}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">{filtered.length} entries · {totalLitres.toFixed(1)} L total</span>
          </div>
        )}
      </div>
    </div>
  );
}
