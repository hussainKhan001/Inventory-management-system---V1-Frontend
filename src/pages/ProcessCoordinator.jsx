import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Skeleton } from "../components/ui";
import { SearchFilter, DateRangePicker, SelectFilter } from "../components/ui/Filters";
import { TableVirtuoso } from "react-virtuoso";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import {
  Layers, AlertTriangle, FileText, ShoppingCart, Package,
  IndianRupee, RefreshCw, CheckCircle2,
} from "lucide-react";

// ─── Stage Configuration ─────────────────────────────────────────────────────

const STAGES = ["MR", "Quotation", "PO", "GRN", "Bill Verify", "Paid"];

const STAGE_LABELS = {
  MR: "MR Submitted",
  Quotation: "Quotation",
  PO: "PO Created",
  GRN: "GRN Received",
  "Bill Verify": "Bill Verify",
  Paid: "Paid",
};

// Days before a stage is considered overdue
const OVERDUE_DAYS = { MR: 3, Quotation: 5, PO: 7, GRN: 2, "Bill Verify": 3 };

const STAGE_DOT_CLS = {
  MR: "bg-blue-500",
  Quotation: "bg-purple-500",
  PO: "bg-orange-500",
  GRN: "bg-teal-500",
  "Bill Verify": "bg-yellow-500",
  Paid: "bg-green-500",
};

const STAGE_BADGE_CLS = {
  MR: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  Quotation: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  PO: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  GRN: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  "Bill Verify": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  Paid: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
};

