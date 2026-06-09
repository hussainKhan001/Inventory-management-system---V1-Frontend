var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Btn, SField, Skeleton } from "../components/ui";
import { CheckSquare, Download } from "lucide-react";
import toast from "react-hot-toast";
const StockCheck = /* @__PURE__ */ __name(() => {
  const { inventory, role, submitStockCheck, fetchResource, actionLoading, loading, hasPermission, settings } = useAppStore();
  const [category, setCategory] = useState("");
  const [counts, setCounts] = useState({});
  useEffect(() => {
    if (category) {
      fetchResource("inventory", 1, 2e3, false, "", { category });
    }
  }, [category, fetchResource]);
  const filtered = category ? inventory.filter((i) => i.category === category) : [];
  const handleSubmitAudit = /* @__PURE__ */ __name(async () => {
    const auditItems = filtered.filter((item) => counts[item.sku] !== void 0 && counts[item.sku] !== "").map((item) => ({
      sku: item.sku,
      itemName: item.itemName,
      systemStock: item.liveStock,
      physicalStock: Number(counts[item.sku]),
      variance: Number(counts[item.sku]) - item.liveStock,
      unit: item.unit
    }));
    if (auditItems.length === 0) {
      toast.error("No items audited!");
      return;
    }
    try {
      const hasShortage = auditItems.some((item) => item.variance < 0);
      await submitStockCheck({
        id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date: (/* @__PURE__ */ new Date()).toISOString(),
        category,
        items: auditItems
      });
      if (hasShortage) {
        toast.success("Audit submitted. Shortage detected, awaiting PM approval.", { duration: 6e3 });
      } else {
        toast.success("Audit submitted successfully!");
      }
      setCounts({});
    } catch (error) {
      toast.error(`Failed to submit audit: ${error.message}`);
    }
  }, "handleSubmitAudit");
  const exportToCSV = /* @__PURE__ */ __name(() => {
    if (filtered.length === 0) return;
    const headers = ["SKU", "Item Name", "System Stock", "Physical Count", "Variance", "Unit"];
    const rows = filtered.map((item) => {
      const count = counts[item.sku] !== void 0 ? counts[item.sku] : "";
      const variance = count !== "" ? Number(count) - item.liveStock : "";
      return [
        item.sku,
        item.itemName,
        item.liveStock,
        count,
        variance,
        item.unit
      ];
    });
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_check_${category}_${(/* @__PURE__ */ new Date()).toLocaleDateString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, "exportToCSV");
  return <div className="space-y-6">
      <PageHeader
    title="Physical Stock Check"
    sub="Audit warehouse inventory against system records"
    actions={category && <div className="flex gap-2">
              <Btn
      label="Export CSV"
      variant="ghost"
      icon={Download}
      onClick={exportToCSV}
    />
              {hasPermission("CREATE_STOCK_CHECK") && <Btn
      label="Submit Audit"
      icon={CheckSquare}
      onClick={handleSubmitAudit}
      loading={actionLoading}
    />}
            </div>}
  />

      <Card className="p-4 mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <div className="max-w-md">
          <SField
    label="Select Category to Audit"
    value={category}
    onChange={(e) => {
      setCategory(e.target.value);
      setCounts({});
    }}
    options={settings.categories}
  />
        </div>
      </Card>

      {category && <Card className="p-0 overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[480px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-[#E8ECF0] dark:border-gray-800">
                  <th className="px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap w-[130px] overflow-hidden">
                    Sku
                  </th>
                  <th className="px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap overflow-hidden">
                    Item name
                  </th>
                  <th className="px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap text-right w-[150px] overflow-hidden">
                    Physical count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0] dark:divide-gray-800">
                {loading ? [...Array(5)].map((_, i) => <tr key={i}>
                      <td className="px-3 py-2.5"><Skeleton className="h-8 w-16" /></td>
                      <td className="px-3 py-2.5"><Skeleton className="h-8 w-40" /></td>
                      <td className="px-3 py-2.5 text-right"><Skeleton className="h-8 w-24 ml-auto" /></td>
                      <td className="px-3 py-2.5 text-right"><Skeleton className="h-8 w-24 ml-auto" /></td>
                      <td className="px-3 py-2.5 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>) : filtered.map((item, idx) => {
    const count = counts[item.sku] !== void 0 ? counts[item.sku] : "";
    const variance = count !== "" ? Number(count) - item.liveStock : 0;
    return <tr key={`${item.sku}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5 overflow-hidden">
                          <span className="block truncate text-[13px] font-mono text-[#6B7280] dark:text-gray-400" title={item.sku}>{item.sku}</span>
                        </td>
                        <td className="px-3 py-2.5 overflow-hidden">
                          <span className="block truncate text-[13px] font-medium text-[#1A1A2E] dark:text-white" title={item.itemName}>{item.itemName}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
      type="number"
      value={count}
      onChange={(e) => setCounts({
        ...counts,
        [item.sku]: e.target.value === "" ? "" : Number(e.target.value)
      })}
      className="w-24 px-2 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-[13px] text-right text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
      placeholder="Count"
    />
                        </td>
                      </tr>;
  })}
              </tbody>
            </table>
          </div>
        </Card>}
    </div>;
}, "StockCheck");
export {
  StockCheck
};
