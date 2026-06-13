import React from "react";
import { BarChart2 } from "lucide-react";
import { fmtCur } from "../../utils";

function buildMonthlyStats(pos) {
  const map = new Map();
  (pos || []).forEach((po) => {
    if (!po.date) return;
    const d = new Date(po.date);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    if (!map.has(key)) {
      map.set(key, { label, count: 0, total: 0, approvedCount: 0, approved: 0, pendingCount: 0, pending: 0, cancelledCount: 0, cancelled: 0 });
    }
    const s = map.get(key);
    s.count++;
    s.total += po.totalValue || 0;
    const st = po.status || "";
    if (/cancel|block/i.test(st)) { s.cancelledCount++; s.cancelled += po.totalValue || 0; }
    else if (/pending|draft/i.test(st)) { s.pendingCount++; s.pending += po.totalValue || 0; }
    else { s.approvedCount++; s.approved += po.totalValue || 0; }
  });
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([, s]) => s);
}

export function POMonthlyReport({ pos }) {
  const stats = React.useMemo(() => buildMonthlyStats(pos), [pos]);
  const summary = React.useMemo(() => {
    const count = stats.reduce((s, m) => s + m.count, 0);
    const total = stats.reduce((s, m) => s + m.total, 0);
    const approved = stats.reduce((s, m) => s + m.approved, 0);
    const pending = stats.reduce((s, m) => s + m.pending, 0);
    const cancelled = stats.reduce((s, m) => s + m.cancelled, 0);
    const peak = stats.length > 0 ? stats.reduce((a, b) => a.total > b.total ? a : b) : null;
    return { count, total, approved, pending, cancelled, peak };
  }, [stats]);

  const SUMMARY_CARDS = [
    { label: "Total POs", value: summary.count, isNum: true, color: "text-[#1A365D] dark:text-blue-400" },
    { label: "Total Amount", value: fmtCur(summary.total), color: "text-gray-900 dark:text-white" },
    { label: "Approved", value: fmtCur(summary.approved), color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Pending", value: fmtCur(summary.pending), color: "text-amber-500 dark:text-amber-400" },
    { label: "Peak Month", value: summary.peak?.label || "—", sub: summary.peak ? fmtCur(summary.peak.total) : "", color: "text-primary dark:text-orange-400" },
  ];

  return (
    <div className="border border-[#1A365D]/30 rounded-2xl overflow-hidden bg-white dark:bg-[#172030] shadow-sm">
      <div className="bg-[#1A365D] px-5 py-3 flex items-center justify-between">
        <span className="text-white font-black text-[11px] tracking-widest flex items-center gap-2">
          <BarChart2 className="w-4 h-4" /> MONTHLY PO REPORT
        </span>
        <span className="text-white/50 text-[10px]">Based on {pos.length} loaded POs</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
        {SUMMARY_CARDS.map((card, i) => (
          <div key={i} className="px-4 py-4 text-center">
            <p className="text-[9px] font-black text-gray-400 tracking-widest mb-1">{card.label}</p>
            <p className={`font-black ${card.isNum ? "text-[28px]" : "text-[15px]"} ${card.color} leading-tight`}>{card.value}</p>
            {card.sub && <p className="text-[11px] text-gray-500 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Monthly table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[10px] font-black text-gray-400 tracking-widest">
              <th className="px-5 py-3 text-left">MONTH</th>
              <th className="px-4 py-3 text-center">POs</th>
              <th className="px-4 py-3 text-right">TOTAL VALUE</th>
              <th className="px-4 py-3 text-right">APPROVED</th>
              <th className="px-4 py-3 text-right">PENDING</th>
              <th className="px-4 py-3 text-right">CANCELLED</th>
              <th className="px-4 py-3 text-right">AVG / PO</th>
              <th className="px-4 py-3 text-right pr-5">% OF TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/70 dark:divide-gray-800/70">
            {stats.map((m, i) => {
              const pct = summary.total > 0 ? (m.total / summary.total) * 100 : 0;
              return (
                <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{m.label}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/20 text-[#1A365D] dark:text-blue-400 font-black text-[11px]">{m.count}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmtCur(m.total)}</td>
                  <td className="px-4 py-3 text-right">
                    {m.approvedCount > 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtCur(m.approved)} <span className="text-[10px] text-gray-400">({m.approvedCount})</span></span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.pendingCount > 0 ? <span className="text-amber-500 font-medium">{fmtCur(m.pending)} <span className="text-[10px] text-gray-400">({m.pendingCount})</span></span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.cancelledCount > 0 ? <span className="text-red-400 font-medium">{fmtCur(m.cancelled)} <span className="text-[10px] text-gray-400">({m.cancelledCount})</span></span> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-medium">{fmtCur(m.count > 0 ? m.total / m.count : 0)}</td>
                  <td className="px-4 py-3 pr-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-[#1A365D] dark:bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {stats.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-[13px]">No PO data loaded yet.</td></tr>
            )}
          </tbody>
          {stats.length > 0 && (
            <tfoot>
              <tr className="bg-[#1A365D] text-white font-black text-[11px]">
                <td className="px-5 py-3">TOTAL</td>
                <td className="px-4 py-3 text-center">{summary.count}</td>
                <td className="px-4 py-3 text-right">{fmtCur(summary.total)}</td>
                <td className="px-4 py-3 text-right text-emerald-300">{fmtCur(summary.approved)}</td>
                <td className="px-4 py-3 text-right text-amber-300">{fmtCur(summary.pending)}</td>
                <td className="px-4 py-3 text-right text-red-300">{fmtCur(summary.cancelled)}</td>
                <td className="px-4 py-3 text-right text-white/70">{fmtCur(summary.count > 0 ? summary.total / summary.count : 0)}</td>
                <td className="px-4 py-3 pr-5 text-right text-white/70">100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
