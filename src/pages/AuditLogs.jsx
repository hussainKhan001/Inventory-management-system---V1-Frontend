import React, { useEffect, useState, useRef } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Modal, Btn } from "../components/ui";
import { FilterRow, SearchFilter, SelectFilter, DateRangePicker } from "../components/ui/Filters";
import { FileText, Clock, User, Activity, Database, Download, ArrowRight, Info } from "lucide-react";
import { TableVirtuoso } from "react-virtuoso";

const VirtuosoTable = (props) => <table {...props} className="w-full text-left" />;
const VirtuosoTableBody = React.forwardRef((props, ref) => (
  <tbody {...props} ref={ref} className="divide-y divide-gray-100 dark:divide-gray-800" />
));

// ── Helpers ───────────────────────────────────────────────────────────────

const ACTION_COLORS = {
  LOGIN:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  LOGOUT:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CREATE:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DELETE:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REJECT:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  APPROVE:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCEL:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};
const actionColor = (a) => ACTION_COLORS[a] || "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

const fmtField = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();

const fmtVal = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// Fields that are internal / noise and shouldn't be shown in changedFields list
const SKIP_FIELDS = new Set(["_id", "__v", "updatedAt", "createdAt", "auditTrail", "id"]);

// ── Sub-components for the modal ──────────────────────────────────────────

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide shrink-0 sm:w-36">
      {label}
    </span>
    <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 break-words">
      {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
    </span>
  </div>
);

const ChangeRow = ({ change }) => (
  <div className="bg-white dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
      {fmtField(change.field)}
    </p>
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
      <span
        className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-[12px] line-through break-all flex-1 truncate"
        title={fmtVal(change.oldValue)}
      >
        {fmtVal(change.oldValue)}
      </span>
      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
      <span
        className="px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-[12px] font-bold break-all flex-1 truncate"
        title={fmtVal(change.newValue)}
      >
        {fmtVal(change.newValue)}
      </span>
    </div>
  </div>
);

const PREVIEW_COUNT = 8;

