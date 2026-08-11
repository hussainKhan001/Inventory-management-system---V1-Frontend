import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Skeleton } from "../components/ui";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { TableVirtuoso, Virtuoso } from "react-virtuoso";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import {
  Layers, AlertTriangle, FileText, ShoppingCart, Package,
  IndianRupee, RefreshCw, CheckCircle2, Clock, TrendingUp,
  LayoutGrid, List,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = ["MR", "Quotation", "PO", "GRN", "Bill Verify", "Paid"];

const STAGE_SHORT = {
  MR: "MR", Quotation: "Quote", PO: "PO",
  GRN: "GRN", "Bill Verify": "Bill", Paid: "Paid",
};

const STAGE_LABELS = {
  MR: "MR Submitted", Quotation: "Quotation Received", PO: "PO Created",
  GRN: "GRN Received", "Bill Verify": "Bill Verification", Paid: "Payment Done",
};

const OVERDUE_DAYS = { MR: 3, Quotation: 5, PO: 7, GRN: 2, "Bill Verify": 3 };

const STAGE_DOT_CLS = {
  MR: "bg-blue-500 text-white",
  Quotation: "bg-purple-500 text-white",
  PO: "bg-orange-500 text-white",
  GRN: "bg-teal-500 text-white",
  "Bill Verify": "bg-yellow-500 text-white",
  Paid: "bg-green-500 text-white",
};

const STAGE_TEXT_CLS = {
  MR: "text-blue-600 dark:text-blue-400",
  Quotation: "text-purple-600 dark:text-purple-400",
  PO: "text-orange-600 dark:text-orange-400",
  GRN: "text-teal-600 dark:text-teal-400",
  "Bill Verify": "text-yellow-600 dark:text-yellow-400",
  Paid: "text-green-600 dark:text-green-400",
};

const STAGE_BADGE_CLS = {
  MR: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40",
  Quotation: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40",
  PO: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-800/40",
  GRN: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800/40",
  "Bill Verify": "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-800/40",
  Paid: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800/40",
};

const BILLING_STATUSES = [
  "bill_verify", "bill_verified", "bill_approved",
  "payment_pending", "payment_initiated", "physical_check",
];

const BOTTLENECK_CARDS = [
  {
    stage: "MR",
    title: "Awaiting Quotation",
    desc: "MR submitted, no quotation received",
    icon: FileText,
    days: 3,
    color: "blue",
  },
  {
    stage: "Quotation",
    title: "PO Not Raised",
    desc: "Quotation done, PO not issued yet",
    icon: ShoppingCart,
    days: 5,
    color: "purple",
  },
  {
    stage: "PO",
    title: "GRN Pending",
    desc: "PO placed, goods not received yet",
    icon: Package,
    days: 7,
    color: "orange",
  },
  {
    stage: "Bill Verify",
    title: "Payment Pending",
    desc: "Bill verified, payment not processed",
    icon: IndianRupee,
    days: 3,
    color: "yellow",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysSince = (d) =>
  d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;

const getStageInfo = (mr, posByMrId, grnsByPoId, quotationsByMrId) => {
  const keys = [...new Set([mr.mrNumber, mr.id].filter(Boolean))];
  const mrPOs = keys.flatMap((k) => posByMrId.get(k) || []);
  const uniquePOs = [...new Map(mrPOs.map((p) => [p.id, p])).values()];

  if (uniquePOs.length > 0) {
    const isPaid = uniquePOs.some(
      (p) =>
        (p.accountStatus || "").toLowerCase() === "paid" ||
        (p.status || "").toLowerCase() === "po closed"
    );
    if (isPaid) {
      const pp = uniquePOs.find((p) => (p.accountStatus || "").toLowerCase() === "paid");
      return { stage: "Paid", stageDate: pp?.payment?.date || pp?.updatedAt, pos: uniquePOs };
    }

    const isBilling = uniquePOs.some((p) =>
      BILLING_STATUSES.includes((p.accountStatus || "").toLowerCase())
    );
    if (isBilling) {
      const bp = uniquePOs.find((p) =>
        BILLING_STATUSES.includes((p.accountStatus || "").toLowerCase())
      );
      return { stage: "Bill Verify", stageDate: bp?.updatedAt, pos: uniquePOs };
    }

    const grnPO = uniquePOs.find((p) => (grnsByPoId.get(p.id) || []).length > 0);
    if (grnPO) {
      const gs = [...(grnsByPoId.get(grnPO.id) || [])].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      return { stage: "GRN", stageDate: gs[0]?.createdAt, pos: uniquePOs };
    }

    const lp = [...uniquePOs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return { stage: "PO", stageDate: lp.createdAt, pos: uniquePOs };
  }

  const mrQuotes = keys.flatMap((k) => quotationsByMrId.get(k) || []);
  if (mrQuotes.length > 0) {
    const lq = [...mrQuotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return { stage: "Quotation", stageDate: lq.createdAt, pos: [] };
  }

  return { stage: "MR", stageDate: mr.createdAt, pos: [] };
};

const getStatusInfo = (stage, days, isOverdue) => {
  if (stage === "Paid")
    return { label: "Completed", cls: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20", icon: CheckCircle2 };
  if (isOverdue)
    return { label: "Overdue", cls: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20", icon: AlertTriangle };
  const threshold = OVERDUE_DAYS[stage] ?? 999;
  if (days / threshold > 0.65)
    return { label: "At Risk", cls: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20", icon: Clock };
  return { label: "On Track", cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20", icon: TrendingUp };
};

const getDaysColor = (days, stage, isOverdue) => {
  if (isOverdue) return "text-red-500 dark:text-red-400";
  if (stage === "Paid") return "text-green-600 dark:text-green-400";
  const pct = days / (OVERDUE_DAYS[stage] ?? 999);
  if (pct > 0.65) return "text-orange-500 dark:text-orange-400";
  return "text-gray-500 dark:text-gray-400";
};

// ─── Pipeline progress with labeled dots (used on both mobile + desktop) ──────

function PipelineProgress({ stageIdx, compact = false }) {
  return (
    <div className="flex items-end">
      {STAGES.map((s, i) => {
        const done = i < stageIdx;
        const cur = i === stageIdx;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "rounded-full flex items-center justify-center font-black shrink-0 select-none",
                  compact ? "w-[16px] h-[16px] text-[6px]" : "w-[20px] h-[20px] text-[7px]",
                  done
                    ? "bg-green-500 text-white"
                    : cur
                    ? STAGE_DOT_CLS[s]
                    : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              {!compact && (
                <span
                  className={cn(
                    "text-[8px] font-medium leading-none",
                    cur
                      ? cn(STAGE_TEXT_CLS[s], "font-bold")
                      : done
                      ? "text-green-500"
                      : "text-gray-300 dark:text-gray-600"
                  )}
                >
                  {STAGE_SHORT[s]}
                </span>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "h-px shrink-0 mb-2.5",
                  compact ? "w-2" : "w-3",
                  done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function MRCard({ row, grnsByPoId }) {
  const { mr, stage, pos: rowPos, days, isOverdue } = row;
  const po = rowPos?.[0];
  const poGRNs = po ? grnsByPoId.get(po.id) || [] : [];
  const stageIdx = STAGES.indexOf(stage);
  const status = getStatusInfo(stage, days, isOverdue);
  const StatusIcon = status.icon;
  const mrDate = mr.createdAt
    ? new Date(mr.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

  return (
    <div
      className={cn(
        "bg-white dark:bg-[#1E293B] rounded-xl border shadow-sm overflow-hidden",
        isOverdue
          ? "border-red-200 dark:border-red-800/40"
          : "border-gray-200/60 dark:border-gray-700/50"
      )}
    >
      {/* Colored top bar for overdue */}
      {isOverdue && <div className="h-1 bg-red-500 w-full" />}

      <div className="p-4">
        {/* Row 1: MR ID + Status badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-mono text-[13px] font-bold text-gray-900 dark:text-white leading-tight">
              {mr.mrNumber || mr.id || "—"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Submitted {mrDate}</p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold shrink-0",
              status.cls
            )}
          >
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </div>
        </div>

        {/* Row 2: Project + Requester */}
        <div className="mb-3.5">
          <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 truncate">
            {mr.project || mr.projectName || "—"}
          </p>
          <p className="text-[11px] text-gray-400 truncate">
            Requested by: {mr.requesterName || "—"}
          </p>
        </div>

        {/* Row 3: Pipeline progress (dots + labels) */}
        <div className="mb-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2.5">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Pipeline Progress
          </p>
          <PipelineProgress stageIdx={stageIdx} />
        </div>

        {/* Row 4: Current stage + Days in stage */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Current Stage</p>
            <span
              className={cn(
                "inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                STAGE_BADGE_CLS[stage]
              )}
            >
              {STAGE_LABELS[stage]}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">In This Stage</p>
            <p className={cn("text-[18px] font-black tabular-nums mt-0.5", getDaysColor(days, stage, isOverdue))}>
              {days}
              <span className="text-[11px] font-medium ml-0.5">days</span>
            </p>
          </div>
        </div>

        {/* Row 5: PO info */}
        <div className="pt-2.5 border-t border-gray-100 dark:border-gray-700/40">
          {po ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Purchase Order</p>
                <p className="font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {po.id}
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                  poGRNs.length > 0
                    ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                )}
              >
                {poGRNs.length > 0 ? `${poGRNs.length} GRN received` : "Awaiting GRN"}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 italic">No Purchase Order raised yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table cell ───────────────────────────────────────────────────────────────

const Td = ({ children, className }) => (
  <td
    className={cn(
      "px-4 py-3 text-[13px] text-[#374151] dark:text-gray-300",
      "border-b border-[#F1F5F9] dark:border-gray-800",
      className
    )}
  >
    {children}
  </td>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProcessCoordinatorPage() {
  const { api, settings } = useAppStore();
  const PROJECTS = useMemo(() => settings?.projects || [], [settings]);

  const [mrs, setMrs] = useState([]);
  const [pos, setPos] = useState([]);
  const [grns, setGrns] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewMode, setViewMode] = useState("cards");

  const hasFilters = !!(search || startDate || endDate || filterProject || filterStage);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
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

  useEffect(() => {
    load();
  }, [load]);

  // ── Lookup maps ────────────────────────────────────────────────────────────

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

  // ── Rows ───────────────────────────────────────────────────────────────────

  const pipelineRows = useMemo(
    () =>
      mrs.map((mr) => {
        const info = getStageInfo(mr, posByMrId, grnsByPoId, quotationsByMrId);
        const days = daysSince(info.stageDate);
        const isOverdue =
          info.stage !== "Paid" && days > (OVERDUE_DAYS[info.stage] ?? Infinity);
        return { mr, ...info, days, isOverdue };
      }),
    [mrs, posByMrId, grnsByPoId, quotationsByMrId]
  );

  const filteredRows = useMemo(() => {
    let rows = pipelineRows;
    if (startDate) rows = rows.filter((r) => new Date(r.mr.createdAt) >= new Date(startDate));
    if (endDate)
      rows = rows.filter(
        (r) => new Date(r.mr.createdAt) <= new Date(endDate + "T23:59:59")
      );
    if (filterProject)
      rows = rows.filter((r) => (r.mr.project || r.mr.projectName) === filterProject);
    if (filterStage) rows = rows.filter((r) => r.stage === filterStage);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.mr.mrNumber || "").toLowerCase().includes(q) ||
          (r.mr.id || "").toLowerCase().includes(q) ||
          (r.mr.requesterName || "").toLowerCase().includes(q) ||
          (r.mr.project || r.mr.projectName || "").toLowerCase().includes(q) ||
          (r.pos || []).some((p) => (p.id || "").toLowerCase().includes(q))
      );
    }
    return [...rows].sort((a, b) =>
      a.isOverdue !== b.isOverdue ? (b.isOverdue ? 1 : -1) : b.days - a.days
    );
  }, [pipelineRows, startDate, endDate, filterProject, filterStage, search]);

  // ── Summary counts ─────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const overdue = pipelineRows.filter((r) => r.isOverdue).length;
    const paid = pipelineRows.filter((r) => r.stage === "Paid").length;
    const atRisk = pipelineRows.filter((r) => {
      if (r.isOverdue || r.stage === "Paid") return false;
      const t = OVERDUE_DAYS[r.stage] ?? 999;
      return r.days / t > 0.65;
    }).length;
    return { total: pipelineRows.length, overdue, paid, atRisk };
  }, [pipelineRows]);

  const bottlenecks = useMemo(() => {
    const out = {};
    for (const r of pipelineRows) {
      if (r.isOverdue) out[r.stage] = (out[r.stage] || 0) + 1;
    }
    return out;
  }, [pipelineRows]);

  const projectOptions = useMemo(
    () => [
      { value: "", label: "All Projects" },
      ...PROJECTS.map((p) => ({ value: p, label: p })),
    ],
    [PROJECTS]
  );

  const stageOptions = useMemo(
    () => [
      { value: "", label: "All Stages" },
      ...STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
    ],
    []
  );

  const clearAll = useCallback(() => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setFilterProject("");
    setFilterStage("");
  }, []);

  // ── Skeleton ───────────────────────────────────────────────────────────────

  if (loading && mrs.length === 0) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-xl" />
            ))}
        </div>
        <Skeleton className="h-14 rounded-xl" />
        <div className="space-y-2">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-[56px] rounded-xl" />
            ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 p-4 sm:p-6">

      {/* ── Header ── */}
      <PageHeader
        title="Process Coordinator"
        sub="Track every MR from submission to final payment"
        actions={
          <button
            onClick={load}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium",
              "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
              "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors shadow-sm",
              loading && "opacity-60 pointer-events-none"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      />

      {/* ── Pipeline flow reference strip ── */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap px-1 pb-0.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
          Flow:
        </span>
        {STAGES.map((s, i) => (
          <React.Fragment key={s}>
            <span
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                STAGE_BADGE_CLS[s]
              )}
            >
              <span className="text-[9px] font-black opacity-60">{i + 1}</span>
              {STAGE_SHORT[s]}
            </span>
            {i < STAGES.length - 1 && (
              <span className="text-gray-300 dark:text-gray-600 text-[12px] shrink-0">→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Summary counts ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Total MRs", value: summary.total, cls: "text-gray-800 dark:text-white", sub: "in pipeline" },
          { label: "Overdue", value: summary.overdue, cls: "text-red-500", sub: "need attention" },
          { label: "At Risk", value: summary.atRisk, cls: "text-orange-500", sub: "approaching deadline" },
          { label: "Completed", value: summary.paid, cls: "text-green-600 dark:text-green-400", sub: "fully paid" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/50 rounded-xl px-4 py-3"
          >
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={cn("text-2xl font-black tabular-nums mt-0.5", s.cls)}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Bottleneck alert cards ── */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
          Bottleneck Alerts — click to filter
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {BOTTLENECK_CARDS.map(({ stage, title, desc, icon: Icon, days }) => {
            const count = bottlenecks[stage] || 0;
            const isActive = filterStage === stage;
            return (
              <button
                key={stage}
                onClick={() => setFilterStage(isActive ? "" : stage)}
                className={cn(
                  "text-left rounded-xl border p-3.5 flex gap-3 transition-all shadow-sm",
                  "bg-white dark:bg-gray-800/80",
                  isActive
                    ? "border-primary ring-2 ring-primary/20"
                    : count > 0
                    ? "border-red-200/70 dark:border-red-800/30 hover:border-red-300 dark:hover:border-red-700/50"
                    : "border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    count > 0
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-gray-100 dark:bg-gray-700/60"
                  )}
                >
                  <Icon
                    className={cn("w-4 h-4", count > 0 ? "text-red-500" : "text-gray-400")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-gray-800 dark:text-white leading-tight">
                    {title}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight truncate">
                    {desc} &gt;{days}d
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className={cn(
                        "text-[18px] font-black tabular-nums",
                        count > 0
                          ? "text-red-500"
                          : "text-gray-700 dark:text-gray-300"
                      )}
                    >
                      {count}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] text-red-400 font-medium">
                        {count === 1 ? "MR stuck" : "MRs stuck"}
                      </span>
                    )}
                    {count === 0 && (
                      <span className="text-[10px] text-gray-400 font-medium">all clear</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter row + View toggle ── */}
      <Card className="px-4 py-3.5">
        <FilterRow showClear={hasFilters} onClearAll={clearAll}>
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search by MR ID, PO number, requester name, project…"
            className="flex-1 min-w-[200px]"
          />
          <DateRangePicker
            value={{ start: startDate, end: endDate }}
            onChange={(v) => {
              setStartDate(v.start);
              setEndDate(v.end);
            }}
          />
          <SelectFilter
            value={filterProject}
            onChange={setFilterProject}
            options={projectOptions}
            placeholder="All Projects"
            searchable
          />
          <SelectFilter
            value={filterStage}
            onChange={setFilterStage}
            options={stageOptions}
            placeholder="All Stages"
          />
          {/* View toggle — desktop only */}
          <div className="hidden lg:flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("cards")}
              title="Card view"
              className={cn(
                "p-2 transition-colors",
                viewMode === "cards"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table view"
              className={cn(
                "p-2 transition-colors",
                viewMode === "table"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </FilterRow>
      </Card>

      {/* Refresh indicator */}
      {loading && mrs.length > 0 && (
        <div className="flex items-center gap-2 text-[12px] text-blue-500 dark:text-blue-400 px-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Refreshing data…
        </div>
      )}

      {/* Filter result count */}
      {hasFilters && filteredRows.length > 0 && (
        <p className="text-[12px] text-gray-400 px-1">
          Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredRows.length}</span> of{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-300">{pipelineRows.length}</span> MRs
        </p>
      )}

      {/* Empty state */}
      {!loading && filteredRows.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Layers className="w-10 h-10 mb-3 opacity-25" />
          <p className="text-[14px] font-medium text-gray-500 dark:text-gray-400">
            No MRs match the current filters
          </p>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="mt-3 text-[12px] text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
        </Card>
      )}

      {filteredRows.length > 0 && (
        <>
          {/* ── Mobile card list (< lg) ── */}
          <div className="lg:hidden">
            <Virtuoso
              style={{ height: "calc(100vh - 460px)", minHeight: "300px" }}
              data={filteredRows}
              itemContent={(_, row) => (
                <div className="pb-3">
                  <MRCard row={row} grnsByPoId={grnsByPoId} />
                </div>
              )}
            />
          </div>

          {/* ── Desktop card grid (≥ lg, card mode) ── */}
          {viewMode === "cards" && (
            <div className="hidden lg:block">
              <Virtuoso
                style={{ height: "calc(100vh - 460px)", minHeight: "360px" }}
                data={filteredRows}
                itemContent={(_, row) => (
                  <div className="pb-3">
                    <MRCard row={row} grnsByPoId={grnsByPoId} />
                  </div>
                )}
                components={{
                  List: React.forwardRef(({ style, children }, ref) => (
                    <div
                      ref={ref}
                      style={style}
                      className="grid grid-cols-2 xl:grid-cols-3 gap-3"
                    >
                      {children}
                    </div>
                  )),
                  Item: ({ children, ...props }) => (
                    <div {...props} className="min-w-0">
                      {children}
                    </div>
                  ),
                }}
              />
            </div>
          )}

          {/* ── Desktop table (≥ lg, table mode) ── */}
          <Card className={cn("p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900", viewMode === "table" ? "hidden lg:block" : "hidden")}>
            <TableVirtuoso
              style={{ height: "calc(100vh - 460px)", minHeight: "360px" }}
              data={filteredRows}
              fixedHeaderContent={() => (
                <tr className="bg-[#F9FAFB] dark:bg-gray-800/90 backdrop-blur-sm border-b border-[#E5E7EB] dark:border-gray-700">
                  {/* MR Details */}
                  <th className="px-4 py-3 text-left min-w-[140px]">
                    <span className="text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">
                      MR Details
                    </span>
                  </th>

                  {/* Project */}
                  <th className="px-4 py-3 text-left min-w-[160px]">
                    <span className="text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">
                      Project / Requester
                    </span>
                  </th>

                  {/* Pipeline — two-line header with stage key */}
                  <th className="px-4 py-3 text-left min-w-[220px]">
                    <span className="text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                      Pipeline Progress
                    </span>
                    <div className="flex items-center gap-0.5">
                      {STAGES.map((s, i) => (
                        <React.Fragment key={s}>
                          <span className={cn("text-[9px] font-bold", STAGE_TEXT_CLS[s])}>
                            {STAGE_SHORT[s]}
                          </span>
                          {i < STAGES.length - 1 && (
                            <span className="text-gray-300 dark:text-gray-600 text-[9px] mx-0.5">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </th>

                  {/* PO & GRN */}
                  <th className="px-4 py-3 text-left min-w-[130px]">
                    <span className="text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">
                      PO & GRN
                    </span>
                  </th>

                  {/* Stage */}
                  <th className="px-4 py-3 text-left">
                    <span className="text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">
                      Stage
                    </span>
                  </th>

                  {/* Days in Stage */}
                  <th className="px-4 py-3 text-left w-[90px]">
                    <span className="text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">
                      In Stage
                    </span>
                  </th>

                  {/* Status */}
                  <th className="px-4 py-3 text-left w-[110px]">
                    <span className="text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">
                      Status
                    </span>
                  </th>
                </tr>
              )}
              itemContent={(_, row) => {
                const { mr, stage, pos: rowPos, days, isOverdue } = row;
                const stageIdx = STAGES.indexOf(stage);
                const po = rowPos?.[0];
                const poGRNs = po ? grnsByPoId.get(po.id) || [] : [];
                const status = getStatusInfo(stage, days, isOverdue);
                const StatusIcon = status.icon;
                const mrDate = mr.createdAt
                  ? new Date(mr.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })
                  : "—";

                return (
                  <>
                    {/* MR Details */}
                    <Td>
                      <p className="font-mono text-[12px] font-bold text-gray-900 dark:text-white">
                        {mr.mrNumber || mr.id || "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{mrDate}</p>
                    </Td>

                    {/* Project / Requester */}
                    <Td>
                      <p className="text-[12px] font-semibold text-gray-900 dark:text-white truncate max-w-[155px]">
                        {mr.project || mr.projectName || "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[155px]">
                        {mr.requesterName || "—"}
                      </p>
                    </Td>

                    {/* Pipeline progress with labeled dots */}
                    <Td>
                      <PipelineProgress stageIdx={stageIdx} />
                    </Td>

                    {/* PO & GRN */}
                    <Td>
                      {po ? (
                        <>
                          <p className="font-mono text-[11px] text-gray-800 dark:text-gray-200">
                            {po.id}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] mt-0.5 font-medium",
                              poGRNs.length > 0
                                ? "text-teal-600 dark:text-teal-400"
                                : "text-gray-400"
                            )}
                          >
                            {poGRNs.length > 0
                              ? `${poGRNs.length} GRN received`
                              : "Awaiting GRN"}
                          </p>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">No PO raised</span>
                      )}
                    </Td>

                    {/* Stage badge */}
                    <Td>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap",
                          STAGE_BADGE_CLS[stage]
                        )}
                      >
                        {STAGE_LABELS[stage]}
                      </span>
                    </Td>

                    {/* Days in stage — color coded */}
                    <Td>
                      <span
                        className={cn(
                          "text-[14px] font-black tabular-nums",
                          getDaysColor(days, stage, isOverdue)
                        )}
                      >
                        {days}
                        <span className="text-[10px] font-medium ml-0.5">d</span>
                      </span>
                      {stage !== "Paid" && (
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          of {OVERDUE_DAYS[stage] ?? "—"}d limit
                        </p>
                      )}
                    </Td>

                    {/* Status — On Track / At Risk / Overdue / Completed */}
                    <Td>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold",
                          status.cls
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </Td>
                  </>
                );
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
