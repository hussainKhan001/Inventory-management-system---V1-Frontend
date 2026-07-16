var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../store";
import {
  PageHeader,
  KPICard,
  Card,
  StatusBadge,
  Skeleton,
  Btn
} from "../components/ui";
import {
  Package,
  AlertTriangle,
  FileText,
  CheckSquare,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Sparkles,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  ClipboardList,
  HardHat,
  Layers,
  Clock,
  CircleCheck,
  Boxes,
  Bell,
  ChevronRight,
  PackageCheck,
  ShoppingCart
} from "lucide-react";
import { fmtCur, formatDateTime } from "../utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { getAIInsights } from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
const StatBox = /* @__PURE__ */ __name(({ label, value, color = "gray", sub }) => {
  const colors = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-500 dark:text-red-400",
    amber: "text-amber-500 dark:text-amber-400",
    purple: "text-purple-500 dark:text-purple-400",
    gray: "text-gray-900 dark:text-white"
  };
  return <div className="text-center">
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-[22px] font-black ${colors[color]}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>;
}, "StatBox");
const SectionHeader = /* @__PURE__ */ __name(({ title, action, actionLabel }) => <div className="flex items-center justify-between mb-4">
    <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">{title}</h3>
    {action && <button onClick={action} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
        {actionLabel || "View All"} <ChevronRight className="w-3 h-3" />
      </button>}
  </div>, "SectionHeader");
