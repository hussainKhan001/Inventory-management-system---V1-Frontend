import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Skeleton } from "../components/ui";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { TableVirtuoso, Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import {
  Layers, AlertTriangle, FileText, ShoppingCart, Package,
  IndianRupee, RefreshCw, CheckCircle2, Clock, TrendingUp,
  LayoutGrid, List, Building2, User, Calendar, Check, ArrowRight,
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

// Exact hex for inline styles (left strip + dot glow — Tailwind can't do dynamic colors)
const STAGE_HEX = {
  MR: "#3B82F6", Quotation: "#8B5CF6", PO: "#F97316",
  GRN: "#14B8A6", "Bill Verify": "#EAB308", Paid: "#22C55E",
};

const STAGE_DOT_CLS = {
  MR: "bg-blue-500 text-white",
  Quotation: "bg-violet-500 text-white",
  PO: "bg-orange-500 text-white",
  GRN: "bg-teal-500 text-white",
  "Bill Verify": "bg-amber-500 text-white",
  Paid: "bg-green-500 text-white",
};

const STAGE_TEXT_CLS = {
  MR: "text-blue-600 dark:text-blue-400",
  Quotation: "text-violet-600 dark:text-violet-400",
  PO: "text-orange-600 dark:text-orange-400",
  GRN: "text-teal-600 dark:text-teal-400",
  "Bill Verify": "text-amber-600 dark:text-amber-400",
  Paid: "text-green-600 dark:text-green-400",
};

const STAGE_BADGE_CLS = {
  MR:           "bg-blue-50   dark:bg-blue-900/25   text-blue-700   dark:text-blue-300   ring-1 ring-blue-200   dark:ring-blue-800/50",
  Quotation:    "bg-violet-50 dark:bg-violet-900/25 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-800/50",
  PO:           "bg-orange-50 dark:bg-orange-900/25 text-orange-700 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-800/50",
  GRN:          "bg-teal-50   dark:bg-teal-900/25   text-teal-700   dark:text-teal-300   ring-1 ring-teal-200   dark:ring-teal-800/50",
  "Bill Verify":"bg-amber-50  dark:bg-amber-900/25  text-amber-700  dark:text-amber-300  ring-1 ring-amber-200  dark:ring-amber-800/50",
  Paid:         "bg-green-50  dark:bg-green-900/25  text-green-700  dark:text-green-300  ring-1 ring-green-200  dark:ring-green-800/50",
};

const BILLING_STATUSES = [
  "bill_verify","bill_verified","bill_approved",
  "payment_pending","payment_initiated","physical_check",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysSince = (d) =>
  d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;

const getStageInfo = (mr, posByMrId, grnsByPoId, quotationsByMrId) => {
  const keys = [...new Set([mr.mrNumber, mr.id].filter(Boolean))];
  const mrPOs = keys.flatMap(k => posByMrId.get(k) || []);
  const uniquePOs = [...new Map(mrPOs.map(p => [p.id, p])).values()];

  if (uniquePOs.length > 0) {
    const isPaid = uniquePOs.some(p =>
      (p.accountStatus||"").toLowerCase()==="paid" || (p.status||"").toLowerCase()==="po closed"
    );
    if (isPaid) {
      const pp = uniquePOs.find(p => (p.accountStatus||"").toLowerCase()==="paid");
      return { stage:"Paid", stageDate: pp?.payment?.date || pp?.updatedAt, pos:uniquePOs };
    }
    const isBilling = uniquePOs.some(p => BILLING_STATUSES.includes((p.accountStatus||"").toLowerCase()));
    if (isBilling) {
      const bp = uniquePOs.find(p => BILLING_STATUSES.includes((p.accountStatus||"").toLowerCase()));
      return { stage:"Bill Verify", stageDate:bp?.updatedAt, pos:uniquePOs };
    }
    const grnPO = uniquePOs.find(p => (grnsByPoId.get(p.id)||[]).length > 0);
    if (grnPO) {
      const gs = [...(grnsByPoId.get(grnPO.id)||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      return { stage:"GRN", stageDate:gs[0]?.createdAt, pos:uniquePOs };
    }
    const lp = [...uniquePOs].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
    return { stage:"PO", stageDate:lp.createdAt, pos:uniquePOs };
  }

  const mrQuotes = keys.flatMap(k => quotationsByMrId.get(k)||[]);
  if (mrQuotes.length > 0) {
    const lq = [...mrQuotes].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
    return { stage:"Quotation", stageDate:lq.createdAt, pos:[] };
  }
  return { stage:"MR", stageDate:mr.createdAt, pos:[] };
};

const getStatusInfo = (stage, days, isOverdue) => {
  if (stage==="Paid")  return { label:"Completed", dot:"bg-green-500",  text:"text-green-600 dark:text-green-400",  icon:CheckCircle2 };
  if (isOverdue)       return { label:"Overdue",   dot:"bg-red-500",    text:"text-red-600 dark:text-red-400",      icon:AlertTriangle };
  const pct = days / (OVERDUE_DAYS[stage]??999);
  if (pct>0.6)         return { label:"At Risk",   dot:"bg-orange-500", text:"text-orange-600 dark:text-orange-400",icon:Clock };
  return                        { label:"On Track", dot:"bg-emerald-500",text:"text-emerald-600 dark:text-emerald-400",icon:TrendingUp };
};

const getDaysFill = (days, stage, isOverdue) => {
  if (stage==="Paid") return { pct:100, cls:"bg-green-500" };
  const limit = OVERDUE_DAYS[stage]??7;
  const pct = Math.min(100, Math.round((days/limit)*100));
  const cls = isOverdue ? "bg-red-500" : pct>60 ? "bg-orange-400" : "bg-emerald-500";
  return { pct, cls };
};

// ─── Pipeline Stepper (Executive Dark & Light compatible) ─────────────────────

function PipelineStepper({ stageIdx, hex }) {
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between relative z-10 px-1">
        {/* Progress track background line */}
        <div className="absolute left-4 right-4 top-3 h-0.5 bg-gray-200 dark:bg-gray-700/80 -z-10" />

        {STAGES.map((s, i) => {
          const done = i < stageIdx;
          const cur  = i === stageIdx;
          return (
            <div key={s} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all duration-300",
                  done
                    ? "bg-emerald-500 text-white shadow-xs"
                    : cur
                    ? cn("text-white shadow-md ring-4 ring-opacity-40", STAGE_DOT_CLS[s])
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700"
                )}
                style={cur ? { boxShadow: `0 0 0 4px ${hex}35`, backgroundColor: hex } : undefined}
              >
                {done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : i + 1}
              </div>
              <span className={cn(
                "text-[9px] font-bold tracking-tight uppercase",
                cur  ? cn(STAGE_TEXT_CLS[s], "font-black scale-105")
                     : done ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-400 dark:text-gray-500"
              )}>
                {STAGE_SHORT[s]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const getPOStatusBadge = (po, grnsByPoId) => {
  const grns = grnsByPoId.get(po.id) || [];
  const status = (po.status || "").toLowerCase();
  const acctStatus = (po.accountStatus || "").toLowerCase();

  if (acctStatus === "paid") return { label: "Paid", cls: "text-emerald-600 dark:text-emerald-400" };
  if (["bill_verify", "bill_verified", "payment_pending"].includes(acctStatus)) return { label: "Bill Verify", cls: "text-amber-600 dark:text-amber-400" };
  if (grns.length > 0) return { label: `${grns.length} GRN`, cls: "text-teal-600 dark:text-teal-400" };
  if (po.approvalL1 === "Pending") return { label: "Pending L1", cls: "text-amber-600 dark:text-amber-400" };
  if (po.approvalL2 === "Pending") return { label: "Pending L2", cls: "text-amber-600 dark:text-amber-400" };
  if (po.approvalL3 === "Pending") return { label: "Pending L3", cls: "text-amber-600 dark:text-amber-400" };
  if (status === "approved" || po.approvalL3 === "Approved") return { label: "PO Approved", cls: "text-blue-600 dark:text-blue-400" };
  return { label: po.status || "Issued", cls: "text-indigo-600 dark:text-indigo-400" };
};

// ─── Executive Classy 3-Column Grid MR Card ───────────────────────────────────

function MRCard({ row, grnsByPoId, quotations = [] }) {
  const { mr, stage, pos: rowPos, days, isOverdue } = row;
  const stageIdx = STAGES.indexOf(stage);
  const hex     = STAGE_HEX[stage];
  const status  = getStatusInfo(stage, days, isOverdue);
  const fill    = getDaysFill(days, stage, isOverdue);
  const StatusIcon = status.icon;
  const limit   = OVERDUE_DAYS[stage];

  const mrDate = mr.createdAt
    ? new Date(mr.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
    : "—";

  return (
    <div className={cn(
      "group relative flex flex-col justify-between rounded-2xl transition-all duration-300 h-full overflow-hidden",
      "bg-white dark:bg-[#151D2A] text-slate-800 dark:text-slate-100",
      "border border-slate-200/90 dark:border-slate-800/80",
      "shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700",
      isOverdue && "border-red-300/80 dark:border-red-900/50 shadow-red-500/5"
    )}>
      {/* Top stage accent bar */}
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: hex }} />

      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3.5">
        
        {/* Header: MR Number, Date, Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
              {mr.mrNumber || mr.id || "—"}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate">
              <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span>{mrDate}</span>
            </div>
          </div>

          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 shadow-2xs transition-all",
            status.label==="Overdue"   && "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/30",
            status.label==="At Risk"   && "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30",
            status.label==="On Track"  && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30",
            status.label==="Completed" && "bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/30",
          )}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{status.label}</span>
          </div>
        </div>

        {/* Project & Requester Container */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0F172A]/70 border border-slate-100 dark:border-slate-800/80">
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Project
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">{mr.project || mr.projectName || "N/A"}</span>
            </div>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Requester
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              <User className="w-3.5 h-3.5 text-violet-500 shrink-0" />
              <span className="truncate">{mr.requesterName || mr.createdBy || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Stepper Visual */}
        <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0F172A]/40 border border-slate-100/80 dark:border-slate-800/60">
          <PipelineStepper stageIdx={stageIdx} hex={hex} />
        </div>

        {/* Current Stage & Time Metrics Block */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0F172A]/70 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Current Stage
            </span>
            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold shadow-2xs", STAGE_BADGE_CLS[stage])}>
              {STAGE_LABELS[stage]}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              In Stage
            </span>
            <div className="flex items-baseline justify-end gap-1">
              <span className={cn("text-xl font-black tabular-nums leading-none", status.text)}>
                {days}d
              </span>
              {limit && (
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400">
                  / {limit}d limit
                </span>
              )}
            </div>
            {limit && (
              <div className="mt-1.5 w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden ml-auto">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", fill.cls)}
                  style={{ width: `${fill.pct}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Linked POs Strip */}
        <div className="p-2.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/70 dark:border-blue-900/30 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
            Linked POs:
          </span>
          {rowPos.length === 0 ? (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">No POs created yet</span>
          ) : (
            rowPos.map((po) => {
              const poBadge = getPOStatusBadge(po, grnsByPoId);
              return (
                <span
                  key={po.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono text-[11px]"
                >
                  <span className="font-bold text-blue-600 dark:text-blue-400">{po.id}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className={cn("font-sans font-semibold text-[10px]", poBadge.cls)}>
                    {poBadge.label}
                  </span>
                </span>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Table Cell ───────────────────────────────────────────────────────────────

const Td = ({children, className}) => (
  <td className={cn(
    "px-4 py-3 text-[13px] text-[#374151] dark:text-gray-300",
    "border-b border-[#F1F5F9] dark:border-gray-800", className
  )}>
    {children}
  </td>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProcessCoordinatorPage() {
  const { api, settings } = useAppStore();
  const PROJECTS = useMemo(()=> settings?.projects||[], [settings]);

  const [mrs,        setMrs       ] = useState([]);
  const [pos,        setPos       ] = useState([]);
  const [grns,       setGrns      ] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [search,        setSearch       ] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStage,   setFilterStage  ] = useState("");
  const [startDate,     setStartDate    ] = useState("");
  const [endDate,       setEndDate      ] = useState("");
  const [viewMode,      setViewMode     ] = useState("cards");

  const hasFilters = !!(search||startDate||endDate||filterProject||filterStage);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mrRes,posRes,quotesRes] = await Promise.all([
        api.get("material-requirements",{limit:300}),
        api.get("pos",{limit:1000}),
        api.get("quotations",{limit:300}),
      ]);
      const mrList    = mrRes?.data    || [];
      const poList    = posRes?.data   || [];
      const quoteList = quotesRes?.data || [];
      setMrs(mrList); setPos(poList); setQuotations(quoteList);
      if (poList.length>0) {
        const grnRes = await api.get("grn",{limit:3000,slim:"1"});
        setGrns(grnRes?.data||[]);
      } else setGrns([]);
    } catch { toast.error("Failed to load pipeline data"); }
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  // ── Lookup maps ────────────────────────────────────────────────────────────

  const posByMrId = useMemo(()=>{
    const map=new Map();
    for(const p of pos){ if(!p.mrId)continue; if(!map.has(p.mrId))map.set(p.mrId,[]); map.get(p.mrId).push(p); }
    return map;
  },[pos]);

  const grnsByPoId = useMemo(()=>{
    const map=new Map();
    for(const g of grns){ if(!g.poId)continue; if(!map.has(g.poId))map.set(g.poId,[]); map.get(g.poId).push(g); }
    return map;
  },[grns]);

  const quotationsByMrId = useMemo(()=>{
    const map=new Map();
    for(const q of quotations){ if(!q.mrId)continue; if(!map.has(q.mrId))map.set(q.mrId,[]); map.get(q.mrId).push(q); }
    return map;
  },[quotations]);

  // ── Rows ───────────────────────────────────────────────────────────────────

  const pipelineRows = useMemo(()=> mrs.map(mr=>{
    const info = getStageInfo(mr,posByMrId,grnsByPoId,quotationsByMrId);
    const days = daysSince(info.stageDate);
    const isOverdue = info.stage!=="Paid" && days>(OVERDUE_DAYS[info.stage]??Infinity);
    return {mr,...info,days,isOverdue};
  }),[mrs,posByMrId,grnsByPoId,quotationsByMrId]);

  const filteredRows = useMemo(()=>{
    let r = pipelineRows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(x =>
        (x.mr.mrNumber||"").toLowerCase().includes(q) ||
        (x.mr.id||"").toLowerCase().includes(q) ||
        (x.mr.project||x.mr.projectName||"").toLowerCase().includes(q) ||
        (x.mr.requesterName||"").toLowerCase().includes(q) ||
        x.pos.some(p => (p.id||"").toLowerCase().includes(q))
      );
    }
    if (filterProject) {
      r = r.filter(x => (x.mr.project||x.mr.projectName) === filterProject);
    }
    if (filterStage) {
      r = r.filter(x => x.stage === filterStage);
    }
    if (startDate) {
      r = r.filter(x => x.mr.createdAt && new Date(x.mr.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      const e = new Date(endDate); e.setHours(23,59,59,999);
      r = r.filter(x => x.mr.createdAt && new Date(x.mr.createdAt) <= e);
    }
    return r;
  },[pipelineRows,search,filterProject,filterStage,startDate,endDate]);

  const summary = useMemo(()=>{
    const overdue = pipelineRows.filter(r=>r.isOverdue).length;
    const paid    = pipelineRows.filter(r=>r.stage==="Paid").length;
    const atRisk  = pipelineRows.filter(r=>{
      if(r.isOverdue||r.stage==="Paid") return false;
      return r.days/(OVERDUE_DAYS[r.stage]??999)>0.6;
    }).length;
    return {total:pipelineRows.length,overdue,paid,atRisk};
  },[pipelineRows]);

  const projectOptions = useMemo(()=>[
    {value:"",label:"All Projects"},
    ...PROJECTS.map(p=>({value:p,label:p})),
  ],[PROJECTS]);

  const stageOptions = useMemo(()=>[
    {value:"",label:"All Stages"},
    ...STAGES.map(s=>({value:s,label:STAGE_LABELS[s]})),
  ],[]);

  const clearAll = useCallback(()=>{
    setSearch("");setStartDate("");setEndDate("");setFilterProject("");setFilterStage("");
  },[]);

  // ── Skeleton ───────────────────────────────────────────────────────────────

  if(loading && mrs.length===0) return (
    <div className="p-4 sm:p-6 space-y-5">
      <Skeleton className="h-14 w-full rounded-xl"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}
      </div>
      <Skeleton className="h-14 rounded-xl"/>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array(6).fill(0).map((_,i)=><Skeleton key={i} className="h-52 rounded-xl"/>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">

      {/* ── Header ── */}
      <PageHeader
        title="Process Coordinator"
        sub="Track every MR through the full procurement pipeline"
        actions={
          <button onClick={load} disabled={loading} className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium shadow-sm",
            "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
            "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors",
            loading && "opacity-60 pointer-events-none"
          )}>
            <RefreshCw className={cn("w-4 h-4",loading&&"animate-spin")}/>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      />


      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:"Total MRs",    val:summary.total,   sub:"in pipeline",          valCls:"text-gray-900 dark:text-white"},
          {label:"Overdue",      val:summary.overdue, sub:"need immediate action", valCls:"text-red-500"},
          {label:"At Risk",      val:summary.atRisk,  sub:"approaching limit",     valCls:"text-orange-500"},
          {label:"Completed",    val:summary.paid,    sub:"fully paid",            valCls:"text-green-600 dark:text-green-400"},
        ].map(s=>(
          <div key={s.label} className="bg-white dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/50 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className={cn("text-[28px] font-black tabular-nums leading-tight mt-1",s.valCls)}>{s.val}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter row ── */}
      <Card className="px-4 py-3.5">
        <FilterRow showClear={hasFilters} onClearAll={clearAll}>
          <SearchFilter
            value={search} onChange={setSearch}
            placeholder="Search MR ID, PO number, requester, project…"
            className="flex-1 min-w-[200px]"
          />
          <DateRangePicker
            value={{start:startDate,end:endDate}}
            onChange={v=>{setStartDate(v.start);setEndDate(v.end);}}
          />
          <SelectFilter value={filterProject} onChange={setFilterProject} options={projectOptions} placeholder="All Projects" searchable/>
          <SelectFilter value={filterStage}   onChange={setFilterStage}   options={stageOptions}   placeholder="All Stages"/>
          {/* View toggle — desktop only */}
          <div className="hidden lg:flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0 shadow-sm">
            <button onClick={()=>setViewMode("cards")} title="Card view"
              className={cn("p-2 transition-colors",
                viewMode==="cards" ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}>
              <LayoutGrid className="w-4 h-4"/>
            </button>
            <button onClick={()=>setViewMode("table")} title="Table view"
              className={cn("p-2 transition-colors",
                viewMode==="table" ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}>
              <List className="w-4 h-4"/>
            </button>
          </div>
        </FilterRow>
      </Card>

      {hasFilters && filteredRows.length>0 && (
        <p className="text-[12px] text-gray-400 px-0.5">
          Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredRows.length}</span>
          {" "}of <span className="font-semibold text-gray-700 dark:text-gray-300">{pipelineRows.length}</span> MRs
        </p>
      )}

      {/* Empty */}
      {!loading && filteredRows.length===0 && (
        <Card className="flex flex-col items-center justify-center py-20">
          <Layers className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600"/>
          <p className="text-[14px] font-medium text-gray-500 dark:text-gray-400">No MRs match the filters</p>
          {hasFilters && <button onClick={clearAll} className="mt-3 text-[12px] text-primary hover:underline">Clear all filters</button>}
        </Card>
      )}

      {filteredRows.length>0 && (
        <>
          {/* ── Mobile (< lg) — always cards ── */}
          <div className="lg:hidden">
            <VirtuosoGrid
              style={{ height: "calc(100vh - 360px)", minHeight: "450px" }}
              data={filteredRows}
              listClassName="grid grid-cols-1 gap-4 pb-12"
              itemClassName="flex flex-col h-full"
              itemContent={(_, row) => (
                <MRCard row={row} grnsByPoId={grnsByPoId} quotations={quotations} />
              )}
            />
          </div>

          {/* ── Desktop card grid ── */}
          {viewMode==="cards" && (
            <div className="hidden lg:block">
              <VirtuosoGrid
                style={{ height: "calc(100vh - 360px)", minHeight: "450px" }}
                data={filteredRows}
                listClassName="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-12"
                itemClassName="flex flex-col h-full"
                itemContent={(_, row) => (
                  <MRCard row={row} grnsByPoId={grnsByPoId} quotations={quotations} />
                )}
              />
            </div>
          )}

          {/* ── Desktop table ── */}
          <Card className={cn(
            "p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
            viewMode==="table" ? "hidden lg:block" : "hidden"
          )}>
            <TableVirtuoso
              style={{height:"calc(100vh - 480px)",minHeight:"360px"}}
              data={filteredRows}
              fixedHeaderContent={()=>(
                <tr className="bg-[#F9FAFB] dark:bg-gray-800/90 backdrop-blur-sm border-b border-[#E5E7EB] dark:border-gray-700">
                  <th className="px-4 py-3 text-left min-w-[140px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">MR Details</span>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[160px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Project / Requester</span>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[240px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pipeline</span>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[130px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PO & GRN</span>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[130px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stage</span>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[130px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">In Stage</span>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[110px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</span>
                  </th>
                </tr>
              )}
              itemContent={(_,row)=>{
                const { mr, stage, pos: rowPos, days, isOverdue } = row;
                const po     = rowPos?.[0];
                const poGRNs = po ? grnsByPoId.get(po.id)||[] : [];
                const stageIdx = STAGES.indexOf(stage);
                const hex    = STAGE_HEX[stage];
                const status = getStatusInfo(stage, days, isOverdue);
                const fill   = getDaysFill(days, stage, isOverdue);
                const StatusIcon = status.icon;
                const limit  = OVERDUE_DAYS[stage];
                const mrDate = mr.createdAt
                  ? new Date(mr.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"})
                  : "—";

                return (
                  <>
                    <Td className="font-mono font-bold text-gray-900 dark:text-white">
                      <div>{mr.mrNumber || mr.id || "—"}</div>
                      <div className="font-sans text-[11px] font-normal text-gray-400 mt-0.5">{mrDate}</div>
                    </Td>
                    <Td>
                      <div className="font-medium text-gray-900 dark:text-white">{mr.project || mr.projectName || "—"}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{mr.requesterName || "—"}</div>
                    </Td>
                    <Td>
                      <PipelineStepper stageIdx={stageIdx} hex={hex} />
                    </Td>
                    <Td>
                      {rowPos.length === 0 ? (
                        <span className="text-gray-400 italic text-[12px]">No PO raised</span>
                      ) : (
                        <div className="space-y-1">
                          {rowPos.map((p) => {
                            const pGRNs = grnsByPoId.get(p.id) || [];
                            return (
                              <div key={p.id} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{p.id}</span>
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                                  pGRNs.length > 0 ? "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" : "text-gray-400 dark:text-gray-500"
                                )}>
                                  {pGRNs.length > 0 ? `${pGRNs.length} GRN` : "No GRN"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold", STAGE_BADGE_CLS[stage])}>
                        {STAGE_LABELS[stage]}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-[14px] tabular-nums", status.text)}>
                          {days}d
                        </span>
                        {limit && (
                          <div className="flex-1 max-w-[80px]">
                            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <div className={cn("h-full rounded-full", fill.cls)} style={{ width:`${fill.pct}%` }} />
                            </div>
                            <div className="text-[9px] text-gray-400 mt-0.5">of {limit}d limit</div>
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1",
                        status.label==="Overdue"   && "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-800/40",
                        status.label==="At Risk"   && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 ring-orange-200 dark:ring-orange-800/40",
                        status.label==="On Track"  && "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800/40",
                        status.label==="Completed" && "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 ring-green-200 dark:ring-green-800/40",
                      )}>
                        <StatusIcon className="w-3 h-3"/>
                        {status.label}
                      </div>
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
