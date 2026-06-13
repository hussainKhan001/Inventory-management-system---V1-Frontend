import { todayStr } from "../../utils";

// Compute total for freight/loading/unloading charges
export function calcChargeTotal(amount, gstPct, gstType) {
  if (!amount) return 0;
  return gstType === "Exclusive" ? amount * (1 + gstPct / 100) : amount;
}

// Normalize timeline gst values to numbers
export function normalizeTimelineGST(pt) {
  const num = parseFloat(String(pt.gstPct || "").replace(/[^0-9.]/g, ""));
  const gstType = pt.gstType === "Exclusive" ? "Exclusive" : "Inclusive";
  return { ...pt, gstPct: isNaN(num) || !num ? 18 : num, gstType };
}

// Normalize legacy timeline type names
export function normalizeTimelineType(type) {
  if (type === "Progress") return "On Delivery";
  if (type === "Final Balance") return "After 10 Days of Delivery";
  return type || "";
}

// Compute [poDate, deliveryDate, deliveryPlus10] from a PO object
export function computeTimelineDates(po) {
  const poDate = po.date ? po.date.split("T")[0] : todayStr();
  const raw = po.deliveryDetails?.deliveryDate;
  const delivDate = raw && raw !== "NA" && raw !== "" ? raw.split("T")[0] : poDate;
  const d10 = new Date(delivDate);
  d10.setDate(d10.getDate() + 10);
  return [poDate, delivDate, d10.toISOString().split("T")[0]];
}

// Format a date string to a pretty locale string
export function formatPrettyDate(dateString) {
  if (!dateString) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

// Format GST % for display in timeline
export function fmtGstPct(val) {
  const g = String(val || "").trim();
  const gl = g.toLowerCase();
  if (!g || gl === "-" || gl === "inclusive") return g;
  const num = parseFloat(g.replace(/[^0-9.]/g, ""));
  if (!isNaN(num)) return `${num}% Exclusive`;
  return g;
}

// Strip "% Exclusive" suffix from user input
export function parseGstInput(raw) {
  return raw.replace(/\s*%?\s*exclusive\s*/i, "").trim();
}

// Default payment timelines for a new PO
export function defaultTimelines() {
  const today = todayStr();
  const d10 = new Date(today);
  d10.setDate(d10.getDate() + 10);
  const plus10 = d10.toISOString().split("T")[0];
  return [
    { date: today, type: "Advance", mode: "Bank Transfer", amount: 0, gstPct: 18, gstType: "Inclusive", ifPayable: 0 },
    { date: today, type: "On Delivery", mode: "Bank Transfer", amount: 0, gstPct: 0, gstType: "Inclusive", ifPayable: 0 },
    { date: plus10, type: "After 10 Days of Delivery", mode: "Bank Transfer", amount: 0, gstPct: 18, gstType: "Inclusive", ifPayable: 0 },
  ];
}
