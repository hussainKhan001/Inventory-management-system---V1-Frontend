import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { CheckCircle2, Fuel } from "lucide-react";
import { toast } from "react-hot-toast";
import { Card, Field, Btn } from "../components/ui";
import { CustomDropdown } from "../components/ui/CustomDropdown";

const TODAY = new Date().toISOString().slice(0, 10);

export function PublicDieselForm() {
  const { fetchResource, settings } = useAppStore();

  useEffect(() => { fetchResource("public-settings"); }, [fetchResource]);

  const projects = settings?.projects || [];
  const appName = settings?.appName || "Neoteric Properties";

  const [form, setForm] = useState({
    date: TODAY,
    driverName: "",
    equipment: "",
    site: "",
    qtyUsed: "",
    meterReading: "",
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState("");

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  function validate() {
    const e = {};
    if (!form.date) e.date = "Required";
    if (!form.driverName.trim()) e.driverName = "Required";
    if (!form.equipment.trim()) e.equipment = "Required";
    if (!form.site.trim()) e.site = "Required";
    if (!form.qtyUsed || Number(form.qtyUsed) <= 0) e.qtyUsed = "Enter a valid quantity";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "/api";
      const res = await fetch(`${base}/public/diesel-consumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, qtyUsed: Number(form.qtyUsed) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Submission failed");
      setSubmittedId(data.data?.id || "");
      setSubmitted(true);
    } catch (err) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({ date: TODAY, driverName: "", equipment: "", site: "", qtyUsed: "", meterReading: "", remarks: "" });
    setErrors({});
    setSubmitted(false);
    setSubmittedId("");
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Entry Logged!</h2>
            <p className="text-gray-500 dark:text-gray-400">Your diesel consumption has been recorded.</p>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-primary/20">
              <p className="text-[11px] font-bold text-gray-400 tracking-widest mb-1">ENTRY ID</p>
              <p className="text-lg font-mono font-bold text-primary">{submittedId}</p>
            </div>
          </div>
          <Btn label="Log Another Entry" className="w-full" onClick={resetForm} />
        </Card>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-md shadow-primary/20">
            <Fuel className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Diesel Consumption Log</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{appName} — Fill this form every time you use diesel</p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-0">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <Field
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
                error={errors.date}
              />
              <Field
                label="Driver / Operator Name"
                placeholder="Your full name"
                value={form.driverName}
                onChange={(e) => set("driverName", e.target.value)}
                required
                error={errors.driverName}
              />
              <Field
                label="Equipment / Vehicle"
                placeholder="e.g. JCB, DG Set, Truck HR-26-1234"
                value={form.equipment}
                onChange={(e) => set("equipment", e.target.value)}
                required
                error={errors.equipment}
              />
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1.5 text-sm">
                  Site / Project <span className="text-red-500">*</span>
                </label>
                {projects.length > 0 ? (
                  <CustomDropdown
                    options={projects}
                    value={form.site}
                    onChange={(val) => set("site", val)}
                    placeholder="Select site..."
                  />
                ) : (
                  <input
                    className="w-full bg-white dark:bg-[#1E293B] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 px-4 py-2.5 text-sm min-h-[44px] focus:outline-none focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/20 transition-all"
                    placeholder="Site / project name"
                    value={form.site}
                    onChange={(e) => set("site", e.target.value)}
                  />
                )}
                {errors.site && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.site}</p>}
              </div>
              <Field
                label="Diesel Quantity Used (Litres)"
                type="number"
                placeholder="0.0"
                value={form.qtyUsed}
                onChange={(e) => set("qtyUsed", e.target.value)}
                required
                error={errors.qtyUsed}
                min="0.1"
                step="0.1"
              />
              <Field
                label="Meter / Odometer Reading (optional)"
                placeholder="e.g. 12450 hrs or km"
                value={form.meterReading}
                onChange={(e) => set("meterReading", e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1.5 text-sm">Remarks (optional)</label>
              <textarea
                rows={3}
                placeholder="Any additional notes..."
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                className="w-full bg-white dark:bg-[#1E293B] border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 focus:outline-none focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/20 px-4 py-2.5 text-sm resize-none"
              />
            </div>

            <div className="pt-2">
              <Btn
                type="submit"
                label={submitting ? "Submitting..." : "Log Consumption"}
                icon={Fuel}
                disabled={submitting}
                className="w-full h-12 text-[15px]"
              />
            </div>
          </form>
        </Card>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">{appName} • Fuel Management System</p>
      </div>
    </div>
  );
}
