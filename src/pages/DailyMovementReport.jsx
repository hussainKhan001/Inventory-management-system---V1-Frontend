import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Btn, StatusBadge } from "../components/ui";
import { FilterRow, SelectFilter, DateFilter } from "../components/ui/Filters";
import {
  ClipboardList, ShoppingCart, FileText, PackagePlus, ArrowUpFromLine,
  Download, ChevronDown, ChevronUp
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-hot-toast";

const today = new Date().toISOString().split("T")[0];

const fmt = (d) => {
  if (!d) return "-";
  const s = typeof d === "string" ? d : d.toISOString();
  const part = s.split("T")[0];
  const [y, m, dd] = part.split("-");
  return `${dd}/${m}/${y}`;
};

const getDatePart = (d) => {
  if (!d) return "";
  return (typeof d === "string" ? d : d.toISOString()).split("T")[0];
};

const Section = ({ title, icon: Icon, color, count, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const colorMap = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  };
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-bold text-gray-900 dark:text-white">{title}</p>
            <p className="text-[11px] text-gray-500">{count} record{count !== 1 ? "s" : ""} today</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[22px] font-black ${colorMap[color].split(" ")[2]}`}>{count}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && <div className="border-t border-gray-100 dark:border-gray-800">{children}</div>}
    </Card>
  );
};

const EmptyRow = ({ cols }) => (
  <tr>
    <td colSpan={cols} className="px-4 py-8 text-center text-[12px] text-gray-400 italic">
      No records for selected date / project
    </td>
  </tr>
);

const Th = ({ children, right }) => (
  <th className={`px-4 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider whitespace-nowrap bg-gray-50 dark:bg-gray-800/50 ${right ? "text-right" : ""}`}>
    {children}
  </th>
);

const Td = ({ children, right, mono, className = "" }) => (
  <td className={`px-4 py-2.5 text-[12px] text-gray-700 dark:text-gray-300 ${right ? "text-right" : ""} ${mono ? "font-mono" : ""} ${className}`}>
    {children}
  </td>
);

export function DailyMovementReport() {
  const {
    materialRequirements, quotations, pos, grns, transactions,
    settings, fetchResource
  } = useAppStore();

  const [date, setDate] = useState(today);
  const [project, setProject] = useState("");

  useEffect(() => {
    fetchResource("material-requirements", 1, 10000, false);
    fetchResource("quotations", 1, 10000, false);
    fetchResource("pos", 1, 10000, false);
    fetchResource("grn", 1, 10000, false);
    fetchResource("transactions", 1, 10000, false);
    fetchResource("settings");
  }, [fetchResource]);

  const projectOptions = useMemo(() =>
    (settings?.projects || [])
      .map(p => typeof p === "string" ? { value: p, label: p } : { value: p.name, label: p.name })
      .sort((a, b) => a.label.localeCompare(b.label))
  , [settings]);

  const mrMap = useMemo(() =>
    Object.fromEntries(materialRequirements.map(m => [m.id, m]))
  , [materialRequirements]);

  const filteredMRs = useMemo(() =>
    materialRequirements.filter(mr =>
      getDatePart(mr.date) === date &&
      (!project || mr.project === project)
    )
  , [materialRequirements, date, project]);

  const filteredQuotations = useMemo(() =>
    quotations.filter(q => {
      if (getDatePart(q.createdAt) !== date) return false;
      if (project) {
        const mr = mrMap[q.mrId];
        if (!mr || mr.project !== project) return false;
      }
      return true;
    })
  , [quotations, mrMap, date, project]);

  const filteredPOs = useMemo(() =>
    pos.filter(po =>
      getDatePart(po.date) === date &&
      (!project || po.project === project)
    )
  , [pos, date, project]);

  const filteredGRNs = useMemo(() =>
    grns.filter(g =>
      getDatePart(g.date) === date &&
      (!project || g.project === project)
    )
  , [grns, date, project]);

  const filteredIssues = useMemo(() =>
    transactions.filter(t =>
      ["Outward", "MR-Outward", "Public Outward"].includes(t.type) &&
      getDatePart(t.date) === date &&
      (!project || t.project === project)
    )
  , [transactions, date, project]);

  const summary = [
    { label: "MR Requests", count: filteredMRs.length, color: "blue", icon: ClipboardList },
    { label: "Quotations", count: filteredQuotations.length, color: "purple", icon: FileText },
    { label: "Purchase Orders", count: filteredPOs.length, color: "green", icon: ShoppingCart },
    { label: "GRN", count: filteredGRNs.length, color: "orange", icon: PackagePlus },
    { label: "Issues (Outward)", count: filteredIssues.length, color: "red", icon: ArrowUpFromLine },
  ];

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text(`Daily Movement Report — ${fmt(date)}${project ? `  |  Project: ${project}` : ""}`, 14, 14);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 20);

      let y = 28;

      const addSection = (title, head, body) => {
        if (y > 170) { doc.addPage(); y = 14; }
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(title, 14, y);
        y += 2;
        if (body.length === 0) {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("No records", 14, y + 4);
          y += 10;
          return;
        }
        autoTable(doc, {
          startY: y,
          head: [head],
          body,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: [60, 60, 60], fontStyle: "bold" },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 8;
      };

      addSection(
        `MR Requests (${filteredMRs.length})`,
        ["MR No.", "Date", "Project", "Requester", "Items", "Status"],
        filteredMRs.map(m => [
          m.mrNumber || m.id,
          fmt(m.date),
          m.project || "-",
          m.requesterName || "-",
          (m.items || []).length,
          m.status || "-"
        ])
      );

      addSection(
        `Quotations (${filteredQuotations.length})`,
        ["Quotation ID", "Date", "Project", "Supplier", "Amount", "Status"],
        filteredQuotations.map(q => [
          q.id,
          fmt(q.createdAt),
          mrMap[q.mrId]?.project || "-",
          q.supplierName || "-",
          q.totalAmount ? `₹${Number(q.totalAmount).toLocaleString("en-IN")}` : "-",
          q.status || "-"
        ])
      );

      addSection(
        `Purchase Orders (${filteredPOs.length})`,
        ["PO ID", "Date", "Project", "Supplier", "Status"],
        filteredPOs.map(po => [
          po.id,
          fmt(po.date),
          po.project || "-",
          po.supplier || "-",
          po.status || "-"
        ])
      );

      addSection(
        `GRN (${filteredGRNs.length})`,
        ["GRN ID", "Date", "Project", "Supplier", "Items", "Status"],
        filteredGRNs.map(g => [
          g.id,
          fmt(g.date),
          g.project || "-",
          g.vendor || g.supplier || "-",
          (g.items || []).length,
          g.status || "-"
        ])
      );

      addSection(
        `Issues / Outward (${filteredIssues.length})`,
        ["Txn ID", "Date", "Project", "Store", "Issued To", "Items"],
        filteredIssues.map(t => [
          t.id,
          fmt(t.date),
          t.project || "-",
          t.store || "-",
          t.personName || t.handoverTo || "-",
          (t.items || []).length
        ])
      );

      doc.save(`daily-movement-${date}.pdf`);
      toast.success("PDF exported");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Daily Movement Report"
          sub="MR Requests · Quotations · POs · GRN · Issues"
        />
        <Btn label="Export PDF" icon={Download} onClick={handleExportPDF} outline small />
      </div>

      <FilterRow
        showClear={!!(date !== today || project)}
        onClearAll={() => { setDate(today); setProject(""); }}
      >
        <DateFilter value={date} onChange={setDate} placeholder="Date" />
        <SelectFilter
          value={project}
          onChange={setProject}
          options={projectOptions}
          placeholder="All Projects"
          searchable
        />
      </FilterRow>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summary.map(({ label, count, color, icon: Icon }) => {
          const colorMap = {
            blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-100 dark:border-blue-800" },
            purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-100 dark:border-purple-800" },
            green: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600 dark:text-green-400", border: "border-green-100 dark:border-green-800" },
            orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-100 dark:border-orange-800" },
            red: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", border: "border-red-100 dark:border-red-800" },
          }[color];
          return (
            <Card key={label} className={`p-4 flex items-center gap-3 border ${colorMap.border}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap.bg}`}>
                <Icon className={`w-5 h-5 ${colorMap.text}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-[26px] font-black leading-none ${colorMap.text}`}>{count}</p>
                <p className="text-[10px] font-semibold text-gray-500 mt-0.5 truncate">{label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* MR Requests */}
      <Section title="MR Requests" icon={ClipboardList} color="blue" count={filteredMRs.length} defaultOpen>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>MR No.</Th>
                <Th>Date</Th>
                <Th>Project</Th>
                <Th>Requester</Th>
                <Th>Work Type</Th>
                <Th right>Items</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredMRs.length === 0 ? <EmptyRow cols={7} /> : filteredMRs.map(mr => (
                <tr key={mr.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                  <Td mono className="font-bold text-blue-600 dark:text-blue-400">{mr.mrNumber || mr.id}</Td>
                  <Td>{fmt(mr.date)}</Td>
                  <Td>{mr.project || "-"}</Td>
                  <Td>{mr.requesterName || "-"}</Td>
                  <Td>{mr.workType || "-"}</Td>
                  <Td right>{(mr.items || []).length}</Td>
                  <Td><StatusBadge status={mr.status} small /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Quotations */}
      <Section title="Quotations" icon={FileText} color="purple" count={filteredQuotations.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Quotation ID</Th>
                <Th>Date</Th>
                <Th>Project</Th>
                <Th>MR No.</Th>
                <Th>Supplier</Th>
                <Th right>Amount</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredQuotations.length === 0 ? <EmptyRow cols={7} /> : filteredQuotations.map(q => {
                const mr = mrMap[q.mrId];
                return (
                  <tr key={q.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    <Td mono className="font-bold text-purple-600 dark:text-purple-400">{q.id}</Td>
                    <Td>{fmt(q.createdAt)}</Td>
                    <Td>{mr?.project || "-"}</Td>
                    <Td mono>{mr?.mrNumber || q.mrId || "-"}</Td>
                    <Td>{q.supplierName || "-"}</Td>
                    <Td right mono>{q.totalAmount ? `₹${Number(q.totalAmount).toLocaleString("en-IN")}` : "-"}</Td>
                    <Td><StatusBadge status={q.status} small /></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Purchase Orders */}
      <Section title="Purchase Orders" icon={ShoppingCart} color="green" count={filteredPOs.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>PO ID</Th>
                <Th>Date</Th>
                <Th>Project</Th>
                <Th>Supplier</Th>
                <Th right>Items</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredPOs.length === 0 ? <EmptyRow cols={6} /> : filteredPOs.map(po => (
                <tr key={po.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                  <Td mono className="font-bold text-green-600 dark:text-green-400">{po.id}</Td>
                  <Td>{fmt(po.date)}</Td>
                  <Td>{po.project || "-"}</Td>
                  <Td>{po.supplier || "-"}</Td>
                  <Td right>{(po.items || []).length}</Td>
                  <Td><StatusBadge status={po.status} small /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* GRN */}
      <Section title="GRN (Goods Received)" icon={PackagePlus} color="orange" count={filteredGRNs.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>GRN ID</Th>
                <Th>Date</Th>
                <Th>Project</Th>
                <Th>Supplier</Th>
                <Th>Challan</Th>
                <Th right>Items</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredGRNs.length === 0 ? <EmptyRow cols={7} /> : filteredGRNs.map(g => (
                <tr key={g.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                  <Td mono className="font-bold text-orange-600 dark:text-orange-400">{g.id}</Td>
                  <Td>{fmt(g.date)}</Td>
                  <Td>{g.project || "-"}</Td>
                  <Td>{g.vendor || g.supplier || "-"}</Td>
                  <Td mono>{g.challan || "-"}</Td>
                  <Td right>{(g.items || []).length}</Td>
                  <Td><StatusBadge status={g.status} small /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Issues / Outward */}
      <Section title="Issues (Outward)" icon={ArrowUpFromLine} color="red" count={filteredIssues.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Txn ID</Th>
                <Th>Date</Th>
                <Th>Project</Th>
                <Th>Store</Th>
                <Th>Issued To</Th>
                <Th>MR No.</Th>
                <Th right>Items</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredIssues.length === 0 ? <EmptyRow cols={7} /> : filteredIssues.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                  <Td mono className="font-bold text-red-600 dark:text-red-400">{t.id}</Td>
                  <Td>{fmt(t.date)}</Td>
                  <Td>{t.project || "-"}</Td>
                  <Td>{t.store || "-"}</Td>
                  <Td>{t.personName || t.handoverTo || "-"}</Td>
                  <Td mono>{t.mrNo || "-"}</Td>
                  <Td right>{(t.items || []).length || (t.sku ? 1 : 0)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
