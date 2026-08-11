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

const BOTTLENECK_CARDS = [
  { stage:"MR",          title:"Awaiting Quotation",  desc:"No quotation received",     icon:FileText,    days:3,  hex:"#3B82F6" },
  { stage:"Quotation",   title:"PO Not Raised",        desc:"No PO issued after quote",  icon:ShoppingCart,days:5,  hex:"#8B5CF6" },
  { stage:"PO",          title:"GRN Pending",          desc:"Goods not received yet",    icon:Package,     days:7,  hex:"#F97316" },
  { stage:"Bill Verify", title:"Payment Pending",      desc:"Bill verified, unpaid",     icon:IndianRupee, days:3,  hex:"#EAB308" },
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

// ─── Pipeline stepper (classy version) ───────────────────────────────────────

function PipelineStepper({ stageIdx, hex }) {
  return (
    <div className="flex items-end gap-0">
      {STAGES.map((s, i) => {
        const done = i < stageIdx;
        const cur  = i === stageIdx;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              {/* dot */}
              <div
                className={cn(
                  "rounded-full flex items-center justify-center font-black text-[8px] shrink-0 transition-all",
                  done ? "w-5 h-5 bg-green-500 text-white"
                       : cur  ? cn("w-6 h-6", STAGE_DOT_CLS[s])
                               : "w-5 h-5 bg-gray-200/80 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                )}
                style={cur ? { boxShadow:`0 0 0 3px ${hex}30` } : undefined}
              >
                {done ? "✓" : i+1}
              </div>
              {/* label */}
              <span className={cn(
                "text-[8px] leading-none font-medium",
                cur  ? cn(STAGE_TEXT_CLS[s],"font-bold")
                     : done ? "text-green-500"
                            : "text-gray-300 dark:text-gray-600"
              )}>
                {STAGE_SHORT[s]}
              </span>
            </div>
            {i < STAGES.length-1 && (
              <div className={cn(
                "h-px w-4 mb-4 shrink-0",
                done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── MR Card (classy) ─────────────────────────────────────────────────────────

function MRCard({ row, grnsByPoId }) {
  const { mr, stage, pos: rowPos, days, isOverdue } = row;
  const po      = rowPos?.[0];
  const poGRNs  = po ? grnsByPoId.get(po.id)||[] : [];
  const stageIdx = STAGES.indexOf(stage);
  const hex     = STAGE_HEX[stage];
  const status  = getStatusInfo(stage, days, isOverdue);
  const fill    = getDaysFill(days, stage, isOverdue);
  const StatusIcon = status.icon;
  const limit   = OVERDUE_DAYS[stage];

  const mrDate = mr.createdAt
    ? new Date(mr.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"})
    : "—";

  return (
    <div className={cn(
      "relative flex rounded-xl overflow-hidden transition-all duration-200",
      "bg-white dark:bg-[#1E293B]",
      "border border-gray-200/70 dark:border-gray-700/60",
      "shadow-sm hover:shadow-md hover:-translate-y-0.5",
      isOverdue && "border-red-200/80 dark:border-red-800/40"
    )}>
      {/* Left accent strip */}
      <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: hex }} />

      <div className="flex-1 p-4 min-w-0">

        {/* Row 1: MR ID + Status pill */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-mono text-[13px] font-bold text-gray-900 dark:text-white leading-none">
              {mr.mrNumber || mr.id || "—"}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">{mrDate}</p>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold shrink-0",
            "ring-1",
            status.label==="Overdue"   && "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-800/40",
            status.label==="At Risk"   && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 ring-orange-200 dark:ring-orange-800/40",
            status.label==="On Track"  && "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800/40",
            status.label==="Completed" && "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 ring-green-200 dark:ring-green-800/40",
          )}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </div>
        </div>

        {/* Row 2: Project + Requester */}
        <div className="mb-3.5">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate leading-snug">
            {mr.project || mr.projectName || "—"}
          </p>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {mr.requesterName ? `Requested by ${mr.requesterName}` : "—"}
          </p>
        </div>

        {/* Row 3: Pipeline stepper */}
        <div className="mb-3.5 px-3 py-2.5 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/40">
          <PipelineStepper stageIdx={stageIdx} hex={hex} />
        </div>

        {/* Row 4: Stage + Days-in-stage */}
        <div className="flex items-end justify-between gap-2 mb-3">
          <div>
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Current Stage</p>
            <span className={cn("inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold", STAGE_BADGE_CLS[stage])}>
              {STAGE_LABELS[stage]}
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1">In This Stage</p>
            <p className={cn("text-[22px] font-black leading-none tabular-nums", status.text)}>
              {days}<span className="text-[11px] font-medium ml-0.5">d</span>
            </p>
            {limit && (
              <div className="mt-1.5 flex flex-col items-end gap-0.5">
                <div className="w-20 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", fill.cls)}
                    style={{ width:`${fill.pct}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-400">of {limit}d limit</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 5: PO info */}
        <div className="pt-2.5 border-t border-gray-100 dark:border-gray-700/40">
          {po ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Purchase Order</p>
                <p className="font-mono text-[12px] font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">{po.id}</p>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-1 rounded-full ring-1 shrink-0",
                poGRNs.length>0
                  ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 ring-teal-200 dark:ring-teal-800/40"
                  : "bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 ring-gray-200 dark:ring-gray-600/40"
              )}>
                {poGRNs.length>0 ? `${poGRNs.length} GRN received` : "Awaiting GRN"}
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
    let rows = pipelineRows;
    if(startDate)     rows=rows.filter(r=>new Date(r.mr.createdAt)>=new Date(startDate));
    if(endDate)       rows=rows.filter(r=>new Date(r.mr.createdAt)<=new Date(endDate+"T23:59:59"));
    if(filterProject) rows=rows.filter(r=>(r.mr.project||r.mr.projectName)===filterProject);
    if(filterStage)   rows=rows.filter(r=>r.stage===filterStage);
    if(search){
      const q=search.toLowerCase();
      rows=rows.filter(r=>
        (r.mr.mrNumber||"").toLowerCase().includes(q)||
        (r.mr.id||"").toLowerCase().includes(q)||
        (r.mr.requesterName||"").toLowerCase().includes(q)||
        (r.mr.project||r.mr.projectName||"").toLowerCase().includes(q)||
        (r.pos||[]).some(p=>(p.id||"").toLowerCase().includes(q))
      );
    }
    return [...rows].sort((a,b)=>
      a.isOverdue!==b.isOverdue ? (b.isOverdue?1:-1) : b.days-a.days
    );
  },[pipelineRows,startDate,endDate,filterProject,filterStage,search]);

  const summary = useMemo(()=>{
    const overdue = pipelineRows.filter(r=>r.isOverdue).length;
    const paid    = pipelineRows.filter(r=>r.stage==="Paid").length;
    const atRisk  = pipelineRows.filter(r=>{
      if(r.isOverdue||r.stage==="Paid") return false;
      return r.days/(OVERDUE_DAYS[r.stage]??999)>0.6;
    }).length;
    return {total:pipelineRows.length,overdue,paid,atRisk};
  },[pipelineRows]);

  const bottlenecks = useMemo(()=>{
    const out={};
    for(const r of pipelineRows) if(r.isOverdue) out[r.stage]=(out[r.stage]||0)+1;
    return out;
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

      {/* ── Pipeline flow legend ── */}
      <div className="flex items-center gap-1.5 flex-wrap px-0.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mr-1 shrink-0">Flow:</span>
        {STAGES.map((s,i)=>(
          <React.Fragment key={s}>
            <span className={cn(
              "flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1",
              STAGE_BADGE_CLS[s]
            )}>
              <span className="text-[9px] opacity-50 font-black">{i+1}</span>
              {STAGE_SHORT[s]}
            </span>
            {i<STAGES.length-1 && <span className="text-gray-300 dark:text-gray-600 text-sm shrink-0">→</span>}
          </React.Fragment>
        ))}
      </div>

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

      {/* ── Bottleneck cards ── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-0.5 mb-2.5">
          Bottleneck Alerts — tap to filter
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {BOTTLENECK_CARDS.map(({stage,title,desc,icon:Icon,days,hex})=>{
            const count   = bottlenecks[stage]||0;
            const isActive= filterStage===stage;
            return (
              <button key={stage} onClick={()=>setFilterStage(isActive?"":stage)}
                className={cn(
                  "text-left rounded-xl border p-0 flex overflow-hidden transition-all shadow-sm",
                  "bg-white dark:bg-gray-800/80",
                  isActive  ? "ring-2 ring-primary border-primary"
                  : count>0 ? "border-red-200/70 dark:border-red-800/30 hover:shadow-md hover:-translate-y-0.5"
                            : "border-gray-200/60 dark:border-gray-700/50 hover:shadow-md hover:-translate-y-0.5"
                )}
              >
                {/* Stage color strip */}
                <div className="w-1 shrink-0" style={{backgroundColor:count>0?"#ef4444":hex}}/>
                <div className="flex-1 p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{backgroundColor: count>0?"#FEF2F2":"#F8FAFC"}}>
                      <Icon className={cn("w-4 h-4",count>0?"text-red-500":"text-gray-400")}/>
                    </div>
                    {count>0 && <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide">!</span>}
                  </div>
                  <p className="text-[11px] font-bold text-gray-900 dark:text-white leading-tight mt-1">{title}</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{desc} &gt;{days}d</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={cn("text-[26px] font-black tabular-nums leading-none",count>0?"text-red-500":"text-gray-700 dark:text-gray-300")}>
                      {count}
                    </span>
                    <span className={cn("text-[10px] font-medium",count>0?"text-red-400":"text-gray-400")}>
                      {count===1?"MR stuck":count>1?"MRs stuck":"all clear"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
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

      {loading && mrs.length>0 && (
        <div className="flex items-center gap-2 text-[12px] text-blue-500 dark:text-blue-400 px-0.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin"/> Refreshing data…
        </div>
      )}

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
            <Virtuoso
              style={{height:"calc(100vh - 480px)",minHeight:"320px"}}
              data={filteredRows}
              itemContent={(_,row)=>(
                <div className="pb-3"><MRCard row={row} grnsByPoId={grnsByPoId}/></div>
              )}
            />
          </div>

          {/* ── Desktop card grid ── */}
          {viewMode==="cards" && (
            <div className="hidden lg:block">
              <Virtuoso
                style={{height:"calc(100vh - 480px)",minHeight:"400px"}}
                data={filteredRows}
                itemContent={(_,row)=>(
                  <div className="pb-3"><MRCard row={row} grnsByPoId={grnsByPoId}/></div>
                )}
                components={{
                  List: React.forwardRef(({style,children},ref)=>(
                    <div ref={ref} style={style} className="grid grid-cols-2 xl:grid-cols-3 gap-3">{children}</div>
                  )),
                  Item:({children,...props})=><div {...props} className="min-w-0">{children}</div>,
                }}
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
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Pipeline</span>
                    <div className="flex items-center gap-1">
                      {STAGES.map((s,i)=>(
                        <React.Fragment key={s}>
                          <span className={cn("text-[9px] font-bold",STAGE_TEXT_CLS[s])}>{STAGE_SHORT[s]}</span>
                          {i<5 && <span className="text-gray-300 dark:text-gray-600 text-[9px] mx-0.5">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[130px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">PO & GRN</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stage</span>
                  </th>
                  <th className="px-4 py-3 text-left w-[100px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">In Stage</span>
                  </th>
                  <th className="px-4 py-3 text-left w-[110px]">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</span>
                  </th>
                </tr>
              )}
              itemContent={(_,row)=>{
                const {mr,stage,pos:rowPos,days,isOverdue} = row;
                const stageIdx = STAGES.indexOf(stage);
                const po       = rowPos?.[0];
                const poGRNs   = po ? grnsByPoId.get(po.id)||[] : [];
                const hex      = STAGE_HEX[stage];
                const status   = getStatusInfo(stage,days,isOverdue);
                const fill     = getDaysFill(days,stage,isOverdue);
                const StatusIcon = status.icon;
                const limit    = OVERDUE_DAYS[stage];
                const mrDate   = mr.createdAt
                  ? new Date(mr.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"})
                  : "—";
                return (
                  <>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-0.5 h-8 rounded-full shrink-0" style={{backgroundColor:hex}}/>
                        <div>
                          <p className="font-mono text-[12px] font-bold text-gray-900 dark:text-white">{mr.mrNumber||mr.id||"—"}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{mrDate}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-[12px] font-semibold text-gray-900 dark:text-white truncate max-w-[155px]">{mr.project||mr.projectName||"—"}</p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[155px]">{mr.requesterName||"—"}</p>
                    </Td>
                    <Td><PipelineStepper stageIdx={stageIdx} hex={hex}/></Td>
                    <Td>
                      {po ? (
                        <>
                          <p className="font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">{po.id}</p>
                          <p className={cn("text-[10px] mt-0.5 font-medium",poGRNs.length>0?"text-teal-600 dark:text-teal-400":"text-gray-400")}>
                            {poGRNs.length>0 ? `${poGRNs.length} GRN received` : "Awaiting GRN"}
                          </p>
                        </>
                      ) : <span className="text-[11px] text-gray-400 italic">No PO raised</span>}
                    </Td>
                    <Td>
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap",STAGE_BADGE_CLS[stage])}>
                        {STAGE_LABELS[stage]}
                      </span>
                    </Td>
                    <Td>
                      <p className={cn("text-[15px] font-black tabular-nums leading-none",status.text)}>
                        {days}<span className="text-[10px] font-medium ml-0.5">d</span>
                      </p>
                      {limit && (
                        <div className="mt-1.5 w-16 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div className={cn("h-full rounded-full",fill.cls)} style={{width:`${fill.pct}%`}}/>
                        </div>
                      )}
                      {limit && <p className="text-[9px] text-gray-400 mt-0.5">of {limit}d</p>}
                    </Td>
                    <Td>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ring-1",
                        status.label==="Overdue"   && "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-800/40",
                        status.label==="At Risk"   && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 ring-orange-200 dark:ring-orange-800/40",
                        status.label==="On Track"  && "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800/40",
                        status.label==="Completed" && "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 ring-green-200 dark:ring-green-800/40",
                      )}>
                        <StatusIcon className="w-3 h-3"/>
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