const EmptyState = /* @__PURE__ */ __name(({ text }) => <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-[13px]">{text}</div>, "EmptyState");
const SiteEngineerDashboard = /* @__PURE__ */ __name(({ user, plans, materialRequirements, mrAllocations }) => {
  const myName = user?.name || "";
  const myPlans = useMemo(
    () => plans.filter((p) => p.engineer?.trim().toLowerCase() === myName.trim().toLowerCase()),
    [plans, myName]
  );
  const myMRs = useMemo(
    () => materialRequirements.filter((mr) => mr.requesterName?.trim().toLowerCase() === myName.trim().toLowerCase()),
    [materialRequirements, myName]
  );
  const totalRequired = useMemo(
    () => myPlans.reduce((s, p) => s + (p.items || []).reduce((ss, i) => ss + (Number(i.required) || 0), 0), 0),
    [myPlans]
  );
  const totalAllotted = useMemo(() => {
    return myPlans.reduce((s, plan) => {
      return s + (plan.items || []).reduce((ss, item) => {
        const allotted = mrAllocations.filter((a) => a.sku === item.sku && a.engineerName?.trim().toLowerCase() === myName.trim().toLowerCase() && a.projectName?.trim().toLowerCase() === (plan.project || "").trim().toLowerCase()).reduce((sum, a) => sum + (a.allocatedQty || 0), 0);
        return ss + allotted;
      }, 0);
    }, 0);
  }, [myPlans, mrAllocations, myName]);
  const pendingMRs = myMRs.filter((mr) => ["Store Pending", "Quotation Phase"].includes(mr.status));
  return <div className="space-y-6 pb-12">
      <div className="flex items-end justify-between">
        <PageHeader
    title={`Welcome, ${myName || "Engineer"}`}
    sub="Your material plans and requests at a glance"
  />
        <Btn label="New MR" icon={ClipboardList} onClick={() => window.location.hash = "material-requirements"} />
      </div>

      {
    /* KPIs */
  }
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="My Plans" value={myPlans.length} icon={Layers} color="blue" sub="Active material plans" />
        <KPICard label="Total Required" value={totalRequired} icon={Package} color="orange" sub="Units across all plans" />
        <KPICard label="Allotted" value={totalAllotted} icon={CheckSquare} color="green" sub="Units received" />
        <KPICard label="My MRs" value={myMRs.length} icon={ClipboardList} color="purple" sub={`${pendingMRs.length} pending`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {
    /* My Plans */
  }
        <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <SectionHeader title="My Material Plans" action={() => window.location.hash = "planning"} />
          {myPlans.length === 0 ? <EmptyState text="No plans assigned to you yet." /> : <div className="space-y-3">
              {myPlans.slice(0, 5).map((plan) => {
    const total = (plan.items || []).reduce((s, i) => s + (Number(i.required) || 0), 0);
    const allotted = mrAllocations.filter((a) => a.engineerName?.trim().toLowerCase() === myName.trim().toLowerCase() && a.projectName === plan.project).reduce((s, a) => s + (a.allocatedQty || 0), 0);
    const pct = total > 0 ? Math.min(100, Math.round(allotted / total * 100)) : 0;
    return <div key={plan.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => window.location.hash = "planning"}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <HardHat className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{plan.id}</p>
                        <StatusBadge status={plan.status} />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{plan.project}</p>
                      <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 50 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pct}% allotted</p>
                    </div>
                  </div>;
  })}
            </div>}
        </Card>

        {
    /* My Recent MRs */
  }
        <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <SectionHeader title="My Material Requests" action={() => window.location.hash = "material-requirements"} />
          {myMRs.length === 0 ? <EmptyState text="No material requests raised yet." /> : <div className="space-y-2">
              {myMRs.slice(0, 6).map((mr) => <div key={mr.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => window.location.hash = "material-requirements"}>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{mr.id}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{mr.project} · {mr.items?.length || 0} items</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={mr.status} />
                    <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(mr.date)}</p>
                  </div>
                </div>)}
            </div>}
        </Card>
      </div>

      {
    /* Material plan items: remaining */
  }
      {myPlans.length > 0 && <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <SectionHeader title="Material Balance — All Plans" />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-gray-50 dark:bg-gray-800/40">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Required</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Allotted</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {myPlans.flatMap(
    (plan) => (plan.items || []).map((item, idx) => {
      const allotted = mrAllocations.filter((a) => a.sku === item.sku && a.engineerName?.trim().toLowerCase() === myName.trim().toLowerCase() && a.projectName?.trim().toLowerCase() === (plan.project || "").trim().toLowerCase()).reduce((s, a) => s + (a.allocatedQty || 0), 0);
      const pending = Math.max(0, (Number(item.required) || 0) - allotted);
      return <tr key={`${plan.id}-${idx}`} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-2.5 text-[13px] font-medium text-gray-900 dark:text-white">{item.itemName || item.materialName || item.sku}</td>
                        <td className="px-4 py-2.5 text-[12px] text-gray-500 dark:text-gray-400">{plan.project}</td>
                        <td className="px-4 py-2.5 text-[13px] font-bold text-right text-gray-700 dark:text-gray-300">{item.required} <span className="text-[10px] font-normal">{item.unit}</span></td>
                        <td className="px-4 py-2.5 text-[13px] font-bold text-right text-emerald-600 dark:text-emerald-400">{allotted > 0 ? allotted : "\u2014"}</td>
                        <td className="px-4 py-2.5 text-[13px] font-bold text-right">
                          {pending > 0 ? <span className="text-red-500 dark:text-red-400">{pending} <span className="text-[10px] font-normal">{item.unit}</span></span> : <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                        </td>
                      </tr>;
    })
  ).slice(0, 20)}
              </tbody>
            </table>
          </div>
        </Card>}
    </div>;
}, "SiteEngineerDashboard");
const AGMDashboard = /* @__PURE__ */ __name(({ user, plans, materialRequirements, mrAllocations, planRevisions, pos, quotations, stats, role }) => {
  const myName = user?.name || "";
  const myPlans = useMemo(
    () => role === "AGM" ? plans.filter((p) =>
      p.gmAgm?.trim().toLowerCase() === myName.trim().toLowerCase() ||
      p.submittedBy?.trim().toLowerCase() === myName.trim().toLowerCase()
    ) : plans,
    [plans, myName, role]
  );
  const myProjects = useMemo(
    () => [...new Set(myPlans.map((p) => p.project).filter(Boolean))],
    [myPlans]
  );
  const pendingRevisions = planRevisions.filter((r) => r.status === "pending");
  const myMRs = useMemo(
    () => materialRequirements.filter((mr) => myProjects.includes(mr.project)),
    [materialRequirements, myProjects]
  );
  const pendingMRs = myMRs.filter((mr) => mr.status === "Store Pending");
  const pendingL1POs = useMemo(
    () => (pos || []).filter((po) => po.status === "Pending L1"),
    [pos]
  );
  // Use accurate backend counts (not limited by frontend fetch size)
  const pendingAllPOsCount = stats?.allPendingPOCount ?? (pos || []).filter((po) => ["Pending", "Pending L1", "Pending L2", "Pending L3"].includes(po.status)).length;
  const pendingQuotationsCount = stats?.pendingQuotationCount ?? (quotations || []).filter((q) => q.status === "Pending").length;
  const projectStats = useMemo(
    () => myProjects.map((proj) => {
      const projPlans = myPlans.filter((p) => p.project === proj);
      const totalRequired = projPlans.reduce((s, p) => s + (p.items || []).reduce((ss, i) => ss + (Number(i.required) || 0), 0), 0);
      const totalAllotted = mrAllocations.filter((a) => a.projectName?.trim().toLowerCase() === proj.trim().toLowerCase()).reduce((s, a) => s + (a.allocatedQty || 0), 0);
      return { project: proj, plans: projPlans.length, totalRequired, totalAllotted, pending: Math.max(0, totalRequired - totalAllotted) };
    }),
    [myProjects, myPlans, mrAllocations]
  );
  return <div className="space-y-6 pb-12">
      <PageHeader
    title={`${role} Overview \u2014 ${myName || role}`}
    sub="Projects, material plans and approval pipeline"
  />

      {
    /* KPIs */
  }
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="My Projects" value={myProjects.length} icon={Boxes} color="blue" sub="Under oversight" />
        <KPICard label="Active Plans" value={myPlans.length} icon={Layers} color="orange" sub="Material plans" />
        <KPICard label="Pending L1 POs" value={pendingL1POs.length} icon={FileText} color={pendingL1POs.length > 0 ? "red" : "green"} sub="Awaiting L1 approval" />
        <KPICard label="Pending MRs" value={pendingMRs.length} icon={ClipboardList} color={pendingMRs.length > 0 ? "orange" : "green"} sub="Awaiting store action" />
        <KPICard label="Pending Quotations" value={pendingQuotationsCount} icon={FileText} color={pendingQuotationsCount > 0 ? "orange" : "green"} sub="Under review" />
        <KPICard label="PO Pending" value={pendingAllPOsCount} icon={ShoppingCart} color={pendingAllPOsCount > 0 ? "red" : "green"} sub="All approval stages" />
      </div>

      {
    /* Pending L1 Purchase Orders */
  }
      {pendingL1POs.length > 0 && <Card className="p-5 border-red-200/60 dark:border-red-700/30 bg-white dark:bg-gray-900">
          <SectionHeader title={`Pending L1 Purchase Orders (${pendingL1POs.length})`} action={() => window.location.hash = "purchase-orders"} />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-gray-50 dark:bg-gray-800/40">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">PO No.</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Value</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {pendingL1POs.slice(0, 8).map((po) => <tr key={po.id} className="hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors">
                    <td className="px-4 py-2.5 text-[13px] font-bold text-gray-900 dark:text-white">{po.id}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-600 dark:text-gray-300 max-w-[140px] truncate">{po.supplier || "—"}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-600 dark:text-gray-300 max-w-[140px] truncate">{po.project || "—"}</td>
                    <td className="px-4 py-2.5 text-[13px] font-bold text-right text-gray-900 dark:text-white">
                      {po.totalValue != null ? `₹${Number(po.totalValue).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-400">{formatDateTime(po.date)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => window.location.hash = "purchase-orders"} className="text-[11px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary hover:text-white transition-all">
                        Review
                      </button>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </Card>}

      {
    /* Pending Revision Requests */
  }
      {pendingRevisions.length > 0 && <Card className="p-5 border-amber-200/60 dark:border-amber-700/30 bg-white dark:bg-gray-900">
          <SectionHeader title={`Pending Material Revision Requests (${pendingRevisions.length})`} action={() => window.location.hash = "planning"} />
          <div className="space-y-2">
            {pendingRevisions.slice(0, 5).map((rev) => <div key={rev.id} className="flex items-start justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                <div>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white">{rev.itemName}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{rev.engineerName} · {rev.project}</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Requesting <span className="font-bold">+{rev.requestedExtraQty} {rev.unit}</span> — "{rev.reason}"</p>
                </div>
                <button onClick={() => window.location.hash = "planning"} className="text-[11px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary hover:text-white transition-all">Review</button>
              </div>)}
          </div>
        </Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {
    /* Project-wise material status */
  }
        <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <SectionHeader title="Project-wise Material Status" action={() => window.location.hash = "planning"} />
          {projectStats.length === 0 ? <EmptyState text="No projects found." /> : <div className="space-y-3">
              {projectStats.map((ps) => {
    const pct = ps.totalRequired > 0 ? Math.min(100, Math.round(ps.totalAllotted / ps.totalRequired * 100)) : 0;
    return <div key={ps.project} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate max-w-[60%]">{ps.project}</p>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{ps.totalAllotted} allotted</span>
                        {ps.pending > 0 && <span className="text-red-500 dark:text-red-400 font-bold">{ps.pending} pending</span>}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 60 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{ps.plans} plans · {pct}% allotted</p>
                  </div>;
  })}
            </div>}
        </Card>

        {
    /* Recent MRs from projects */
  }
        <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <SectionHeader title="Recent MRs — My Projects" action={() => window.location.hash = "material-requirements"} />
          {myMRs.length === 0 ? <EmptyState text="No MRs found for your projects." /> : <div className="space-y-2">
              {myMRs.slice(0, 6).map((mr) => <div key={mr.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => window.location.hash = "material-requirements"}>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{mr.id}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{mr.requesterName} · {mr.project}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={mr.status} />
                    <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(mr.date)}</p>
                  </div>
                </div>)}
            </div>}
        </Card>
      </div>
    </div>;
}, "AGMDashboard");
const StoreInchargeDashboard = /* @__PURE__ */ __name(({ stats, materialRequirements, mrAllocations, pos, loading }) => {
  const { lowStockCount = 0, outOfStock = 0, totalSKUs = 0 } = stats;
  const storePending = materialRequirements.filter((mr) => mr.status === "Store Pending");
  const approvedByStore = materialRequirements.filter((mr) => mr.status === "Approved by Store");
  const recentAllocations = [...mrAllocations].sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime()).slice(0, 6);
  // Use backend stats for accurate counts (not limited by frontend fetch size)
  const mrPendingCount = stats?.mrStatusCounts?.["Store Pending"] ?? storePending.length;
  const allocationPendingCount = stats?.mrStatusCounts?.["Approved by Store"] ?? approvedByStore.length;
  const grnPendingCount = stats?.grnPendingPOCount ?? (pos || []).filter((p) => ["GRN Pending", "GRN Variance"].includes(p.status)).length;
  const outwardPendingCount = stats?.outwardPendingCount ?? mrAllocations.filter((a) => (a.issuedQty || 0) < (a.allocatedQty || 0)).length;
  return <div className="space-y-6 pb-12">
      <div className="flex items-end justify-between">
        <PageHeader title="Store Dashboard" sub="Pending allocations, stock alerts and recent activity" />
        <div className="flex gap-2">
          <Btn label="Inward" icon={ArrowDownLeft} outline onClick={() => window.location.hash = "inward"} />
          <Btn label="Outward" icon={ArrowUpRight} onClick={() => window.location.hash = "outward"} />
        </div>
      </div>

      {
    /* KPIs */
  }
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="MR Pending" value={mrPendingCount} icon={Clock} color={mrPendingCount > 0 ? "red" : "green"} sub="Awaiting store review" />
        <KPICard label="Allocation Pending" value={allocationPendingCount} icon={CircleCheck} color={allocationPendingCount > 0 ? "orange" : "green"} sub="Approved, not allocated" />
        <KPICard label="GRN Pending" value={grnPendingCount} icon={PackageCheck} color={grnPendingCount > 0 ? "orange" : "green"} sub="POs awaiting GRN" />
        <KPICard label="Outward Pending" value={outwardPendingCount} icon={ArrowUpRight} color={outwardPendingCount > 0 ? "orange" : "green"} sub="Allocated, not issued" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {
    /* Store Pending MRs */
  }
        <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <SectionHeader
    title={`Store Pending MRs (${storePending.length})`}
    action={() => window.location.hash = "material-requirements"}
  />
          {storePending.length === 0 ? <EmptyState text="No pending MRs. All clear!" /> : <div className="space-y-2">
              {storePending.slice(0, 6).map((mr) => <div key={mr.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50/40 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer" onClick={() => window.location.hash = "material-requirements"}>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{mr.id}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{mr.requesterName} · {mr.project}</p>
                    <p className="text-[10px] text-gray-400">{mr.items?.length || 0} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">{formatDateTime(mr.date)}</p>
                    <button className="mt-1 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full hover:bg-primary hover:text-white transition-all">Review</button>
                  </div>
                </div>)}
            </div>}
        </Card>

        {
    /* Ready to Allocate */
  }
        <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <SectionHeader
    title={`Ready to Allocate (${approvedByStore.length})`}
    action={() => window.location.hash = "material-requirements"}
  />
          {approvedByStore.length === 0 ? <EmptyState text="No MRs ready for allocation." /> : <div className="space-y-2">
              {approvedByStore.slice(0, 6).map((mr) => <div key={mr.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer" onClick={() => window.location.hash = "material-requirements"}>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{mr.id}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{mr.requesterName} · {mr.project}</p>
                    <p className="text-[10px] text-gray-400">{mr.items?.length || 0} items · {mr.items?.filter((i) => i.status === "In Stock").length || 0} in stock</p>
                  </div>
                  <button className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full hover:bg-emerald-500 hover:text-white transition-all">Allocate</button>
                </div>)}
            </div>}
        </Card>
      </div>

      {
    /* Recent Allocations */
  }
      <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
        <SectionHeader title="Recent Allocations" action={() => window.location.hash = "material-requirements"} actionLabel="All Allocations" />
        {recentAllocations.length === 0 ? <EmptyState text="No allocations yet." /> : <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-gray-50 dark:bg-gray-800/40">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">MR / Item</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Engineer</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Allocated</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {recentAllocations.map((alc) => <tr key={alc.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-[12px] font-bold text-gray-900 dark:text-white">{alc.itemName}</p>
                      <p className="text-[10px] text-gray-400">{alc.mrId}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-600 dark:text-gray-300">{alc.engineerName || "\u2014"}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-600 dark:text-gray-300 max-w-[140px] truncate">{alc.projectName || "\u2014"}</td>
                    <td className="px-4 py-2.5 text-[13px] font-bold text-right text-emerald-600 dark:text-emerald-400">{alc.allocatedQty}</td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-400">{formatDateTime(alc.allocationDate)}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </Card>

      {
    /* Quick Actions */
  }
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
    { label: "Quick Inward", sub: "Record new stock entry", icon: ArrowDownLeft, hash: "inward", color: "emerald" },
    { label: "Quick Outward", sub: "Record stock issuance", icon: ArrowUpRight, hash: "outward", color: "orange" },
    { label: "View Inventory", sub: "Check stock levels", icon: Boxes, hash: "inventory", color: "blue" }
  ].map(({ label, sub, icon: Icon, hash, color }) => <Card key={hash} className={cn("p-4 cursor-pointer transition-all group bg-white dark:bg-gray-800/80 border-gray-100 dark:border-gray-700/50", `hover:border-${color}-500/50`)} onClick={() => window.location.hash = hash}>
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg group-hover:scale-110 transition-transform", `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600`)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-gray-900 dark:text-white">{label}</h4>
                <p className="text-[11px] text-gray-500">{sub}</p>
              </div>
            </div>
          </Card>)}
      </div>
    </div>;
}, "StoreInchargeDashboard");
const AdminDashboard = /* @__PURE__ */ __name(({ stats, pos, loading, plans, materialRequirements, planRevisions, settings }) => {
  const [aiInsights, setAiInsights] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  useEffect(() => {
    const fetchAI = /* @__PURE__ */ __name(async () => {
      if (stats.totalSKUs && !aiInsights) {
        setIsAiLoading(true);
        const insights = await getAIInsights(stats, pos?.slice(0, 5) || []);
        setAiInsights(insights);
        setIsAiLoading(false);
      }
    }, "fetchAI");
    fetchAI();
  }, [stats.totalSKUs, pos]);
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#4b5563"];
  const {
    totalSKUs = 0,
    allocatedStock = 0,
    outOfStock = 0,
    lowStockCount = 0,
    pendingWriteOffs = 0,
    stockByCategory = [],
    availableStock = 0
  } = stats;
  const chartData = stockByCategory.map((c) => ({
    name: c._id || "Unmatched",
    value: c.count,
    stock: c.totalStock,
    outOfStock: c.outOfStock
  }));
  const pendingRevisions = planRevisions.filter((r) => r.status === "pending");
  const storePendingMRs = materialRequirements.filter((mr) => mr.status === "Store Pending");
  const openPlans = plans.filter((p) => p.status === "Open");
  // Accurate MR counts from backend (not limited by frontend pagination)
  const mrCounts = stats.mrStatusCounts || {};
  if (loading && !stats.totalSKUs) {
    return <div className="space-y-6">
        <PageHeader title="Dashboard" sub="Loading overview..." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>;
  }
  return <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <PageHeader title="Dashboard" sub={`${settings?.appName || "Garden City"} Store Intelligence Overview`} />
        <div className="flex items-center gap-3">
          <Btn label="Daily Report" icon={FileText} className="hidden sm:flex" onClick={() => window.location.hash = "daily-report"} />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[12px] font-medium border border-emerald-100 dark:border-emerald-900/30">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live System Monitoring Active
          </div>
        </div>
      </div>

      {
    /* AI Banner */
  }
      <AnimatePresence>
        {(aiInsights || isAiLoading) && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-blue-500/10" />
            <Card className="p-5 border-blue-100 dark:border-blue-900/30 bg-white/50 dark:bg-gray-800/60 backdrop-blur-sm relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {settings?.appName || "Garden City"} AI intelligence
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-500 dark:text-blue-400 rounded">Beta</span>
                    </h3>
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                  </div>
                  {isAiLoading ? <div className="space-y-2"><Skeleton className="h-4 w-3/4 rounded" /><Skeleton className="h-4 w-1/2 rounded" /></div> : <div className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line prose prose-sm dark:prose-invert max-w-none">{aiInsights}</div>}
                </div>
              </div>
            </Card>
          </motion.div>}
      </AnimatePresence>

      {
    /* KPIs */
  }
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <KPICard label="Pending MR Count" value={mrCounts["Store Pending"] || 0} icon={ClipboardList} color="blue" sub="Awaiting store approval" />
        {(() => {
          const l1 = (pos || []).filter(p => p.status === "Pending L1").length;
          const l2 = (pos || []).filter(p => p.status === "Pending L2").length;
          const l3 = (pos || []).filter(p => p.status === "Pending L3").length;
          const other = (pos || []).filter(p => p.status === "Pending").length;
          const total = l1 + l2 + l3 + other;
          return (
            <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col justify-between min-h-[130px]">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Pending PO Count</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5">{total}</p>
              </div>
              <div className="flex items-end justify-between mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {l1 > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">L1: {l1}</span>}
                  {l2 > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">L2: {l2}</span>}
                  {l3 > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">L3: {l3}</span>}
                  {other > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Pending: {other}</span>}
                  {total === 0 && <span className="text-[11px] text-gray-400 font-medium">All approved</span>}
                </div>
                <div className="p-2.5 rounded-lg shrink-0 bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </div>
          );
        })()}
        <KPICard label="Pending GRN Count" value={(pos || []).filter(p => ["GRN Pending", "GRN Variance"].includes(p.status)).length} icon={Package} color="purple" sub="POs awaiting GRN" />
        <KPICard label="Out of Stock" value={outOfStock} icon={AlertTriangle} color="red" sub={outOfStock > 0 ? "Immediate attention" : "All SKUs available"} />
      </div>

      {
    /* Alert pills */
  }
      {(pendingRevisions.length > 0 || storePendingMRs.length > 0 || openPlans.length > 0) && <div className="flex flex-wrap gap-3">
          {storePendingMRs.length > 0 && <button onClick={() => window.location.hash = "material-requirements"} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-full text-[12px] font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <Bell className="w-3.5 h-3.5" />{storePendingMRs.length} MRs awaiting store review
            </button>}
          {pendingRevisions.length > 0 && <button onClick={() => window.location.hash = "planning"} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 rounded-full text-[12px] font-bold hover:bg-amber-100 transition-colors">
              <Bell className="w-3.5 h-3.5" />{pendingRevisions.length} plan revision requests pending
            </button>}
          {openPlans.length > 0 && <button onClick={() => window.location.hash = "planning"} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30 rounded-full text-[12px] font-bold hover:bg-blue-100 transition-colors">
              <Layers className="w-3.5 h-3.5" />{openPlans.length} open material plans
            </button>}
        </div>}

      {
    /* Charts */
  }
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" />Stock Distribution by Category</h3>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} interval={0} />
                <YAxis dataKey="value" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip cursor={{ fill: "transparent" }} content={({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return <div className="bg-gray-900 text-white p-3 rounded-lg text-[11px] shadow-xl border border-gray-800 min-w-[160px]">
                        <p className="font-bold mb-2 border-b border-gray-800 pb-1 text-blue-400">{data.name}</p>
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between"><span className="text-gray-400">Unique SKUs:</span><span className="font-medium text-white">{data.value.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Total Units:</span><span className="font-medium text-emerald-400">{data.stock.toLocaleString()}</span></div>
                          {data.outOfStock > 0 && <div className="flex justify-between"><span className="text-gray-400">Out of Stock:</span><span className="font-medium text-rose-400">{data.outOfStock} items</span></div>}
                        </div>
                      </div>;
    }
    return null;
  }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2"><PieIcon className="w-4 h-4 text-purple-500" />Value Concentration</h3>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
      const pct = (data.value / total * 100).toFixed(1);
      return <div className="bg-gray-900 text-white p-2.5 rounded-lg text-[11px] shadow-xl border border-gray-800">
                        <p className="font-bold mb-1.5 border-b border-gray-800 pb-1 text-purple-400">{data.name}</p>
                        <div className="space-y-1 text-[10px]">
                          <p className="flex justify-between gap-4"><span className="text-gray-400">Variety Share:</span><span className="font-medium">{pct}%</span></p>
                          <p className="flex justify-between gap-4"><span className="text-gray-400">SKU Count:</span><span className="font-medium">{data.value}</span></p>
                        </div>
                      </div>;
    }
    return null;
  }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {
    /* Quick Actions */
  }
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
    { label: "Quick Inward", sub: "Record new stock entry", icon: ArrowDownLeft, hash: "inward", cls: "hover:border-emerald-500/50", iconCls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
    { label: "Quick Outward", sub: "Record stock issuance", icon: ArrowUpRight, hash: "outward", cls: "hover:border-orange-500/50", iconCls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600" },
    { label: "Quick Transfer", sub: "Move stock between projects", icon: ArrowRightLeft, hash: "transfer-outward", cls: "hover:border-blue-500/50", iconCls: "bg-blue-50 dark:bg-blue-900/20 text-blue-500" }
  ].map(({ label, sub, icon: Icon, hash, cls, iconCls }) => <Card key={hash} className={`p-4 cursor-pointer transition-all group bg-white dark:bg-gray-800/80 border-gray-100 dark:border-gray-700/50 ${cls}`} onClick={() => window.location.hash = hash}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${iconCls} rounded-lg group-hover:scale-110 transition-transform`}><Icon className="w-5 h-5" /></div>
              <div><h4 className="text-[13px] font-bold text-gray-900 dark:text-white">{label}</h4><p className="text-[11px] text-gray-500">{sub}</p></div>
            </div>
          </Card>)}
      </div>

      {
    /* Recent POs + Alerts */
  }
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/80">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Recent Purchase Orders</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800">
                    {["PO no.", "Project", "Value", "Status"].map((h) => <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                  {pos?.slice(-5).reverse().map((po) => <tr key={po.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-gray-900 dark:text-white">{po.id}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-500 dark:text-gray-400">{po.project}</td>
                      <td className="px-4 py-3 text-[13px] font-medium text-gray-900 dark:text-white">{fmtCur(po.totalValue)}</td>
                      <td className="px-4 py-3"><StatusBadge status={po.status} accountStatus={po.accountStatus} /></td>
                    </tr>)}
                  {(!pos || pos.length === 0) && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-[13px]">No purchase orders found</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 border-l-4 border-l-red-500 dark:bg-gray-800/80 border-gray-100 dark:border-gray-700/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[13px] font-bold text-gray-900 dark:text-white">Low stock alerts</h4>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{lowStockCount} items are below reorder level.</p>
                <button onClick={() => window.location.hash = "inventory"} className="mt-2 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline">Review inventory</button>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500 dark:bg-gray-800/80 border-gray-100 dark:border-gray-700/50">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[13px] font-bold text-gray-900 dark:text-white">Pending write-offs</h4>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{pendingWriteOffs} requests awaiting approval.</p>
                <button onClick={() => window.location.hash = "write-off"} className="mt-2 text-[11px] font-bold text-orange-500 dark:text-amber-400 hover:underline">Go to approvals</button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>;
}, "AdminDashboard");
const Dashboard = /* @__PURE__ */ __name(() => {
  const {
    stats,
    pos,
    plans,
    materialRequirements,
    mrAllocations,
    planRevisions,
    quotations,
    loading,
    role,
    user,
    fetchResource,
    hasPermission,
    settings
  } = useAppStore();
  useEffect(() => {
    fetchResource("planning", 1, 500, true);
    fetchResource("material-requirements", 1, 200, true);
    fetchResource("mr-allocations", 1, 1e3, true);
    fetchResource("plan-revisions", 1, 200, true);
    fetchResource("pos", 1, 500, true);
    fetchResource("quotations", 1, 1000, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const showEngineer = hasPermission("VIEW_ENGINEER_DASHBOARD") || role === "Site Engineer";
  const showAGM = hasPermission("VIEW_AGM_DASHBOARD") || ["AGM", "Project Manager", "Head"].includes(role || "");
  const showStore = hasPermission("VIEW_STORE_DASHBOARD") || role === "Store Incharge";
  const showAdmin = hasPermission("VIEW_ADMIN_DASHBOARD") || ["Super Admin", "Director", "admin"].includes(role || "");
  const showProcurement = role === "Purchase coordinator" || role === "Inventory Manager" || role === "Accountant" || role === "manager";
  if (showAdmin) {
    return <AdminDashboard stats={stats} pos={pos} loading={loading} plans={plans} materialRequirements={materialRequirements} planRevisions={planRevisions} settings={settings} />;
  }
  if (showAGM) {
    return <AGMDashboard user={user} plans={plans} materialRequirements={materialRequirements} mrAllocations={mrAllocations} planRevisions={planRevisions} pos={pos} quotations={quotations} stats={stats} role={role} />;
  }
  if (showStore) {
    return <StoreInchargeDashboard stats={stats} materialRequirements={materialRequirements} mrAllocations={mrAllocations} pos={pos} loading={loading} />;
  }
  if (showEngineer) {
    return <SiteEngineerDashboard user={user} plans={plans} materialRequirements={materialRequirements} mrAllocations={mrAllocations} />;
  }
  if (showProcurement) {
    return <AGMDashboard user={user} plans={plans} materialRequirements={materialRequirements} mrAllocations={mrAllocations} planRevisions={planRevisions} pos={pos} quotations={quotations} stats={stats} role={role} />;
  }
  return <AdminDashboard stats={stats} pos={pos} loading={loading} plans={plans} materialRequirements={materialRequirements} planRevisions={planRevisions} settings={settings} />;
}, "Dashboard");
export {
  Dashboard
};
