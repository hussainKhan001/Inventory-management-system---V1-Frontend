var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const fmtCur = /* @__PURE__ */ __name((n) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
}).format(n), "fmtCur");
const fmt = /* @__PURE__ */ __name((n) => new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
}).format(n), "fmt");
const todayStr = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString().split("T")[0], "todayStr");
const genId = /* @__PURE__ */ __name((prefix, count) => {
  if (typeof count === 'number') {
    const currentYear = new Date().getFullYear();
    const nextNum = (count > 10000 ? count : count + 1).toString().padStart(3, '0');
    return `${prefix}-${currentYear}-${nextNum}`;
  }
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-2026-${timestamp}-${random}`;
}, "genId");
const formatDate = /* @__PURE__ */ __name((dateStr) => {
  if (!dateStr) return "NA";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) return dateStr;
    return dateStr || "NA";
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).replace(/\//g, "-");
}, "formatDate");
const formatDateTime = /* @__PURE__ */ __name((dateStr) => {
  if (!dateStr) return "NA";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) return dateStr;
    return dateStr || "Invalid Date";
  }
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).replace(/\//g, "-");
}, "formatDateTime");
const scrollToError = /* @__PURE__ */ __name(() => {
  setTimeout(() => {
    const errorElement = document.querySelector(".border-red-500, .text-red-500");
    if (errorElement) {
      errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = errorElement.tagName === "INPUT" || errorElement.tagName === "SELECT" || errorElement.tagName === "TEXTAREA" ? errorElement : errorElement.querySelector("input, select, textarea");
      if (input) input.focus();
    }
  }, 100);
}, "scrollToError");
const formatAccountNo = /* @__PURE__ */ __name((val) => {
  if (!val) return "NA";
  const str = String(val).trim();
  if (str === "" || str === "undefined") return "NA";
  if (/^\+?\d+(\.\d+)?[eE]\+?\d+$/.test(str)) {
    try {
      const num = Number(val);
      if (!isNaN(num)) {
        return num.toLocaleString("fullwide", { useGrouping: false });
      }
    } catch (e) {
      return str;
    }
  }
  return str;
}, "formatAccountNo");
const formatPrettyDate = /* @__PURE__ */ __name((dateString) => {
  if (!dateString) return "NA";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(d);
  } catch (e) {
    return dateString;
  }
}, "formatPrettyDate");
const isNewItem = /* @__PURE__ */ __name((date) => {
  if (!date) return false;
  const itemDate = new Date(date).getTime();
  const now = (/* @__PURE__ */ new Date()).getTime();
  return now - itemDate < 12 * 60 * 60 * 1e3;
}, "isNewItem");
const safeStr = /* @__PURE__ */ __name((v) => {
  if (v === null || v === void 0) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object") {
    if (Array.isArray(v)) return v.map((i) => safeStr(i)).join(", ");
    return (v.label || v.value || JSON.stringify(v)).trim();
  }
  return String(v).trim();
}, "safeStr");
const calculatePriceComparison = /* @__PURE__ */ __name((quotes, targetItems) => {
  if (!quotes || !quotes.length) return null;
  const vendorIds = Array.from(new Set(quotes.map((q) => q.supplierId || q.supplierName)));
  const vendors = vendorIds.map((vId) => {
    const q = quotes.find((q2) => (q2.supplierId || q2.supplierName) === vId);
    return {
      supplierId: vId,
      name: q?.supplierName || vId,
      gstType: q?.items?.[0]?.gstType || "Inclusive"
    };
  });
  const poItemNames = targetItems?.map((ti) => (ti.itemName || "").toLowerCase().trim()) || [];
  const quoteItemNames = quotes.flatMap((q) => q.items?.map((i) => (i.materialName || "").toLowerCase().trim()) || []);
  const allItemNames = Array.from(/* @__PURE__ */ new Set([...poItemNames, ...quoteItemNames])).filter(Boolean);
  const items = allItemNames.map((tiName) => {
    const ti = targetItems?.find((it) => (it.itemName || "").toLowerCase().trim() === tiName);
    const qi_ref = quotes.flatMap((q) => q.items || []).find((i) => (i.materialName || "").toLowerCase().trim() === tiName);
    const rates = vendors.map((v) => {
      const q = quotes.find((q2) => (q2.supplierId || q2.supplierName) === v.supplierId);
      const qi = q?.items?.find((i) => (i.materialName || "").toLowerCase().trim() === tiName);
      return qi?.rate || 0;
    });
    const gstPcts = vendors.map((v) => {
      const q = quotes.find((q2) => (q2.supplierId || q2.supplierName) === v.supplierId);
      const qi = q?.items?.find((i) => (i.materialName || "").toLowerCase().trim() === tiName);
      return qi?.gstPct || 0;
    });
    return {
      sku: ti?.sku || qi_ref?.sku || "N/A",
      materialName: ti?.itemName || qi_ref?.materialName || tiName.toUpperCase(),
      unit: ti?.unit || qi_ref?.unit || "NOS",
      qty: ti?.qty || qi_ref?.qty || 0,
      category: ti?.category || qi_ref?.category || null,
      rates,
      gstPcts
    };
  });
  return { vendors, items, remarks: "Price Comparison showing all items and quotations" };
}, "calculatePriceComparison");
export {
  calculatePriceComparison,
  fmt,
  fmtCur,
  formatAccountNo,
  formatDate,
  formatDateTime,
  formatPrettyDate,
  genId,
  isNewItem,
  safeStr,
  scrollToError,
  todayStr
};
