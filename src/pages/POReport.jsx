var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, KPICard, StatusBadge } from "../components/ui";
import { TrendingUp, Package, CheckCircle, Clock, XCircle, IndianRupee, FileText, Printer } from "lucide-react";
import { fmtCur, formatDate } from "../utils";
import { SelectFilter, FilterRow, SearchFilter, DateRangePicker } from "../components/ui/Filters";
const POReport = /* @__PURE__ */ __name(() => {
  const { pos, fetchResource, settings, suppliers } = useAppStore();
  const PROJECTS = settings.projects || [];
  const COMPANIES = settings.companies?.length ? settings.companies : [
    { name: "GLR Real Estate Private Limited" },
    { name: "Neoteric Housing India LLP" },
    { name: "Heaven Heights Private Limited" },
    { name: "Gravity Infrastructures Private Limited" },
    { name: "RLG Care Foundation" },
    { name: "Swastik Grah Nirman Company" },
    { name: "Neoteric Recreational And Hospitality" }
  ];
  const companyOptions = COMPANIES.map((c) => c.name);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  useEffect(() => {
    fetchResource("pos", 1, 2e3, true);
    if (!suppliers.length) fetchResource("suppliers", 1, 1e3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  const supplierOptions = React.useMemo(() => {
    const optionsMap = /* @__PURE__ */ new Map();
    suppliers.forEach((s) => {
      const label = s.companyName || s.name || s.id;
      if (label) optionsMap.set(s.id, label);
    });
    (pos || []).forEach((po) => {
      if (po.supplier && !optionsMap.has(po.supplier)) {
        optionsMap.set(po.supplier, po.supplier);
      }
    });
    return Array.from(optionsMap.entries()).map(([value, label]) => ({ label, value })).sort((a, b) => a.label.localeCompare(b.label));
  }, [suppliers, pos]);
  const statusOptions = React.useMemo(() => [
    { label: "Pending L1", value: "Pending L1" },
    { label: "Pending L2", value: "Pending L2" },
    { label: "Pending L3", value: "Pending L3" },
    { label: "Approved", value: "Approved" },
    { label: "GRN Pending", value: "GRN Pending" },
    { label: "GRN Fulfilled", value: "GRN Fulfilled" },
    { label: "Ready for Payment", value: "Ready for Payment" },
    { label: "paid", value: "paid" },
    { label: "rejected", value: "rejected" }
  ], []);
  const filtered = React.useMemo(() => {
    return (pos || []).filter((po) => {
      if (!po.date) return false;
      const d = new Date(po.date).getTime();
      if (isNaN(d)) return false;
      if (startDate) {
        const s = new Date(startDate).getTime();
        if (d < s) return false;
      }
      if (endDate) {
        const e = new Date(endDate).getTime();
        if (d > e + 864e5) return false;
      }
      if (filterProject && po.project !== filterProject) return false;
      if (filterCompany && po.companyName !== filterCompany) return false;
      if (filterSupplier && po.supplier !== filterSupplier) return false;
      if (filterStatus && po.status !== filterStatus) return false;
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const sName = suppliers.find((s) => s.id === po.supplier || s._id === po.supplier);
        const supplierName = sName ? sName.companyName || sName.name || "" : po.supplier || "";
        const match = (po.id || "").toLowerCase().includes(term) || (po.project || "").toLowerCase().includes(term) || supplierName.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [pos, startDate, endDate, filterProject, filterCompany, filterSupplier, filterStatus, debouncedSearch, suppliers]);
  const summary = React.useMemo(() => {
    const count = filtered.length;
    const total = filtered.reduce((s, p) => s + (p.totalValue || 0), 0);
    const approved = filtered.filter((p) => !/pending|draft|cancel|block/i.test(p.status || "")).reduce((s, p) => s + (p.totalValue || 0), 0);
    const pending = filtered.filter((p) => /pending|draft/i.test(p.status || "")).reduce((s, p) => s + (p.totalValue || 0), 0);
    const cancelled = filtered.filter((p) => /cancel|block/i.test(p.status || "")).reduce((s, p) => s + (p.totalValue || 0), 0);
    const avg = count > 0 ? total / count : 0;
    return { count, total, approved, pending, cancelled, avg };
  }, [filtered]);
  const printedAt = (/* @__PURE__ */ new Date()).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const dateRangeLabel = startDate && endDate ? `${formatDate(startDate)} \u2013 ${formatDate(endDate)}` : startDate ? `From ${formatDate(startDate)}` : endDate ? `Until ${formatDate(endDate)}` : "All Dates";
  return <div className="space-y-6">
      {
    /* ── Print isolation styles ── */
  }
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @media print {
          @page { size: A4 portrait; margin: 14mm 12mm; }
          body > * { visibility: hidden !important; }
          #po-report-print-area,
          #po-report-print-area * { visibility: visible !important; }
          #po-report-print-area {
            position: fixed;
            inset: 0;
            width: 100%;
            height: auto;
            overflow: visible;
            background: #fff;
            font-family: 'Poppins', sans-serif;
            color: #000 !important;
          }
          #po-report-print-area * { color: #000 !important; font-family: 'Poppins', sans-serif; }
          .po-print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            font-family: 'Poppins', sans-serif;
            page-break-inside: auto;
          }
          .po-print-table tr { page-break-inside: avoid; page-break-after: auto; }
          .po-print-table thead { display: table-header-group; }
          .po-print-table tfoot { display: table-footer-group; }
          .po-print-table th,
          .po-print-table td {
            border: 1px solid #555;
            padding: 4px 6px;
            color: #000 !important;
          }
          .po-print-table thead tr { background: #e0e0e0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .po-print-table thead th { font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
          .po-print-table tbody tr:nth-child(even) { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .po-print-table tfoot td { border-top: 2px solid #000; font-weight: 700; background: #e0e0e0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .po-print-summary th { background: #e0e0e0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <PageHeader
    title="PO Report"
    sub="Monthly and project-wise Purchase Order analytics"
    actions={<button
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-colors print:hidden"
    >
            <Printer className="w-4 h-4" />
            Print Report
          </button>}
  />

      {
    /* Filters (screen only) */
  }
      <div className="print:hidden">
        <FilterRow
    showClear={!!(search || startDate || endDate || filterProject || filterCompany || filterSupplier || filterStatus)}
    onClearAll={() => {
      setSearch("");
      setStartDate("");
      setEndDate("");
      setFilterProject("");
      setFilterCompany("");
      setFilterSupplier("");
      setFilterStatus("");
    }}
  >
          <SearchFilter value={search} onChange={setSearch} placeholder="Search POs..." className="flex-1 min-w-[200px]" />
          <DateRangePicker value={{ start: startDate, end: endDate }} onChange={(v) => {
    setStartDate(v.start);
    setEndDate(v.end);
  }} />
          <SelectFilter value={filterProject} onChange={setFilterProject} options={PROJECTS} placeholder="All Projects" />
          <SelectFilter value={filterCompany} onChange={setFilterCompany} options={companyOptions} placeholder="All Companies" />
          <SelectFilter value={filterSupplier} onChange={setFilterSupplier} options={supplierOptions} placeholder="All Suppliers" />
          <SelectFilter value={filterStatus} onChange={setFilterStatus} options={statusOptions} placeholder="All Statuses" />
        </FilterRow>
      </div>

      {
    /* Summary Cards (screen only) */
  }
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
        <KPICard label="Total POs" value={summary.count} icon={Package} color="blue" sub="Total number of POs" />
        <KPICard label="Total Value" value={fmtCur(summary.total)} icon={IndianRupee} color="gray" sub="Overall PO value" />
        <KPICard label="Approved" value={fmtCur(summary.approved)} icon={CheckCircle} color="green" sub="Value of approved POs" />
        <KPICard label="Pending" value={fmtCur(summary.pending)} icon={Clock} color="orange" sub="Value awaiting approval" />
        <KPICard label="Cancelled" value={fmtCur(summary.cancelled)} icon={XCircle} color="red" sub="Value of cancelled POs" />
        <KPICard label="Avg / PO" value={fmtCur(summary.avg)} icon={TrendingUp} color="purple" sub="Average value per PO" />
      </div>

      {
    /* ════════════════════════════════════════════
       PRINT AREA — only this renders on paper
       ════════════════════════════════════════════ */
  }
      <div id="po-report-print-area">

        {
    /* Document Header (print only) */
  }
        <div className="hidden print:block mb-5" style={{ fontFamily: "'Poppins', sans-serif", color: "#000" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "10px" }}>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "700", color: "#000" }}>PO Report</div>
              <div style={{ fontSize: "10px", color: "#000", marginTop: "2px" }}>Purchase Order Analytics — {dateRangeLabel}</div>
              {(filterProject || filterSupplier || filterStatus) && <div style={{ fontSize: "9px", color: "#000", marginTop: "2px" }}>
                  Filters:{filterProject ? ` Project: ${filterProject}` : ""}{filterSupplier ? ` \xB7 Supplier: ${filterSupplier}` : ""}{filterStatus ? ` \xB7 Status: ${filterStatus}` : ""}
                </div>}
            </div>
            <div style={{ textAlign: "right", fontSize: "10px", color: "#000" }}>
              <div style={{ fontWeight: "700", fontSize: "12px", color: "#000" }}>Garden City</div>
              <div style={{ color: "#000" }}>Printed: {printedAt}</div>
              <div style={{ color: "#000" }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {
    /* Summary row */
  }
          <table className="po-print-summary" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px", fontSize: "10px", fontFamily: "'Poppins', sans-serif" }}>
            <thead>
              <tr>
                {["Total POs", "Total Value", "Approved", "Pending", "Cancelled", "Avg / PO"].map((label) => <th key={label} style={{ border: "1px solid #555", padding: "5px 8px", background: "#e0e0e0", fontWeight: "700", textAlign: "center", width: "16.6%", color: "#000" }}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[String(summary.count), fmtCur(summary.total), fmtCur(summary.approved), fmtCur(summary.pending), fmtCur(summary.cancelled), fmtCur(summary.avg)].map((val, i) => <td key={i} style={{ border: "1px solid #555", padding: "5px 8px", textAlign: "center", fontWeight: "600", color: "#000" }}>{val}</td>)}
              </tr>
            </tbody>
          </table>
        </div>

        {
    /* ── Main PO Table ── */
  }
        <div className="print:hidden">
          <Card className="p-0 overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-transparent flex items-center justify-between">
              <span className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Purchase Orders
              </span>
              <span className="text-[12px] font-medium text-gray-500">
                {filtered.length} {filtered.length === 1 ? "record" : "records"}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">PO No.</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Value</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.map((po, i) => {
    const supplier = suppliers.find((s) => s.id === po.supplier || s._id === po.supplier);
    const sName = supplier ? supplier.companyName || supplier.name : po.supplier || "NA";
    return <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3 text-[12px] text-gray-400">{i + 1}</td>
                        <td className="px-5 py-3 text-[13px] font-semibold text-gray-900 dark:text-white">{po.id}</td>
                        <td className="px-4 py-3 text-[13px] text-gray-600 dark:text-gray-300">{formatDate(po.date)}</td>
                        <td className="px-4 py-3 text-[13px] text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title={sName}>{sName}</td>
                        <td className="px-4 py-3 text-[13px] text-gray-600 dark:text-gray-300 capitalize truncate max-w-[150px]" title={po.project}>{po.project}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-gray-900 dark:text-white text-right">{fmtCur(po.totalValue || 0)}</td>
                        <td className="px-5 py-3"><StatusBadge status={po.status} accountStatus={po.accountStatus} /></td>
                      </tr>;
  })}
                  {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-[13px]">No purchase orders found for the selected filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {
    /* Print-only table (clean document format) */
  }
        <table className="po-print-table hidden print:table" style={{ fontFamily: "'Poppins', sans-serif", color: "#000" }}>
          <thead>
            <tr>
              <th style={{ width: "28px", textAlign: "center", color: "#000" }}>#</th>
              <th style={{ width: "105px", color: "#000" }}>PO No.</th>
              <th style={{ width: "75px", color: "#000" }}>Date</th>
              <th style={{ color: "#000" }}>Supplier</th>
              <th style={{ color: "#000" }}>Project</th>
              <th style={{ width: "85px", textAlign: "right", color: "#000" }}>Value (₹)</th>
              <th style={{ width: "95px", color: "#000" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((po, i) => {
    const supplier = suppliers.find((s) => s.id === po.supplier || s._id === po.supplier);
    const sName = supplier ? supplier.companyName || supplier.name : po.supplier || "NA";
    return <tr key={i}>
                  <td style={{ textAlign: "center", color: "#000" }}>{i + 1}</td>
                  <td style={{ fontWeight: "600", color: "#000" }}>{po.id}</td>
                  <td style={{ color: "#000" }}>{formatDate(po.date)}</td>
                  <td style={{ color: "#000" }}>{sName}</td>
                  <td style={{ color: "#000" }}>{po.project || "\u2014"}</td>
                  <td style={{ textAlign: "right", color: "#000" }}>{fmtCur(po.totalValue || 0)}</td>
                  <td style={{ color: "#000" }}>{po.status || "\u2014"}</td>
                </tr>;
  })}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: "16px", color: "#000" }}>No records found.</td></tr>}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ textAlign: "right", fontWeight: "700", fontSize: "10px", color: "#000" }}>Total ({filtered.length} PO{filtered.length !== 1 ? "s" : ""})</td>
              <td style={{ textAlign: "right", fontWeight: "700", color: "#000" }}>{fmtCur(summary.total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>

      </div>{
    /* end #po-report-print-area */
  }
    </div>;
}, "POReport");
export {
  POReport
};
