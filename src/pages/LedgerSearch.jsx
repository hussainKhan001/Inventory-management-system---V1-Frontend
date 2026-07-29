import { useState, useRef, useCallback } from "react";
import { api } from "../services/api";
import {
  Search, ClipboardList, ShoppingCart, FileText, Package,
  ArrowDownToLine, ArrowUpFromLine, IndianRupee, AlertCircle,
  ChevronRight, X, ExternalLink, GitBranch,
} from "lucide-react";
import {
  PageHeader, Card, Btn, Badge, StatusBadge, Skeleton,
} from "../components/ui";

// ── Module config ────────────────────────────────────────────────────────────

const MODULE = {
  MR:        { label: "Material Req.", badgeColor: "blue",   icon: ClipboardList,   hash: "material-requirements" },
  Quotation: { label: "Quotation",     badgeColor: "purple", icon: FileText,        hash: "quotations" },
  PO:        { label: "Purchase Order",badgeColor: "orange", icon: ShoppingCart,    hash: "pos" },
  GRN:       { label: "GRN",           badgeColor: "green",  icon: Package,         hash: "grn" },
  Inward:    { label: "Inward",        badgeColor: "green",  icon: ArrowDownToLine, hash: "inward" },
  Outward:   { label: "Outward",       badgeColor: "yellow", icon: ArrowUpFromLine, hash: "outward" },
  Account:   { label: "Account",       badgeColor: "red",    icon: IndianRupee,     hash: "accounts" },
};

const CHAIN_ORDER = ["MR", "Quotation", "PO", "GRN", "Inward", "Outward", "Account"];

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtAmt = (n) => (n != null ? `₹${Number(n).toLocaleString("en-IN")}` : null);

// ── ModuleBadge using project Badge component ────────────────────────────────

function ModuleBadge({ source }) {
  const m = MODULE[source] || {};
  const Icon = m.icon || Package;
  return <Badge text={m.label || source} color={m.badgeColor || "gray"} icon={Icon} />;
}

// ── Single chain card ────────────────────────────────────────────────────────

