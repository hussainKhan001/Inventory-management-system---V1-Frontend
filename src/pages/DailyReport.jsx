var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Btn, Skeleton, CustomDropdown } from "../components/ui";
import { DateRangePicker } from "../components/ui/DateRangePicker";
import { Download, ArrowDownLeft, ArrowUpRight, Package, Search, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-hot-toast";
import { TableVirtuoso } from "react-virtuoso";


const DailyReport = /* @__PURE__ */ __name(() => {
  const { transactions, inventory, settings, fetchResource, loading } = useAppStore();

  const [dateRange, setDateRange]           = useState({ start: "", end: "" });
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [projectFilter, setProjectFilter]   = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const dateFrom = dateRange.start || "";
  const dateTo   = dateRange.end   || dateFrom;

  useEffect(() => {
    fetchResource("transactions", 1, 1e4, false, "", null, false, false);
    fetchResource("inventory", 1, 1e4, true);
  }, [fetchResource]);

  // Close suggestion dropdown on outside click
  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const inwardTypes  = ["Inward", "Inward Return", "Public Inward", "Public Inward Return", "Transfer Inward", "Public Transfer Inward", "GRN"];
  const outwardTypes = ["Outward", "Outward Return", "Public Outward", "Public Outward Return", "Transfer Outward", "Public Transfer Outward"];

  // Running balance per SKU per date — walk all transactions oldest-first from openingStock
  const closingBalance = useMemo(() => {
    const inward  = ["Inward", "Inward Return", "Public Inward", "Public Inward Return", "Transfer Inward", "Public Transfer Inward", "GRN"];
    const outward = ["Outward", "Outward Return", "Public Outward", "Public Outward Return", "Transfer Outward", "Public Transfer Outward"];
    const sorted  = [...transactions].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const skuBal  = {};  // running balance per SKU
    const result  = {};  // sku → { date → closing balance }
    for (const trx of sorted) {
      const d = trx.date?.split("T")[0];
      if (!d) continue;
      const items = trx.items?.length > 0
        ? trx.items
        : trx.sku ? [{ sku: trx.sku, qty: trx.qty || 0 }] : [];
      for (const item of items) {
        if (!item.sku) continue;
        if (skuBal[item.sku] === undefined) {
          const inv = inventory.find((i) => i.sku === item.sku);
          skuBal[item.sku] = inv?.openingStock || 0;
        }
        if (!result[item.sku]) result[item.sku] = {};
        if (inward.includes(trx.type))       skuBal[item.sku] += item.qty || 0;
        else if (outward.includes(trx.type)) skuBal[item.sku] -= item.qty || 0;
        result[item.sku][d] = skuBal[item.sku];
      }
    }
    return result;
  }, [transactions, inventory]);

  // Group by date → project+SKU key (so same SKU across different projects stays separate)
  const byDate = useMemo(() => {
    const dateMap = {};
    transactions.forEach((trx) => {
      if (!trx.date) return;
      const trxDate = trx.date.split("T")[0];
      if (dateFrom && trxDate < dateFrom) return;
      if (dateTo   && trxDate > dateTo)   return;
      const trxProject = trx.project || trx.destinationProject || "";
      if (projectFilter && trxProject !== projectFilter) return;

      const items = trx.items?.length > 0
        ? trx.items
        : trx.sku
          ? [{ sku: trx.sku, itemName: trx.itemName || "N/A", qty: trx.qty || 0, unit: trx.unit || "N/A", category: trx.category }]
          : [];

      items.forEach((item) => {
        if (!item.sku) return;
        const rowKey = `${item.sku}||${trxProject}`;
        if (!dateMap[trxDate]) dateMap[trxDate] = {};
        if (!dateMap[trxDate][rowKey]) {
          const invItem = inventory.find((i) => i.sku === item.sku);
          dateMap[trxDate][rowKey] = {
            sku:      item.sku,
            itemName: item.itemName || invItem?.itemName || "N/A",
            unit:     item.unit     || invItem?.unit     || "N/A",
            in: 0, out: 0,
            final:    closingBalance[item.sku]?.[trxDate] ?? invItem?.liveStock ?? 0,
            category: item.category || invItem?.category || "N/A",
            project:  trxProject,
            lastTxnTime: trx.date || ""
          };
        }
        if (inwardTypes.includes(trx.type))       dateMap[trxDate][rowKey].in  += item.qty;
        else if (outwardTypes.includes(trx.type)) dateMap[trxDate][rowKey].out += item.qty;
        if (trx.date > dateMap[trxDate][rowKey].lastTxnTime) dateMap[trxDate][rowKey].lastTxnTime = trx.date;
      });
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, rowMap]) => ({
        date,
        items: Object.values(rowMap)
          .filter(r => r.in > 0 || r.out > 0)
          .sort((a, b) => b.in + b.out - (a.in + a.out))
      }))
      .filter(g => g.items.length > 0);
  }, [transactions, inventory, closingBalance, dateFrom, dateTo, projectFilter]);

  // reportData = flat list for KPI totals
  const reportData = useMemo(() =>
    byDate.flatMap(g => g.items), [byDate]);

  // Search suggestions — from inventory, matching SKU or item name
  const suggestions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return inventory
      .filter(i => i.sku && (
        i.sku.toLowerCase().includes(q) || (i.itemName || "").toLowerCase().includes(q)
      ))
      .slice(0, 8);
  }, [inventory, search]);

  // Flat virtualized rows: date-header rows + item rows
  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = [];
    byDate.forEach(group => {
      const matchedItems = group.items.filter(row => {
        if (categoryFilter && row.category !== categoryFilter) return false;
        if (!q) return true;
        return (
          row.sku.toLowerCase().includes(q) ||
          row.itemName.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q) ||
          (row.project || "").toLowerCase().includes(q)
        );
      });
      if (matchedItems.length === 0) return;
      matchedItems.forEach(item => rows.push({ _type: "item", date: group.date, ...item }));
    });
    return rows;
  }, [byDate, search, categoryFilter]);

  // Category options for CustomDropdown
  const categoryOptions = useMemo(() => {
    const cats = settings?.categories?.length
      ? settings.categories
      : [...new Set(reportData.map(r => r.category).filter(Boolean))].sort();
    return [{ value: "", label: "All Categories" }, ...cats.map(c => ({ value: c, label: c }))];
  }, [settings, reportData]);

  // Project options — from settings.projects or from transactions
  const projectOptions = useMemo(() => {
    const projs = settings?.projects?.length
      ? settings.projects
      : [...new Set(transactions.map(t => t.project || t.destinationProject).filter(Boolean))].sort();
    return [{ value: "", label: "All Projects" }, ...projs.map(p => ({ value: p, label: p }))];
  }, [settings, transactions]);

  const dateLabel = dateFrom ? (dateFrom !== dateTo ? `${dateFrom} → ${dateTo}` : dateFrom) : "all dates";

  const downloadPDF = /* @__PURE__ */ __name(() => {
    if (filteredData.length === 0) { toast.error("No data to export"); return; }
    let doc;
    try {
      const jsPDFClass = typeof jsPDF === "function" ? jsPDF : jsPDF.jsPDF || jsPDF.default;
      if (!jsPDFClass || typeof jsPDFClass !== "function") throw new Error("jsPDF constructor not found");
      doc = new jsPDFClass();
    } catch (e) {
      toast.error("Failed to load PDF generator");
      return;
    }
    doc.setFontSize(20);
    doc.text(projectFilter ? `Project Report — ${projectFilter}` : "Daily Movement Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${dateLabel}`, 14, 32);
    if (projectFilter) doc.text(`Project: ${projectFilter}`, 14, 38);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, projectFilter ? 44 : 38);
    const filterParts = [
      search && `Search: "${search}"`,
      categoryFilter && `Category: ${categoryFilter}`,
    ].filter(Boolean);
    let yBase = projectFilter ? 50 : 44;
    if (filterParts.length) {
      doc.text(`Filters: ${filterParts.join(" | ")}`, 14, yBase);
      yBase += 8;
    }
    const itemRows = filteredData.filter(r => r._type === "item");
    const totalIn  = itemRows.reduce((s, i) => s + i.in,  0);
    const totalOut = itemRows.reduce((s, i) => s + i.out, 0);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Inward: ${totalIn.toLocaleString()}`,   14,  yBase);
    doc.text(`Total Outward: ${totalOut.toLocaleString()}`, 70,  yBase);
    doc.text(`Items: ${itemRows.length}`,                   140, yBase);
    const showProjectCol = !projectFilter;
    autoTable(doc, {
      startY: yBase + 8,
      head: [showProjectCol
        ? ["Date", "Project", "Item Name", "Category", "Inward", "Outward", "Live Stock"]
        : ["Date", "Item Name", "Category", "Inward", "Outward", "Live Stock"]
      ],
      body: itemRows.map((row) => {
        const dateStr = new Date(row.lastTxnTime || row.date + "T00:00:00")
          .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const base = [
          dateStr, row.itemName, row.category,
          `+${row.in} ${row.unit}`,
          row.out > 0 ? `-${row.out} ${row.unit}` : `0 ${row.unit}`,
          `${row.final} ${row.unit}`
        ];
        return showProjectCol ? [dateStr, row.project || "—", row.itemName, row.category,
          `+${row.in} ${row.unit}`,
          row.out > 0 ? `-${row.out} ${row.unit}` : `0 ${row.unit}`,
          `${row.final} ${row.unit}`] : base;
      }),
      theme: "striped",
      headStyles: { fillColor: [26, 26, 46] },
      columnStyles: showProjectCol ? { 1: { cellWidth: 35 } } : {}
    });
    const suffix = projectFilter ? `_${projectFilter.replace(/\s+/g, "_")}` : "";
    doc.save(`Daily_Report${suffix}_${dateFrom || "all"}${dateFrom && dateFrom !== dateTo ? "_to_" + dateTo : ""}.pdf`);
  }, "downloadPDF");

  const hdrCls = "px-4 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider sticky top-0 z-10 sticky-th";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={projectFilter ? `Daily Report — ${projectFilter}` : "Daily Report"}
          sub={projectFilter ? `Showing movements for project: ${projectFilter}` : "Track daily item inflows, outflows and closing stock"}
        />
        <Btn label="Download PDF" icon={Download} onClick={downloadPDF} disabled={filteredData.length === 0} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">

        {/* Search with suggestions */}
        <div ref={searchRef} className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search by SKU, item name or category…"
            className="w-full pl-10 pr-8 py-2 bg-white dark:bg-[#0B1120]/50 border border-gray-200/50 dark:border-gray-800/80 rounded-2xl h-[44px] text-[13px] text-gray-900 dark:text-[#E2E8F0] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setShowSuggestions(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}

          {/* Suggestion dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-xl dark:shadow-black/60 overflow-hidden">
              {suggestions.map((item) => (
                <button
                  key={item.sku}
                  type="button"
                  onClick={() => { setSearch(item.itemName || item.sku); setShowSuggestions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors"
                >
                  <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg shrink-0">
                    <Package className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate">{item.itemName}</p>
                    <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{item.sku}</p>
                  </div>
                  {item.category && (
                    <span className="ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      {item.category}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project filter */}
        <div className="min-w-[180px]">
          <CustomDropdown
            options={projectOptions}
            value={projectFilter}
            onChange={setProjectFilter}
            placeholder="All Projects"
          />
        </div>

        {/* Category — CustomDropdown */}
        <div className="min-w-[180px]">
          <CustomDropdown
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All Categories"
          />
        </div>

        {/* Date range picker */}
        <DateRangePicker
          value={dateRange}
          onChange={(val) => setDateRange({ start: val.start || "", end: val.end || "" })}
        />

      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl shrink-0">
            <ArrowDownLeft className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 tracking-widest truncate">Total Inward</p>
            <p className="text-xl font-black text-gray-900 dark:text-white truncate">
              {filteredData.filter(r => r._type === "item").reduce((s, i) => s + i.in, 0).toLocaleString()}
              <span className="text-[10px] font-normal text-gray-400 ml-1">Qty</span>
            </p>
          </div>
        </Card>
        <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl shrink-0">
            <ArrowUpRight className="w-6 h-6 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 tracking-widest truncate">Total Outward</p>
            <p className="text-xl font-black text-gray-900 dark:text-white truncate">
              {filteredData.filter(r => r._type === "item").reduce((s, i) => s + i.out, 0).toLocaleString()}
              <span className="text-[10px] font-normal text-gray-400 ml-1">Qty</span>
            </p>
          </div>
        </Card>
        <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl shrink-0">
            <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 tracking-widest truncate">Items Moved</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">
              {filteredData.filter(r => r._type === "item").length}
            </p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-[620px] flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 relative">
          {filteredData.length > 0 ? (
            <TableVirtuoso
              data={filteredData}
              style={{ height: "100%", width: "100%" }}
              components={{
                Table: /* @__PURE__ */ __name((props) => (
                  <table {...props} className="w-full text-left text-[13px] border-collapse" />
                ), "Table"),
                TableRow: /* @__PURE__ */ __name((props) => (
                  <tr {...props} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors divide-x divide-gray-100 dark:divide-gray-800" />
                ), "TableRow"),
                TableHead: React.forwardRef((props, ref) => (
                  <thead {...props} ref={ref} className="z-10" />
                )),
              }}
              fixedHeaderContent={() => (
                <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800">
                  <th className={`${hdrCls} md:hidden`}>Movement Details</th>
                  <th className={`${hdrCls} hidden md:table-cell`}>Date</th>
                  <th className={`${hdrCls} hidden md:table-cell`}>Item Name</th>
                  {!projectFilter && <th className={`${hdrCls} hidden md:table-cell`}>Project</th>}
                  <th className={`${hdrCls} hidden md:table-cell`}>Category</th>
                  <th className={`${hdrCls} hidden md:table-cell text-right text-green-600 dark:text-green-400`}>Inward</th>
                  <th className={`${hdrCls} hidden md:table-cell text-right text-blue-500 dark:text-blue-400`}>Outward</th>
                  <th className={`${hdrCls} hidden md:table-cell text-right`}>Live Stock</th>
                </tr>
              )}
              itemContent={(_index, row) => {
                return (
                  <>
                    {/* Mobile card */}
                    <td className="w-full md:w-auto block md:table-cell p-0 md:p-0">
                      <div className="md:hidden p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">{row.itemName}</p>
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5">{row.sku}</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-1">{row.category}</p>
                            {row.project && (
                              <span className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                {row.project}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-[14px] font-black text-gray-900 dark:text-white">{row.final}</p>
                            <p className="text-[9px] font-bold text-gray-400">Live Stock</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                          <div className="bg-green-50/50 dark:bg-green-900/10 p-2 rounded-lg">
                            <p className="text-[9px] font-bold text-green-600 dark:text-green-500 mb-1 flex items-center gap-1">
                              <ArrowDownLeft className="w-3 h-3" /> Inward
                            </p>
                            <p className="text-[13px] font-black text-green-700 dark:text-green-400">+{row.in} <span className="text-[10px] font-normal opacity-70">{row.unit}</span></p>
                          </div>
                          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-lg">
                            <p className="text-[9px] font-bold text-blue-500 dark:text-blue-500 mb-1 flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3" /> Outward
                            </p>
                            <p className="text-[13px] font-black text-blue-700 dark:text-blue-400">-{row.out} <span className="text-[10px] font-normal opacity-70">{row.unit}</span></p>
                          </div>
                        </div>
                      </div>
                      {/* Desktop: Date */}
                      <div className="hidden md:block px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        {(() => {
                          const d = new Date(row.lastTxnTime || row.date + "T00:00:00");
                          const datePart = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                          const timePart = row.lastTxnTime
                            ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                            : null;
                          return <>
                            <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">{datePart}</p>
                            {timePart && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{timePart}</p>}
                          </>;
                        })()}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="font-bold text-gray-900 dark:text-white">{row.itemName}</p>
                      <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{row.sku}</p>
                    </td>
                    {!projectFilter && (
                      <td className="hidden md:table-cell px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        {row.project ? (
                          <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 max-w-[160px] truncate" title={row.project}>
                            {row.project}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </td>
                    )}
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 text-[11px]">{row.category}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 border-b border-gray-100 dark:border-gray-800">
                      {row.in > 0 ? `+${row.in}` : "0"} <span className="text-[10px] font-normal text-gray-400">{row.unit}</span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right font-bold text-blue-500 dark:text-blue-400 border-b border-gray-100 dark:border-gray-800">
                      {row.out > 0 ? `-${row.out}` : "0"} <span className="text-[10px] font-normal text-gray-400">{row.unit}</span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right font-black text-gray-900 dark:text-white bg-gray-50/30 dark:bg-gray-800/10 border-b border-gray-100 dark:border-gray-800">
                      {row.final} <span className="text-[10px] font-normal text-gray-400">{row.unit}</span>
                    </td>
                  </>
                );
              }}
            />
          ) : (
            <div className="h-full flex flex-col">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider">Date</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider">Item Name</th>
                    {!projectFilter && <th className="px-4 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider">Project</th>}
                    <th className="px-4 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider">Category</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-right">Inward</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-right">Outward</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-right">Live Stock</th>
                  </tr>
                </thead>
              </table>
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-full mb-4">
                  <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-1 text-sm">
                  {search || categoryFilter ? "No results match your filters" : "No Movements Recorded"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {`No inward or outward transactions for ${dateLabel}.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 z-20">
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}, "DailyReport");

export { DailyReport };
