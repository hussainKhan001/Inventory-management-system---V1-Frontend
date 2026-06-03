import React, { useEffect, useState } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, StatusBadge, Modal, Btn } from "../components/ui";
import { FileText, Clock, User, Activity, Database, Search, Download } from "lucide-react";
import { TableVirtuoso } from "react-virtuoso";

export const AuditLogs = () => {
  const { auditLogs, fetchAuditLogs } = useAppStore();

  const renderPrettyValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-gray-400 italic">N/A</span>;
    if (typeof value !== 'object') return <span className="text-[14px] font-semibold text-[#1A1A2E] dark:text-[#F1F5F9] break-words">{String(value)}</span>;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400 italic text-[12px]">Empty array</span>;
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((v, i) => (
            <span key={i} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md text-[11px] font-bold border border-blue-100 dark:border-blue-800 break-words max-w-full">
              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </span>
          ))}
        </div>
      );
    }
  
    const keys = Object.keys(value);
    if (keys.length === 0) return <span className="text-gray-400 italic text-[12px]">Empty object</span>;
  
    // Check if it looks like a changedFields diff: { old: x, new: y }
    const isDiffObject = keys.length > 0 && keys.every(k => typeof value[k] === 'object' && value[k] !== null && ('old' in value[k] || 'new' in value[k]));
  
    if (isDiffObject) {
      return (
        <div className="space-y-2 mt-2 w-full">
          {keys.map((k) => {
            const fieldDiff = value[k] as any;
            return (
              <div key={k} className="bg-gray-50 dark:bg-[#0F172A] p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 text-[12px]">
                  <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded line-through break-words w-full sm:w-[45%] truncate" title={String(fieldDiff?.old ?? 'N/A')}>{String(fieldDiff?.old ?? 'N/A')}</span>
                  <span className="text-gray-400 shrink-0 hidden sm:block">➔</span>
                  <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded font-bold break-words w-full sm:w-[45%] truncate" title={String(fieldDiff?.new ?? 'N/A')}>{String(fieldDiff?.new ?? 'N/A')}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  
    // Generic Object
    return (
      <div className="bg-gray-50 dark:bg-[#0F172A] p-3 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2 mt-2 w-full">
        {keys.map((k) => (
          <div key={k} className="flex flex-col sm:flex-row sm:justify-between border-b border-gray-200 dark:border-gray-700/50 last:border-0 pb-2 last:pb-0 gap-1 sm:gap-4">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 shrink-0 mt-0.5">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
            <span className="text-[13px] font-medium text-[#1A1A2E] dark:text-[#F1F5F9] break-words text-left sm:text-right">
              {typeof value[k] === 'object' ? JSON.stringify(value[k]) : String(value[k])}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchAuditLogs(debouncedSearch);
    const interval = setInterval(() => fetchAuditLogs(debouncedSearch), 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAuditLogs, debouncedSearch]);

  const exportToCSV = () => {
    if (!auditLogs || auditLogs.length === 0) return;
    const headers = ["Date", "Actor Name", "Actor Email", "Action", "Resource", "Resource ID", "Details"];
    const rows = auditLogs.map((log: any) => [
      `"${new Date(log.createdAt).toLocaleString()}"`,
      `"${log.userName}"`,
      `"${log.userEmail}"`,
      `"${log.action}"`,
      `"${log.resource}"`,
      `"${log.resourceId || ""}"`,
      log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        sub="System-wide activity and changes tracking"
        actions={
          <Btn label="Export Report" icon={Download} onClick={exportToCSV} color="primary" />
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by Actor Name, Email, Action or Resource..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
        />
      </div>

      <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1 min-h-[600px]">
        <TableVirtuoso
          style={{ height: 'calc(100vh - 350px)' }}
          data={auditLogs || []}
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
              {/* 1. User Info (Always visible, includes extra info on small screens) */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900 dark:text-white leading-none">{log.userName}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{log.userEmail}</div>
                  </div>
                </div>

                {/* Mobile-only additional info */}
                <div className="mt-3 space-y-2 lg:hidden">
                  <div className="hidden sm:flex lg:hidden items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                      {log.resource} {log.resourceId && <span className="text-[11px] text-gray-400 font-mono ml-1">#{log.resourceId}</span>}
                    </span>
                  </div>
                  
                  <div className="flex sm:hidden flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                        {log.resource} {log.resourceId && <span className="text-[11px] text-gray-400 font-mono ml-1">#{log.resourceId}</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div className="flex items-center mt-1">
                       <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                        log.action === 'LOGIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                        log.action === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                      }`}>
                        {log.action ? log.action.charAt(0) + log.action.slice(1).toLowerCase() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              {/* 2. Resource (Desktop/Large) */}
              <td className="hidden lg:table-cell px-6 py-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-[13px] font-medium text-gray-700 dark:text-gray-300 leading-none">{log.resource}</div>
                    {log.resourceId && <div className="text-[11px] text-gray-500 font-mono mt-1">ID: {log.resourceId}</div>}
                  </div>
                </div>
              </td>

              {/* 3. Action (Medium+) */}
              <td className="hidden md:table-cell px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  log.action === 'LOGIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                  log.action === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                  log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                }`}>
                  {log.action ? log.action.charAt(0) + log.action.slice(1).toLowerCase() : 'Unknown'}
                </span>
              </td>

              {/* 4. Date (Small+) */}
              <td className="hidden sm:table-cell px-6 py-4">
                <div className="flex items-center gap-1.5 text-[12px] text-gray-500 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                {log.details ? (
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
          components={{
             Table: (props) => <table {...props} className="w-full text-left" />,
             TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref as any} className="divide-y divide-gray-100 dark:divide-gray-800" />),
          }}
        />

        {auditLogs.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No audit logs available</p>
          </div>
        )}
      </Card>

      {selectedLog && (
        <Modal
          title="Activity Details"
          onClose={() => setSelectedLog(null)}
          wide
          footer={
            <div className="flex justify-end w-full">
              <Btn label="Close" outline onClick={() => setSelectedLog(null)} />
            </div>
          }
        >
          <div className="bg-gray-50 dark:bg-[#0F172A] p-4 sm:p-6 rounded-xl overflow-y-auto max-h-[65vh] border border-gray-200 dark:border-gray-800 shadow-inner">
            {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(selectedLog.details).map(([key, value]) => {
                  // Format key: camelCase to Title Case
                  const formattedKey = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase())
                    .trim();
                    
                  return (
                    <div key={key} className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Database className="w-3 h-3 opacity-50" />
                        {formattedKey}
                      </p>
                      {renderPrettyValue(value)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-[13px] font-medium">No additional details recorded for this action.</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