function ChainCard({ item }) {
  const m = MODULE[item.source] || {};
  const Icon = m.icon || Package;

  const details = [
    item.project       && { label: "Project",   value: item.project },
    item.requesterName && { label: "Requester",  value: item.requesterName },
    (item.supplier || item.supplierName) && { label: "Supplier",  value: item.supplier || item.supplierName },
    item.itemCount     && { label: "Items",      value: `${item.itemCount} item${item.itemCount !== 1 ? "s" : ""}` },
    fmtAmt(item.amount) && { label: "Amount",    value: fmtAmt(item.amount) },
    item.grnRef        && { label: "GRN",        value: item.grnRef },
    item.poId          && { label: "PO",         value: item.poId },
    item.mrId          && { label: "MR",         value: item.mrId },
    item.quotationId   && { label: "Quotation",  value: item.quotationId },
  ].filter(Boolean);

  return (
    <div className="flex gap-3 items-start">
      {/* Step indicator */}
      <div className="flex flex-col items-center shrink-0 mt-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm
          ${m.badgeColor === "blue"   ? "bg-blue-500"   :
            m.badgeColor === "purple" ? "bg-indigo-500" :
            m.badgeColor === "orange" ? "bg-orange-500" :
            m.badgeColor === "green"  ? "bg-emerald-500":
            m.badgeColor === "yellow" ? "bg-amber-500"  :
            m.badgeColor === "red"    ? "bg-red-500"    : "bg-gray-500"}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {/* Connector line */}
        <div className="w-px flex-1 min-h-[20px] bg-gray-200 dark:bg-gray-700 mt-1" />
      </div>

      {/* Card */}
      <Card className="flex-1 mb-3 p-0 overflow-hidden hover:shadow-md">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-800/60">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <ModuleBadge source={item.source} />
            <span className="font-mono text-[13px] font-bold text-gray-900 dark:text-white">{item.id}</span>
            {(item.status || item.accountStatus) && (
              <StatusBadge status={item.status || item.accountStatus} small />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-gray-400">{fmtDate(item.date)}</span>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ledger:open', { detail: { source: item.source, id: item.id, poId: item.poId } }));
                window.location.hash = m.hash || "";
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              title={`Go to ${m.label}`}
            >
              <ExternalLink className="w-3 h-3" />
              View
            </button>
          </div>
        </div>

        {details.length > 0 && (
          <div className="px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
            {details.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">{label}:</span>
                <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Horizontal stepper bar (desktop overview) ────────────────────────────────

function StepperBar({ data }) {
  const sorted = [...data].sort((a, b) => {
    const oa = CHAIN_ORDER.indexOf(a.source), ob = CHAIN_ORDER.indexOf(b.source);
    return oa !== ob ? oa - ob : new Date(a.date || 0) - new Date(b.date || 0);
  });

  return (
    <div className="hidden sm:flex items-center gap-1 overflow-x-auto pb-2 mb-6">
      {sorted.map((item, i) => {
        const m = MODULE[item.source] || {};
        const Icon = m.icon || Package;
        return (
          <div key={`${item.source}:${item.id}`} className="flex items-center shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-semibold
              ${m.badgeColor === "blue"   ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"   :
                m.badgeColor === "purple" ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400" :
                m.badgeColor === "orange" ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400" :
                m.badgeColor === "green"  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400" :
                m.badgeColor === "yellow" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400" :
                m.badgeColor === "red"    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400" :
                                            "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{item.id}</span>
            </div>
            {i < sorted.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-0.5 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Grouped result row ───────────────────────────────────────────────────────

function GroupedRow({ item }) {
  const m = MODULE[item.source] || {};
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-all duration-200 border-b border-gray-100 dark:border-gray-700/40 last:border-0">
      <span className="font-mono text-[13px] font-bold text-gray-900 dark:text-white w-36 shrink-0">{item.id}</span>
      <div className="shrink-0">
        {(item.status || item.accountStatus) && <StatusBadge status={item.status || item.accountStatus} small />}
      </div>
      <span className="text-[12px] text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
        {item.project || item.supplier || item.supplierName || "—"}
      </span>
      <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{fmtDate(item.date)}</span>
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('ledger:open', { detail: { source: item.source, id: item.id, poId: item.poId } }));
          window.location.hash = m.hash || "";
        }}
        className="shrink-0 text-primary hover:text-primary/80 transition-colors"
        title={`Go to ${m.label}`}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function GroupedSection({ source, items }) {
  const m = MODULE[source] || {};
  const Icon = m.icon || Package;
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-800/60">
        <ModuleBadge source={source} />
        <span className="text-[13px] font-bold text-gray-900 dark:text-white">{m.label || source}</span>
        <span className="text-[11px] text-gray-400 font-medium ml-1">({items.length})</span>
      </div>
      <div>
        {items.map(item => <GroupedRow key={item.id} item={item} />)}
      </div>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function LedgerSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    const term = (q || query).trim();
    if (!term) { setResult(null); setError(null); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.get("ledger/search", { q: term });
      setResult(res);
    } catch (e) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleClear = () => { setQuery(""); setResult(null); setError(null); inputRef.current?.focus(); };

  // Sort chain results by canonical module order
  const chainData = result?.searchType === "chain"
    ? [...(result.data || [])].sort((a, b) => {
        const oa = CHAIN_ORDER.indexOf(a.source), ob = CHAIN_ORDER.indexOf(b.source);
        return oa !== ob ? oa - ob : new Date(a.date || 0) - new Date(b.date || 0);
      })
    : [];

  // Group vendor/item results by source
  const groups = {};
  if (result?.searchType === "vendor" || result?.searchType === "item") {
    (result.data || []).forEach(item => {
      if (!groups[item.source]) groups[item.source] = [];
      groups[item.source].push(item);
    });
  }

  const EXAMPLES = ["MR-2026-555", "PO-2026-001", "GRN-2026-001", "QT-2026-001"];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PageHeader
        title="Unified Ledger Search"
        sub="Search by MR, Quotation, PO, GRN, Inward, Outward, Account number — or by Item / Vendor name"
      />

      {/* Search input */}
      <Card className="p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="e.g. MR-2026-555, PO-2026-001, Cement, JSW Steel..."
              className="w-full pl-10 pr-9 py-2 h-[40px] bg-white dark:bg-[#0F172A] border border-gray-200/50 dark:border-gray-800 rounded-xl text-[13px] text-[#1A1A2E] dark:text-[#F1F5F9] transition-all duration-200 focus:outline-none focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/20 placeholder-gray-400 dark:placeholder-gray-500 shadow-xs"
            />
            {query && (
              <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Btn label="Search" icon={Search} onClick={() => doSearch()} loading={loading} />
        </div>

        {/* Example chips */}
        {!result && !loading && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-400 font-medium">Try:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); doSearch(ex); }}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary/40 hover:text-primary dark:hover:text-primary transition-all duration-200 font-mono"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[13px] font-medium">{error}</span>
          </div>
        </Card>
      )}

      {/* Not found */}
      {!loading && result?.searchType === "not_found" && (
        <Card className="p-8 text-center">
          <GitBranch className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
            No record found for <span className="font-mono text-gray-900 dark:text-white">{result.anchor?.id}</span>
          </p>
        </Card>
      )}

      {/* No match */}
      {!loading && result?.searchType === "none" && (
        <Card className="p-8 text-center">
          <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
            No matching vendor or item found. Try a more specific name or a document ID (MR-, PO-, GRN-…).
          </p>
        </Card>
      )}

      {/* Chain result */}
      {!loading && result?.searchType === "chain" && (
        <div>
          {/* Summary bar */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">Chain for</span>
            <ModuleBadge source={result.anchor?.source} />
            <span className="font-mono text-[13px] font-bold text-gray-900 dark:text-white">{result.anchor?.id}</span>
            <span className="text-[11px] text-gray-400 ml-auto">{chainData.length} record{chainData.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Horizontal stepper */}
          <StepperBar data={chainData} />

          {/* Vertical cards */}
          <div>
            {chainData.map((item, i) => (
              <ChainCard
                key={`${item.source}:${item.id}`}
                item={item}
              />
            ))}
          </div>
        </div>
      )}

      {/* Vendor / Item grouped result */}
      {!loading && (result?.searchType === "vendor" || result?.searchType === "item") && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">
              {result.searchType === "vendor" ? "Vendor" : "Item"}:
            </span>
            <span className="text-[13px] font-bold text-gray-900 dark:text-white">{result.matchedName}</span>
            {result.matchedSku && (
              <Badge text={result.matchedSku} color="gray" />
            )}
            <span className="text-[11px] text-gray-400 ml-auto">
              {(result.data || []).length} record{(result.data || []).length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {CHAIN_ORDER.filter(s => groups[s]).map(source => (
              <GroupedSection key={source} source={source} items={groups[source]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
