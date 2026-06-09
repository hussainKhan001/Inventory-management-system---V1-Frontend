var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState } from "react";
import { api } from "../services/api";
import { ThemeToggle } from "../components/ui";
import { Search, Package, Calendar, MapPin, Building2, CheckCircle2, Clock, XCircle, AlertCircle, Box } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
const PublicMRTracking = /* @__PURE__ */ __name(() => {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mr, setMr] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const handleSearch = /* @__PURE__ */ __name(async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) {
      toast.error("Please enter a valid Tracking ID");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.get(`public/mr/${trackingId.trim()}`);
      if (res.success && res.data) {
        setMr(res.data);
      } else {
        setMr(null);
      }
    } catch (error) {
      setMr(null);
      toast.error(error.message || "Material Requirement not found");
    } finally {
      setLoading(false);
    }
  }, "handleSearch");
  const getTimelineSteps = /* @__PURE__ */ __name((status) => {
    const isRejected = status === "Rejected";
    const steps = [
      { id: "submitted", label: "Submitted", status: "completed", icon: Package },
      { id: "store", label: "Store Approval", status: "pending", icon: CheckCircle2 },
      { id: "agm", label: "AGM Approval", status: "pending", icon: CheckCircle2 },
      { id: "quotation", label: "Quotation Phase", status: "pending", icon: AlertCircle },
      { id: "approved", label: "PO Raised", status: "pending", icon: CheckCircle2 }
    ];
    if (isRejected) {
      steps[1].status = "completed";
      steps[2].status = "failed";
      return steps;
    }
    if (status === "Store Pending") {
      steps[1].status = "current";
    } else if (status === "AGM Pending") {
      steps[1].status = "completed";
      steps[2].status = "current";
    } else if (status === "Quotation Phase") {
      steps[1].status = "completed";
      steps[2].status = "completed";
      steps[3].status = "current";
    } else if (status === "Approved" || status === "Allocated") {
      steps[1].status = "completed";
      steps[2].status = "completed";
      steps[3].status = "completed";
      steps[4].status = "completed";
    }
    return steps;
  }, "getTimelineSteps");
  return <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A] flex flex-col font-sans transition-colors duration-200">
      {
    /* Header */
  }
      <header className="bg-white dark:bg-[#1E293B] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Garden City
            </span>
            <span className="hidden sm:inline-block ml-3 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Tracking Portal
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {
    /* Main Content */
  }
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12 flex flex-col items-center">
        
        <div className="text-center mb-10 w-full max-w-xl">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Track your MR</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Enter your Material Requirement (MR) ID to check its current status, approval progress, and fulfillment details.
          </p>
        </div>

        {
    /* Search Box */
  }
        <form onSubmit={handleSearch} className="w-full max-w-xl relative mb-12 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          </div>
          <input
    type="text"
    value={trackingId}
    onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
    placeholder="e.g. MR-2026-141"
    className="w-full pl-12 pr-32 py-5 bg-white dark:bg-[#1E293B] border-2 border-gray-200 dark:border-gray-800 rounded-2xl text-lg font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all shadow-sm"
  />
          <div className="absolute inset-y-2 right-2">
            <button
    type="submit"
    disabled={loading}
    className="h-full px-6 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Track"}
            </button>
          </div>
        </form>

        {
    /* Results Area */
  }
        <div className="w-full">
          <AnimatePresence mode="wait">
            {!loading && hasSearched && !mr && <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="text-center p-8 bg-white dark:bg-[#1E293B] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"
  >
                <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Not Found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  We couldn't find any Material Requirement with the ID <span className="font-mono font-bold">{trackingId}</span>.<br />Please check the ID and try again.
                </p>
              </motion.div>}

            {!loading && mr && <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6"
  >
                {
    /* MR Header Card */
  }
                <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{mr.id}</h2>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${mr.status === "Approved" || mr.status === "Allocated" ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" : mr.status === "Rejected" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400"}`}>
                          {mr.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> 
                        Submitted on {new Date(mr.date || mr.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white dark:bg-[#1E293B] rounded-lg shadow-sm">
                        <Building2 className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Project / Location</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{mr.project}</p>
                        {mr.location && <p className="text-xs text-gray-500">{mr.location}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white dark:bg-[#1E293B] rounded-lg shadow-sm">
                        <MapPin className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Delivery Location</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{mr.deliveryDetails?.location || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {
    /* Timeline Card */
  }
                <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-8">Tracking Progress</h3>
                  
                  <div className="relative">
                    {
    /* Vertical line connecting steps */
  }
                    <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-100 dark:bg-gray-800" />

                    <div className="space-y-8 relative">
                      {getTimelineSteps(mr.status).map((step, i) => {
    const Icon = step.icon;
    const isCompleted = step.status === "completed";
    const isCurrent = step.status === "current";
    const isFailed = step.status === "failed";
    return <div key={step.id} className="flex items-start gap-4 group">
                            <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${isCompleted ? "bg-green-500 text-white" : isCurrent ? "bg-blue-500 text-white ring-4 ring-blue-500/20" : isFailed ? "bg-red-500 text-white" : "bg-white dark:bg-[#1E293B] border-2 border-gray-200 dark:border-gray-700 text-gray-400"}`}>
                              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isFailed ? <XCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                            </div>
                            <div className="pt-3">
                              <p className={`text-base font-bold ${isCompleted ? "text-gray-900 dark:text-white" : isCurrent ? "text-blue-500 dark:text-blue-400" : isFailed ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                                {step.label}
                              </p>
                              {isCurrent && <p className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> In Progress
                                </p>}
                              {isFailed && <p className="text-xs font-medium text-red-500 mt-1">
                                  Rejected at this stage
                                </p>}
                            </div>
                          </div>;
  })}
                    </div>
                  </div>
                </div>

                {
    /* Requested Items Card */
  }
                <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Box className="w-5 h-5 text-gray-400" />
                    Requested Items
                  </h3>
                  
                  <div className="space-y-3">
                    {mr.items && mr.items.map((item, i) => <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{item.materialName}</p>
                          <p className="text-xs text-gray-500 font-mono mt-1">{item.sku || "N/A"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-gray-900 dark:text-white">
                            {item.qty} <span className="text-xs font-medium text-gray-500">{item.unit}</span>
                          </p>
                        </div>
                      </div>)}
                  </div>
                </div>

              </motion.div>}
          </AnimatePresence>
        </div>

      </main>
    </div>;
}, "PublicMRTracking");
export {
  PublicMRTracking
};