const BILLING_STATUSES = [
  "bill_verify", "bill_verified", "bill_approved",
  "payment_pending", "payment_initiated", "physical_check",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const daysSince = (d) =>
  d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;

// Determine which pipeline stage an MR is currently at
const getStageInfo = (mr, posByMrId, grnsByPoId, quotationsByMrId) => {
  // POs may reference the MR by mrNumber OR by id
  const keys = [...new Set([mr.mrNumber, mr.id].filter(Boolean))];
  const mrPOs = keys.flatMap(k => posByMrId.get(k) || []);
  const uniquePOs = [...new Map(mrPOs.map(p => [p.id, p])).values()];

  if (uniquePOs.length > 0) {
    const isPaid = uniquePOs.some(
      p => (p.accountStatus || "").toLowerCase() === "paid" ||
           (p.status || "").toLowerCase() === "po closed"
    );
    if (isPaid) {
      const pp = uniquePOs.find(p => (p.accountStatus || "").toLowerCase() === "paid");
      return { stage: "Paid", stageDate: pp?.payment?.date || pp?.updatedAt, pos: uniquePOs };
    }

    const isBilling = uniquePOs.some(p =>
      BILLING_STATUSES.includes((p.accountStatus || "").toLowerCase())
    );
    if (isBilling) {
      const bp = uniquePOs.find(p =>
        BILLING_STATUSES.includes((p.accountStatus || "").toLowerCase())
      );
      return { stage: "Bill Verify", stageDate: bp?.updatedAt, pos: uniquePOs };
    }

    const grnPO = uniquePOs.find(p => (grnsByPoId.get(p.id) || []).length > 0);
    if (grnPO) {
      const gs = [...(grnsByPoId.get(grnPO.id) || [])].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      return { stage: "GRN", stageDate: gs[0]?.createdAt, pos: uniquePOs };
    }

    const lp = [...uniquePOs].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    return { stage: "PO", stageDate: lp.createdAt, pos: uniquePOs };
  }

  // Check for quotations
  const mrQuotes = keys.flatMap(k => quotationsByMrId.get(k) || []);
  if (mrQuotes.length > 0) {
    const lq = [...mrQuotes].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    return { stage: "Quotation", stageDate: lq.createdAt, pos: [] };
  }

  return { stage: "MR", stageDate: mr.createdAt, pos: [] };
};

// ─── Page Component ───────────────────────────────────────────────────────────

const BOTTLENECK_CARDS = [
  { stage: "MR",         label: "No Quotation",    icon: FileText    },
  { stage: "Quotation",  label: "No PO",            icon: ShoppingCart },
  { stage: "PO",         label: "No GRN",           icon: Package      },
  { stage: "Bill Verify",label: "Pending Payment",  icon: IndianRupee  },
];

const Td = ({ children, className }) => (
  <td className={cn(
    "px-3 py-2.5 text-[13px] text-gray-700 dark:text-gray-300",
    "border-b border-[#F1F5F9] dark:border-gray-800/60",
    className
  )}>
    {children}
  </td>
);

export function ProcessCoordinatorPage() {
  const { api, settings } = useAppStore();
  const PROJECTS = useMemo(() => settings?.projects || [], [settings]);

  const [mrs, setMrs] = useState([]);
  const [pos, setPos] = useState([]);
  const [grns, setGrns] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ── Data fetch ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch MRs, POs, and Quotations in parallel
      const [mrRes, posRes, quotesRes] = await Promise.all([
        api.get("material-requirements", { limit: 300 }),
        api.get("pos", { limit: 1000 }),
        api.get("quotations", { limit: 300 }),
      ]);

      const mrList = mrRes?.data || [];
      const poList = posRes?.data || [];
      const quoteList = quotesRes?.data || [];

      setMrs(mrList);
      setPos(poList);
      setQuotations(quoteList);

      // GRNs depend on having PO IDs
      if (poList.length > 0) {
        const grnRes = await api.get("grn", { limit: 3000, slim: "1" });
        setGrns(grnRes?.data || []);
      } else {
        setGrns([]);
      }
    } catch {
      toast.error("Failed to load pipeline data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Lookup maps ─────────────────────────────────────────────────────────────

  const posByMrId = useMemo(() => {
    const map = new Map();
    for (const p of pos) {
      if (!p.mrId) continue;
      if (!map.has(p.mrId)) map.set(p.mrId, []);
      map.get(p.mrId).push(p);
    }
    return map;
  }, [pos]);

  const grnsByPoId = useMemo(() => {
    const map = new Map();
    for (const g of grns) {
      if (!g.poId) continue;
      if (!map.has(g.poId)) map.set(g.poId, []);
      map.get(g.poId).push(g);
    }
    return map;
  }, [grns]);

  const quotationsByMrId = useMemo(() => {
    const map = new Map();
    for (const q of quotations) {
      if (!q.mrId) continue;
      if (!map.has(q.mrId)) map.set(q.mrId, []);
      map.get(q.mrId).push(q);
    }
    return map;
  }, [quotations]);

  // ── Pipeline rows ───────────────────────────────────────────────────────────

  const pipelineRows = useMemo(() => {
    return mrs.map(mr => {
      const info = getStageInfo(mr, posByMrId, grnsByPoId, quotationsByMrId);
      const days = daysSince(info.stageDate);
      const isOverdue = info.stage !== "Paid" && days > (OVERDUE_DAYS[info.stage] ?? Infinity);
      return { mr, ...info, days, isOverdue };
    });
  }, [mrs, posByMrId, grnsByPoId, quotationsByMrId]);

  // ── Client-side filtering ───────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    let rows = pipelineRows;

    if (startDate)
      rows = rows.filter(r => new Date(r.mr.createdAt) >= new Date(startDate));
    if (endDate)
      rows = rows.filter(r => new Date(r.mr.createdAt) <= new Date(endDate + "T23:59:59"));
    if (filterProject)
      rows = rows.filter(r => (r.mr.project || r.mr.projectName) === filterProject);
    if (filterStage)
      rows = rows.filter(r => r.stage === filterStage);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.mr.mrNumber || "").toLowerCase().includes(q) ||
        (r.mr.id || "").toLowerCase().includes(q) ||
        (r.mr.requesterName || "").toLowerCase().includes(q) ||
        (r.mr.project || r.mr.projectName || "").toLowerCase().includes(q) ||
        (r.pos || []).some(p => (p.id || "").toLowerCase().includes(q))
      );
    }

    // Overdue items first, then by days descending
    return [...rows].sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return b.isOverdue ? 1 : -1;
      return b.days - a.days;
    });
  }, [pipelineRows, startDate, endDate, filterProject, filterStage, search]);

  // ── Bottleneck counts ───────────────────────────────────────────────────────

  const bottlenecks = useMemo(() => {
    const out = {};
    for (const r of pipelineRows) {
      if (r.isOverdue) out[r.stage] = (out[r.stage] || 0) + 1;
    }
    return out;
  }, [pipelineRows]);

  // ── Dropdown options ────────────────────────────────────────────────────────

  const projectOptions = useMemo(() => [
    { value: "", label: "All Projects" },
    ...PROJECTS.map(p => ({ value: p, label: p })),
  ], [PROJECTS]);

  const stageOptions = useMemo(() => [
    { value: "", label: "All Stages" },
    ...STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] })),
  ], []);

  // ── Initial skeleton ────────────────────────────────────────────────────────

  if (loading && mrs.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* Header */}
      <PageHeader
        title="Process Coordinator"
        sub={`Pipeline overview • ${filteredRows.length} active MR${filteredRows.length !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={load}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium",
              "border border-[#E8ECF0] dark:border-gray-700 bg-white dark:bg-gray-800",
              "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors",
              loading && "opacity-60 pointer-events-none"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        }
      />

      {/* Bottleneck cards — click to filter by stage */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {BOTTLENECK_CARDS.map(({ stage, label, icon: Icon }) => {
          const count = bottlenecks[stage] || 0;
          const isActive = filterStage === stage;
          return (
            <button
              key={stage}
              onClick={() => setFilterStage(isActive ? "" : stage)}
              className={cn(
                "text-left bg-white dark:bg-gray-800/80 rounded-xl border shadow-sm",
                "px-4 py-3 flex items-center gap-3 transition-all",
                isActive
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                count > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-700/50"
              )}>
                <Icon className={cn("w-4 h-4", count > 0 ? "text-red-500" : "text-gray-400")} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  {label} (&gt;{OVERDUE_DAYS[stage]}d)
                </p>
                <p className={cn(
                  "text-2xl font-black leading-tight mt-0.5",
                  count > 0 ? "text-red-500" : "text-gray-900 dark:text-white"
                )}>
                  {count}
                </p>
              </div>
              {count > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="px-4 py-3">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search MR, PO, requester…"
            className="flex-1 min-w-[200px]"
          />
          <DateRangePicker
            value={{ start: startDate, end: endDate }}
            onChange={v => { setStartDate(v.start); setEndDate(v.end); }}
          />
          <SelectFilter
            value={filterProject}
            onChange={setFilterProject}
            options={projectOptions}
          />
          <SelectFilter
            value={filterStage}
            onChange={setFilterStage}
            options={stageOptions}
          />
        </div>
      </Card>

      {/* Pipeline table */}
      <Card className="overflow-hidden">
        {loading && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-blue-100 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/20 text-[12px] text-blue-600 dark:text-blue-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Refreshing data…
          </div>
        )}

        {!loading && filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Layers className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-[14px] font-medium">No MRs match the current filters</p>
          </div>
        ) : (
          <TableVirtuoso
            style={{ height: "calc(100vh - 430px)", minHeight: "380px" }}
            data={filteredRows}
            fixedHeaderContent={() => (
              <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md">
                {["MR Details", "Project / Requester", "Pipeline Progress", "PO & GRN", "Stage", "Days", ""].map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap text-left border-b border-[#E8ECF0] dark:border-gray-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            )}
            itemContent={(_, row) => {
              const { mr, stage, pos: rowPos, days, isOverdue } = row;
              const stageIdx = STAGES.indexOf(stage);
              const po = rowPos?.[0];
              const poGRNs = po ? (grnsByPoId.get(po.id) || []) : [];
              const mrDate = mr.createdAt
                ? new Date(mr.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
                : "—";

              return (
                <>
                  {/* MR Details */}
                  <Td className="min-w-[130px]">
                    <div className="font-mono text-[12px] font-bold text-gray-900 dark:text-white">
                      {mr.mrNumber || mr.id || "—"}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{mrDate}</div>
                  </Td>

                  {/* Project / Requester */}
                  <Td className="min-w-[150px]">
                    <div className="text-[12px] font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">
                      {mr.project || mr.projectName || "—"}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate max-w-[150px]">
                      {mr.requesterName || "—"}
                    </div>
                  </Td>

                  {/* Pipeline progress dots */}
                  <Td className="min-w-[210px]">
                    <div className="flex items-center">
                      {STAGES.map((s, i) => {
                        const done = i < stageIdx;
                        const cur = i === stageIdx;
                        return (
                          <React.Fragment key={s}>
                            <div
                              title={STAGE_LABELS[s]}
                              className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 select-none",
                                done
                                  ? "bg-green-500 text-white"
                                  : cur
                                  ? (STAGE_DOT_CLS[s] || "bg-gray-500") + " text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                              )}
                            >
                              {done ? "✓" : i + 1}
                            </div>
                            {i < STAGES.length - 1 && (
                              <div className={cn(
                                "h-px w-3 shrink-0",
                                done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                              )} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 font-medium">
                      {STAGE_LABELS[stage]}
                    </div>
                  </Td>

                  {/* PO & GRN summary */}
                  <Td className="min-w-[120px]">
                    {po ? (
                      <>
                        <span className="font-mono text-[11px] text-gray-800 dark:text-gray-200">
                          {po.id}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {poGRNs.length > 0
                            ? `${poGRNs.length} GRN received`
                            : "Awaiting GRN"}
                        </div>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">No PO yet</span>
                    )}
                  </Td>

                  {/* Stage badge */}
                  <Td>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap",
                      STAGE_BADGE_CLS[stage] || "bg-gray-100 text-gray-600"
                    )}>
                      {STAGE_LABELS[stage]}
                    </span>
                  </Td>

                  {/* Days in stage */}
                  <Td>
                    <span className={cn(
                      "text-[13px] font-bold tabular-nums",
                      isOverdue
                        ? "text-red-500"
                        : days > 2
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400"
                    )}>
                      {days}d
                    </span>
                  </Td>

                  {/* Alert / done indicator */}
                  <Td className="w-[80px]">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500">
                        <AlertTriangle className="w-3 h-3" />
                        Overdue
                      </span>
                    ) : stage === "Paid" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : null}
                  </Td>
                </>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}