const ActivityModal = ({ log, onClose }) => {
  const [showAllFields, setShowAllFields] = useState(false);

  // Filter readable extra details (skip entityType/entityId/changes/summary — shown elsewhere)
  const SKIP_DETAIL_KEYS = new Set(["entityType", "entityId", "changes", "summary"]);
  const details = log.details ? Object.entries(log.details).filter(([k]) => !SKIP_DETAIL_KEYS.has(k)) : [];

  // changedFields: old-format list of field names (just names, no old/new values)
  const changedFieldsList = (() => {
    const cf = log.details?.changedFields;
    if (!Array.isArray(cf)) return null;
    return cf.filter((f) => typeof f === "string" && !SKIP_FIELDS.has(f));
  })();

  const otherDetails = details.filter(([k]) => k !== "changedFields");

  return (
    <Modal
      title="Activity Details"
      onClose={onClose}
      wide
      footer={
        <div className="flex justify-end w-full">
          <Btn label="Close" outline onClick={onClose} />
        </div>
      }
    >
      <div className="overflow-y-auto max-h-[65vh] space-y-4 pr-1">

        {/* ── Header: action + entity + who + when ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${actionColor(log.action)}`}>
            {log.action}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-snug">
              {log.resource}
              {log.resourceId && (
                <span className="text-[11px] text-gray-400 font-mono ml-2">#{log.resourceId}</span>
              )}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              by{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{log.userName}</span>
              {log.userEmail && (
                <span className="text-gray-400 ml-1">({log.userEmail})</span>
              )}
              {" · "}
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Summary (if available) ── */}
        {log.summary && (
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-[13px] text-blue-700 dark:text-blue-300 font-medium">{log.summary}</p>
          </div>
        )}

        {/* ── Field-level changes: old→new values ── */}
        {log.changes?.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              What Changed ({log.changes.length})
            </p>
            <div className="space-y-2">
              {log.changes.map((c, i) => <ChangeRow key={i} change={c} />)}
            </div>
          </div>
        )}

        {/* ── Also-modified: complex fields that couldn't be diffed (items, nested objects) ── */}
        {(() => {
          const diffedKeys = new Set((log.changes || []).map((c) => c.field));
          const remaining = (changedFieldsList || []).filter((f) => !diffedKeys.has(f));
          if (!remaining.length) return null;
          return (
            <div>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {log.changes?.length ? "Also Modified" : `Modified Fields (${remaining.length})`}
              </p>
              <div className="bg-white dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(showAllFields ? remaining : remaining.slice(0, PREVIEW_COUNT)).map((f) => (
                    <span key={f} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-[12px] font-medium">
                      {fmtField(f)}
                    </span>
                  ))}
                </div>
                {remaining.length > PREVIEW_COUNT && (
                  <button
                    onClick={() => setShowAllFields((v) => !v)}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    {showAllFields ? "Show less" : `+ ${remaining.length - PREVIEW_COUNT} more`}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Additional details (other key-value pairs) ── */}
        {otherDetails.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Additional Info
            </p>
            <div className="bg-white dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-1">
              {otherDetails.map(([k, v]) => (
                <DetailRow key={k} label={fmtField(k)} value={v} />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!log.summary && !log.changes?.length && !changedFieldsList?.length && !otherDetails.length && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-[13px] font-medium">No additional details recorded for this action.</p>
          </div>
        )}

      </div>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────

const AuditLogs = () => {
  const { auditLogs, fetchAuditLogs, users, fetchUsers } = useAppStore();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [userFilter, setUserFilter] = useState("");

  const seenUserNames = useRef(new Set());
  const [stableUserNames, setStableUserNames] = useState([]);

  useEffect(() => {
    const names = users?.map((u) => u.name).filter(Boolean) || [];
    let changed = false;
    names.forEach((n) => { if (!seenUserNames.current.has(n)) { seenUserNames.current.add(n); changed = true; } });
    if (changed) setStableUserNames(Array.from(seenUserNames.current).sort());
  }, [users]);

  useEffect(() => {
    if (!auditLogs?.length) return;
    if (userFilter || debouncedSearch || dateRange.start || dateRange.end) return;
    let changed = false;
    auditLogs.forEach((l) => {
      if (l.userName && !seenUserNames.current.has(l.userName)) {
        seenUserNames.current.add(l.userName);
        changed = true;
      }
    });
    if (changed) setStableUserNames(Array.from(seenUserNames.current).sort());
  }, [auditLogs, userFilter, debouncedSearch, dateRange.start, dateRange.end]);

  const filteredLogs = auditLogs || [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    fetchAuditLogs(debouncedSearch, userFilter, dateRange);
    const interval = setInterval(() => fetchAuditLogs(debouncedSearch, userFilter, dateRange), 3e4);
    return () => clearInterval(interval);
  }, [fetchAuditLogs, debouncedSearch, userFilter, dateRange.start, dateRange.end]);

  const exportToCSV = () => {
    if (!auditLogs || auditLogs.length === 0) return;
    const headers = ["Date", "Actor Name", "Actor Email", "Action", "Resource", "Resource ID", "Summary", "Details"];
    const rows = auditLogs.map((log) => [
      `"${new Date(log.createdAt).toLocaleString()}"`,
      `"${log.userName}"`,
      `"${log.userEmail}"`,
      `"${log.action}"`,
      `"${log.resource}"`,
      `"${log.resourceId || ""}"`,
      `"${log.summary || ""}"`,
      log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasDetails = (log) =>
    log.summary || log.changes?.length > 0 || (log.details && Object.keys(log.details).length > 0);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PageHeader
        title="Audit Logs"
        sub="System-wide activity and changes tracking"
        actions={<Btn label="Export Report" icon={Download} onClick={exportToCSV} color="primary" />}
      />

      <FilterRow>
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search by Actor Name, Email, Action or Resource..."
        />
        <SelectFilter
          value={userFilter}
          onChange={setUserFilter}
          options={stableUserNames}
          placeholder="All Users"
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </FilterRow>

      <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1 flex flex-col shadow-sm">
        <TableVirtuoso
          style={{ flex: 1 }}
          data={filteredLogs}
          fixedHeaderContent={() => {
            const headerClass = "px-6 py-4 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider sticky top-0 z-10 sticky-th";
            return (
              <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800">
                <th className={headerClass}>User</th>
                <th className={`${headerClass} hidden lg:table-cell`}>Resource</th>
                <th className={`${headerClass} hidden md:table-cell`}>Action</th>
                <th className={`${headerClass} hidden sm:table-cell`}>Date</th>
                <th className={`${headerClass} text-right`}>Details</th>
              </tr>
            );
          }}
          itemContent={(_index, log) => (
            <>
              {/* User */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900 dark:text-white leading-none">{log.userName}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{log.userEmail}</div>
                  </div>
                </div>
                {/* Mobile extras */}
                <div className="mt-3 space-y-2 lg:hidden">
                  <div className="hidden sm:flex lg:hidden items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                      {log.resource}{log.resourceId && <span className="text-[11px] text-gray-400 font-mono ml-1">#{log.resourceId}</span>}
                    </span>
                  </div>
                  <div className="flex sm:hidden flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                        {log.resource}{log.resourceId && <span className="text-[11px] text-gray-400 font-mono ml-1">#{log.resourceId}</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div className="flex items-center mt-1">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              {/* Resource */}
              <td className="hidden lg:table-cell px-6 py-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-[13px] font-medium text-gray-700 dark:text-gray-300 leading-none">{log.resource}</div>
                    {log.resourceId && <div className="text-[11px] text-gray-500 font-mono mt-1">#{log.resourceId}</div>}
                  </div>
                </div>
              </td>

              {/* Action */}
              <td className="hidden md:table-cell px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${actionColor(log.action)}`}>
                  {log.action}
                </span>
                {log.summary && (
                  <p className="text-[11px] text-gray-400 mt-1.5 max-w-[200px] truncate" title={log.summary}>
                    {log.summary}
                  </p>
                )}
              </td>

              {/* Date */}
              <td className="hidden sm:table-cell px-6 py-4">
                <div className="flex items-center gap-1.5 text-[12px] text-gray-500 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </td>

              {/* Details button */}
              <td className="px-6 py-4 text-right">
                {hasDetails(log) ? (
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-[11px] text-primary hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-colors"
                  >
                    View Details
                  </button>
                ) : (
                  <span className="text-gray-400 italic text-[11px]">No data</span>
                )}
              </td>
            </>
          )}
          components={{ Table: VirtuosoTable, TableBody: VirtuosoTableBody }}
        />

        {filteredLogs.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 absolute inset-0 flex flex-col items-center justify-center">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No audit logs match the selected criteria</p>
          </div>
        )}
      </Card>

      {selectedLog && <ActivityModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
};

export { AuditLogs };
