import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "../store";
import { toast } from "react-hot-toast";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Package,
  Trash2,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  TruckIcon,
  Fuel,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

function getPipeline(mr, pos, grns) {
  const linked = pos.filter(
    (p) => p.mrId === mr.id || p.mrId === mr.mrNumber
  );
  const poIds = new Set(linked.map((p) => p.id));
  const linkedGrns = grns.filter((g) => poIds.has(g.poId));
  const hasPO = linked.length > 0;
  const hasConfirmedGRN = linkedGrns.some(
    (g) => g.status === "Confirmed" || g.status === "Over-Received"
  );
  const hasPartialGRN = linkedGrns.some((g) => g.status === "GRN Pending");
  return { hasPO, hasConfirmedGRN, hasPartialGRN, poNo: linked[0]?.id };
}

function MRStatusBadge({ mr, pos, grns }) {
  const { hasPO, hasConfirmedGRN, hasPartialGRN } = getPipeline(mr, pos, grns);
  let label, cls;
  if (hasConfirmedGRN) {
    label = "Delivered"; cls = "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
  } else if (hasPartialGRN) {
    label = "Partial GRN"; cls = "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
  } else if (hasPO) {
    label = "PO Created"; cls = "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
  } else {
    label = mr.status || "Pending";
    cls = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function PipelineDots({ mr, pos, grns }) {
  const { hasPO, hasConfirmedGRN, hasPartialGRN } = getPipeline(mr, pos, grns);
  const steps = [
    { label: "MR", done: true, active: !hasPO },
    { label: "PO", done: hasPO, active: hasPO && !hasConfirmedGRN },
    { label: "GRN", done: hasConfirmedGRN, active: hasPartialGRN },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2
                ${step.done ? "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                : step.active ? "border-primary bg-primary/10 text-primary"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400"}`}
            >
              {step.done ? "✓" : "○"}
            </div>
            <span className="text-[8px] text-gray-400 font-semibold">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-5 h-0.5 mb-3 ${step.done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── empty item template ───────────────────────────────────────────────────────
const EMPTY_ITEM = { itemName: "", unit: "Nos", qty: "", notes: "" };
const UNITS = ["Nos", "Bags", "Kg", "Mtr", "Ltr", "Sqft", "Truck", "Set", "Rft", "Cum"];

// ── main component ────────────────────────────────────────────────────────────
const EMPTY_FUEL = { date: new Date().toISOString().slice(0, 10), driverName: "", equipment: "", site: "", qtyUsed: "", meterReading: "", remarks: "" };

export function DRIPortal() {
  const {
    user,
    materialRequirements,
    pos,
    grns,
    mrAllocations,
    settings,
    addMaterialRequirement,
    fetchResource,
    actionLoading,
    api,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mrSearch, setMrSearch] = useState("");
  const [mrStatusFilter, setMrStatusFilter] = useState("");

  // MR form state
  const [mrForm, setMrForm] = useState({
    project: "",
    workType: "",
    description: "",
    items: [{ ...EMPTY_ITEM }],
  });
  const [submitting, setSubmitting] = useState(false);

  // Fuel Log state
  const [fuelEntries, setFuelEntries] = useState([]);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelForm, setFuelForm] = useState({ ...EMPTY_FUEL });
  const [fuelSubmitting, setFuelSubmitting] = useState(false);
  const [fuelStartDate, setFuelStartDate] = useState("");
  const [fuelEndDate, setFuelEndDate] = useState("");

  const isSuperAdmin = user?.role === "Super Admin" || user?.role === "superadmin" || user?.role === "admin";
  const myProjects = useMemo(() => user?.assignedProjects || [], [user]);

  // ── Fuel log helpers ─────────────────────────────────────────────────────
  const fetchFuelEntries = useCallback(async () => {
    setFuelLoading(true);
    try {
      const params = { limit: 200 };
      if (fuelStartDate) params.startDate = fuelStartDate;
      if (fuelEndDate) params.endDate = fuelEndDate;
      if (!isSuperAdmin && myProjects.length > 0) params.site = myProjects[0];
      const res = await api.get("diesel-consumption", params);
      if (res.success) setFuelEntries(res.data);
    } catch { /* silent */ }
    finally { setFuelLoading(false); }
  }, [api, isSuperAdmin, myProjects, fuelStartDate, fuelEndDate]);

  useEffect(() => {
    if (activeTab === "fuel-log") fetchFuelEntries();
  }, [activeTab, fetchFuelEntries]);

  async function handleFuelSubmit(e) {
    e.preventDefault();
    const { date, driverName, equipment, site, qtyUsed } = fuelForm;
    if (!date || !driverName || !equipment || !site || !qtyUsed) {
      toast.error("Fill all required fields"); return;
    }
    setFuelSubmitting(true);
    try {
      const res = await api.post("diesel-consumption", { ...fuelForm, qtyUsed: Number(fuelForm.qtyUsed) });
      if (!res.success) throw new Error(res.message);
      toast.success("Fuel entry logged");
      setFuelForm({ ...EMPTY_FUEL, driverName: user?.name || "", site: myProjects[0] || "" });
      fetchFuelEntries();
    } catch (err) {
      toast.error(err?.message || "Failed to save entry");
    } finally {
      setFuelSubmitting(false);
    }
  }

  async function handleFuelDelete(id) {
    if (!window.confirm("Delete this fuel entry?")) return;
    try {
      const res = await api.post(`diesel-consumption/${id}/delete`, {});
      // fallback: use putSimple workaround since api.delete may not exist
      void res;
    } catch { /* use fetch directly */ }
    // use authenticated fetch directly for DELETE
    try {
      const token = localStorage.getItem("token");
      const base = import.meta.env.VITE_API_BASE_URL || "/api";
      const r = await fetch(`${base}/diesel-consumption/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (data.success) { toast.success("Deleted"); fetchFuelEntries(); }
      else toast.error(data.message || "Failed to delete");
    } catch { toast.error("Delete failed"); }
  }

  const fuelTotal = useMemo(() => fuelEntries.reduce((s, e) => s + (Number(e.qtyUsed) || 0), 0), [fuelEntries]);

  // Initialize project in form when myProjects loads
  useEffect(() => {
    if (myProjects.length > 0 && !mrForm.project) {
      setMrForm((f) => ({ ...f, project: myProjects[0] }));
    }
    if (user?.name && !fuelForm.driverName) {
      setFuelForm((f) => ({ ...f, driverName: user.name, site: myProjects[0] || f.site }));
    }
  }, [myProjects, user]);

  // Fetch data on mount
  useEffect(() => {
    fetchResource("material-requirements", 1, 500, true);
    fetchResource("pos", 1, 500, true);
    fetchResource("grns", 1, 500, true);
    fetchResource("mr-allocations", 1, 1000, true);
  }, []);

  // Super Admin sees all data; DRI sees only their assigned projects
  const myMRs = useMemo(
    () => isSuperAdmin ? materialRequirements : materialRequirements.filter((mr) => myProjects.includes(mr.project)),
    [materialRequirements, myProjects, isSuperAdmin]
  );

  const myPOs = useMemo(
    () => isSuperAdmin ? pos : pos.filter((p) => myProjects.includes(p.project)),
    [pos, myProjects, isSuperAdmin]
  );

  const myPOIds = useMemo(() => new Set(myPOs.map((p) => p.id)), [myPOs]);

  const myGRNs = useMemo(
    () => isSuperAdmin ? grns : grns.filter((g) => myPOIds.has(g.poId)),
    [grns, myPOIds, isSuperAdmin]
  );

  const myAllocations = useMemo(
    () => isSuperAdmin ? mrAllocations : mrAllocations.filter((a) => myProjects.includes(a.projectName)),
    [mrAllocations, myProjects, isSuperAdmin]
  );

  // KPIs
  const kpis = useMemo(() => {
    const total = myMRs.length;
    const pending = myMRs.filter((mr) => {
      const { hasPO } = getPipeline(mr, pos, grns);
      return !hasPO;
    }).length;
    const poCreated = myMRs.filter((mr) => {
      const { hasPO, hasConfirmedGRN } = getPipeline(mr, pos, grns);
      return hasPO && !hasConfirmedGRN;
    }).length;
    const delivered = myMRs.filter((mr) => getPipeline(mr, pos, grns).hasConfirmedGRN).length;
    return { total, pending, poCreated, delivered };
  }, [myMRs, pos, grns]);

  // Filtered MRs for My MRs tab
  const filteredMRs = useMemo(() => {
    return myMRs.filter((mr) => {
      const { hasPO, hasConfirmedGRN, hasPartialGRN } = getPipeline(mr, pos, grns);
      const statusLabel = hasConfirmedGRN ? "Delivered" : hasPartialGRN ? "Partial GRN" : hasPO ? "PO Created" : (mr.status || "Pending");

      const term = mrSearch.trim().toLowerCase();
      const matchesSearch = !term ||
        (mr.id || "").toLowerCase().includes(term) ||
        (mr.mrNumber || "").toLowerCase().includes(term) ||
        (mr.project || "").toLowerCase().includes(term) ||
        (mr.requester || "").toLowerCase().includes(term) ||
        (mr.items || []).some((i) => (i.itemName || i.name || "").toLowerCase().includes(term));

      const matchesStatus = !mrStatusFilter || statusLabel === mrStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [myMRs, mrSearch, mrStatusFilter, pos, grns]);

  // ── MR form helpers ───────────────────────────────────────────────────────
  function updateItem(idx, field, val) {
    setMrForm((f) => {
      const items = f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
      return { ...f, items };
    });
  }

  function addItem() {
    setMrForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(idx) {
    setMrForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  async function handleSubmitMR(e) {
    e.preventDefault();
    if (!mrForm.project) { toast.error("Select a project"); return; }
    const validItems = mrForm.items.filter((it) => it.itemName.trim() && it.qty);
    if (validItems.length === 0) { toast.error("Add at least one item with name and quantity"); return; }

    setSubmitting(true);
    try {
      await addMaterialRequirement({
        project: mrForm.project,
        requester: user?.name || "DRI",
        workType: mrForm.workType,
        description: mrForm.description,
        items: validItems.map((it) => ({
          itemName: it.itemName.trim(),
          unit: it.unit,
          qty: Number(it.qty),
          notes: it.notes,
        })),
      });
      toast.success("MR submitted successfully");
      setMrForm({ project: myProjects[0] || "", workType: "", description: "", items: [{ ...EMPTY_ITEM }] });
      setActiveTab("my-mrs");
    } catch (err) {
      toast.error(err?.message || "Failed to submit MR");
    } finally {
      setSubmitting(false);
    }
  }

  // ── shared styles ─────────────────────────────────────────────────────────
  const tabBtn = (id, Icon, label) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
        activeTab === id
          ? "bg-primary/10 text-primary dark:bg-primary/20"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const inputCls = "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-100 placeholder-gray-400";
  const labelCls = "text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider";

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">DRI Portal</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            {isSuperAdmin
            ? "Viewing all projects (Super Admin)"
            : myProjects.length > 0
              ? `Projects: ${myProjects.join(", ")}`
              : <span className="italic text-amber-500">No projects assigned — contact SuperAdmin</span>
          }
          </p>
        </div>
        <button
          onClick={() => setActiveTab("raise-mr")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-bold hover:bg-primary/90 transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Raise MR
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100/60 dark:bg-gray-800/40 rounded-xl border border-gray-200/60 dark:border-gray-700/40">
        {tabBtn("dashboard", LayoutDashboard, "Dashboard")}
        {tabBtn("raise-mr", PlusCircle, "Raise MR")}
        {tabBtn("my-mrs", ClipboardList, "My MRs")}
        {tabBtn("allotment", Package, "Allotment")}
        {tabBtn("fuel-log", Fuel, "Fuel Log")}
      </div>

      {/* ── Dashboard ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total MRs", value: kpis.total, icon: ClipboardList, color: "text-primary", bg: "bg-primary/10" },
              { label: "Pending / Awaiting PO", value: kpis.pending, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
              { label: "PO Created", value: kpis.poCreated, icon: TruckIcon, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
              { label: "Delivered", value: kpis.delivered, icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white leading-none">{value}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent MRs */}
          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-gray-900 dark:text-white">Recent MRs</h3>
              <button onClick={() => setActiveTab("my-mrs")} className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-800/70">
                    {["MR No.", "Project", "Items", "Date", "Status", "Pipeline"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myMRs.slice(0, 5).length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-gray-400">No MRs raised yet</td></tr>
                  ) : myMRs.slice().reverse().slice(0, 5).map((mr) => {
                    const { poNo } = getPipeline(mr, pos, grns);
                    return (
                      <tr key={mr.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-3 text-[12px] font-bold text-gray-900 dark:text-white whitespace-nowrap">{mr.mrNumber || mr.id}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-300 whitespace-nowrap">{mr.project}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-300">{(mr.items || []).map((i) => i.itemName || i.name).filter(Boolean).slice(0, 2).join(", ")}{(mr.items || []).length > 2 ? ` +${mr.items.length - 2}` : ""}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{mr.date ? new Date(mr.date).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><MRStatusBadge mr={mr} pos={pos} grns={grns} /></td>
                        <td className="px-4 py-3"><PipelineDots mr={mr} pos={pos} grns={grns} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Allotments */}
          {myAllocations.length > 0 && (
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-gray-900 dark:text-white">Recent Allotments</h3>
                <button onClick={() => setActiveTab("allotment")} className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline">
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-gray-800/70">
                      {["Item", "Project", "Allotted Qty", "Date", "Status"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myAllocations.slice(0, 5).map((a) => (
                      <tr key={a.id} className="border-t border-gray-100 dark:border-gray-700/50">
                        <td className="px-4 py-3 text-[12px] font-semibold text-gray-900 dark:text-white">{a.itemName || a.name}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">{a.projectName}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-900 dark:text-white font-bold">{a.qty} {a.unit}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">{a.date ? new Date(a.date).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === "Fulfilled" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                            {a.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Raise MR ── */}
      {activeTab === "raise-mr" && (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">New Material Requirement</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Project will be auto-filled from your assigned sites</p>
          </div>
          <form onSubmit={handleSubmitMR}>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project */}
              <div className="space-y-1">
                <label className={labelCls}>Project / Site *</label>
                {myProjects.length === 1 ? (
                  <input className={inputCls} value={myProjects[0]} disabled />
                ) : (
                  <select className={inputCls + " [color-scheme:light] dark:[color-scheme:dark]"} value={mrForm.project} onChange={(e) => setMrForm((f) => ({ ...f, project: e.target.value }))} required>
                    <option value="">Select project...</option>
                    {myProjects.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
              </div>

              {/* Work Type */}
              <div className="space-y-1">
                <label className={labelCls}>Work Type</label>
                <select className={inputCls + " [color-scheme:light] dark:[color-scheme:dark]"} value={mrForm.workType} onChange={(e) => setMrForm((f) => ({ ...f, workType: e.target.value }))}>
                  <option value="">Select...</option>
                  {(settings?.workTypes || ["Civil", "Electrical", "Plumbing", "Finishing", "Mechanical", "Other"]).map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <label className={labelCls}>Requirement Description</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="Brief description of why these materials are needed..."
                  value={mrForm.description}
                  onChange={(e) => setMrForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Items table */}
              <div className="sm:col-span-2 space-y-2">
                <label className={labelCls}>Items *</label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60">
                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">Item Name *</th>
                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider w-28">Unit</th>
                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider w-24">Qty *</th>
                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">Notes</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {mrForm.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100 dark:border-gray-700/50">
                          <td className="px-2 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-[12px] min-w-[120px]"
                              placeholder="e.g. OPC Cement 50kg"
                              value={item.itemName}
                              onChange={(e) => updateItem(idx, "itemName", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              className="w-full bg-transparent text-[12px] text-gray-900 dark:text-gray-100 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                              value={item.unit}
                              onChange={(e) => updateItem(idx, "unit", e.target.value)}
                            >
                              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              className="w-full bg-transparent text-[12px] text-gray-900 dark:text-gray-100 outline-none"
                              placeholder="0"
                              value={item.qty}
                              onChange={(e) => updateItem(idx, "qty", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              className="w-full bg-transparent text-[12px] text-gray-500 dark:text-gray-400 outline-none"
                              placeholder="Optional"
                              value={item.notes}
                              onChange={(e) => updateItem(idx, "notes", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {mrForm.items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
                    <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/30 flex justify-end gap-3">
              <button type="button" onClick={() => setMrForm({ project: myProjects[0] || "", workType: "", description: "", items: [{ ...EMPTY_ITEM }] })} className="px-4 py-2 text-[13px] font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Clear
              </button>
              <button type="submit" disabled={submitting || actionLoading} className="px-5 py-2 text-[13px] font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {submitting ? "Submitting..." : "Submit MR"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── My MRs ── */}
      {activeTab === "my-mrs" && (
        <div className="space-y-4">
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className={inputCls + " sm:max-w-xs"}
              placeholder="Search MR No., item, project..."
              value={mrSearch}
              onChange={(e) => setMrSearch(e.target.value)}
            />
            <select
              className={inputCls + " sm:w-44 [color-scheme:light] dark:[color-scheme:dark]"}
              value={mrStatusFilter}
              onChange={(e) => setMrStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              {["Pending", "PO Created", "Partial GRN", "Delivered"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-800/70 border-b border-gray-100 dark:border-gray-700">
                    {["MR No.", "Date", "Project", "Items", "Work Type", "Status", "Pipeline", "PO No."].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMRs.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-[13px] text-gray-400">{mrSearch || mrStatusFilter ? "No MRs match the filter" : "No MRs raised yet — use Raise MR to get started"}</td></tr>
                  ) : filteredMRs.slice().reverse().map((mr) => {
                    const { poNo } = getPipeline(mr, pos, grns);
                    return (
                      <tr key={mr.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-3 text-[12px] font-bold text-gray-900 dark:text-white whitespace-nowrap">{mr.mrNumber || mr.id}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{mr.date ? new Date(mr.date).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-300 whitespace-nowrap">{mr.project}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-300 max-w-[180px]">
                          {(mr.items || []).map((i) => i.itemName || i.name).filter(Boolean).slice(0, 2).join(", ")}
                          {(mr.items || []).length > 2 && <span className="text-gray-400"> +{mr.items.length - 2} more</span>}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{mr.workType || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><MRStatusBadge mr={mr} pos={pos} grns={grns} /></td>
                        <td className="px-4 py-3"><PipelineDots mr={mr} pos={pos} grns={grns} /></td>
                        <td className="px-4 py-3 text-[11px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{poNo || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Fuel Log ── */}
      {activeTab === "fuel-log" && (
        <div className="space-y-4">
          {/* Entry form */}
          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-500" /> Log Diesel Consumption
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Record fuel used each time diesel is consumed</p>
            </div>
            <form onSubmit={handleFuelSubmit}>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={labelCls}>Date *</label>
                  <input type="date" className={inputCls + " [color-scheme:light] dark:[color-scheme:dark]"} value={fuelForm.date} onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Driver / Operator Name *</label>
                  <input className={inputCls} placeholder="Driver name" value={fuelForm.driverName} onChange={(e) => setFuelForm((f) => ({ ...f, driverName: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Equipment / Vehicle *</label>
                  <input className={inputCls} placeholder="e.g. JCB, DG Set, Truck HR-26-1234" value={fuelForm.equipment} onChange={(e) => setFuelForm((f) => ({ ...f, equipment: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Site / Project *</label>
                  {myProjects.length > 0 && !isSuperAdmin ? (
                    <select className={inputCls + " [color-scheme:light] dark:[color-scheme:dark]"} value={fuelForm.site} onChange={(e) => setFuelForm((f) => ({ ...f, site: e.target.value }))} required>
                      <option value="">Select site...</option>
                      {myProjects.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input className={inputCls} placeholder="Site / project name" value={fuelForm.site} onChange={(e) => setFuelForm((f) => ({ ...f, site: e.target.value }))} required />
                  )}
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Diesel Qty Used (Litres) *</label>
                  <input type="number" min="0.1" step="0.1" className={inputCls} placeholder="0.0" value={fuelForm.qtyUsed} onChange={(e) => setFuelForm((f) => ({ ...f, qtyUsed: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Meter / Odometer Reading</label>
                  <input className={inputCls} placeholder="e.g. 12450 hrs / km (optional)" value={fuelForm.meterReading} onChange={(e) => setFuelForm((f) => ({ ...f, meterReading: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className={labelCls}>Remarks</label>
                  <input className={inputCls} placeholder="Any notes (optional)" value={fuelForm.remarks} onChange={(e) => setFuelForm((f) => ({ ...f, remarks: e.target.value }))} />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/30 flex justify-end">
                <button type="submit" disabled={fuelSubmitting} className="px-5 py-2 text-[13px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
                  <Fuel className="w-4 h-4" />
                  {fuelSubmitting ? "Saving..." : "Log Consumption"}
                </button>
              </div>
            </form>
          </div>

          {/* Summary + filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex gap-3 flex-1">
              <div className="space-y-1">
                <label className={labelCls}>From</label>
                <input type="date" className={inputCls + " w-36 [color-scheme:light] dark:[color-scheme:dark]"} value={fuelStartDate} onChange={(e) => setFuelStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>To</label>
                <input type="date" className={inputCls + " w-36 [color-scheme:light] dark:[color-scheme:dark]"} value={fuelEndDate} onChange={(e) => setFuelEndDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button onClick={fetchFuelEntries} className="px-3 py-2 text-[12px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Filter</button>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-4 py-2.5 flex items-center gap-3 shrink-0">
              <Fuel className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide">Total Consumed</div>
                <div className="text-[18px] font-black text-amber-700 dark:text-amber-300 leading-none">{fuelTotal.toFixed(1)} L</div>
              </div>
            </div>
          </div>

          {/* Entries table */}
          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {fuelLoading ? (
              <div className="py-10 text-center text-[13px] text-gray-400">Loading...</div>
            ) : fuelEntries.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-gray-400">No fuel entries yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-gray-800/70 border-b border-gray-100 dark:border-gray-700">
                      {["ID", "Date", "Driver", "Equipment", "Site", "Qty (L)", "Meter Reading", "Remarks", "Submitted By", ...(isSuperAdmin ? [""] : [])].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fuelEntries.map((entry) => (
                      <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-3 text-[11px] font-mono text-gray-400">{entry.id}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-700 dark:text-gray-300 whitespace-nowrap">{entry.date ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-gray-900 dark:text-white whitespace-nowrap">{entry.driverName}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-300">{entry.equipment}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{entry.site}</td>
                        <td className="px-4 py-3 text-[13px] font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">{Number(entry.qtyUsed).toFixed(1)}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">{entry.meterReading || "—"}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 max-w-[140px] truncate">{entry.remarks || "—"}</td>
                        <td className="px-4 py-3 text-[11px] text-gray-400">{entry.submittedBy || "—"}</td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3">
                            <button onClick={() => handleFuelDelete(entry.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
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
          </div>
        </div>
      )}

      {/* ── Allotment ── */}
      {activeTab === "allotment" && (
        <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-[13px] font-bold text-gray-900 dark:text-white">Material Allotments — My Projects</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Materials allocated to your site(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-gray-800/70 border-b border-gray-100 dark:border-gray-700">
                  {["Item", "SKU", "Project", "MR No.", "Qty Allotted", "Date", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myAllocations.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-gray-400">No allotments found for your projects</td></tr>
                ) : myAllocations.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3 text-[12px] font-semibold text-gray-900 dark:text-white">{a.itemName || a.name}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-400 font-mono">{a.sku || "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">{a.projectName}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-primary">{a.mrNumber || a.mrId || "—"}</td>
                    <td className="px-4 py-3 text-[12px] font-bold text-gray-900 dark:text-white">{a.qty} {a.unit}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{a.date ? new Date(a.date).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === "Fulfilled" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                        {a.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
