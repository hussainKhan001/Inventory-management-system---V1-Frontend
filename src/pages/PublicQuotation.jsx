var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { Btn, ThemeToggle, Card, Field } from "../components/ui";
import { Package, Send, CheckCircle2, Building2, FileText, Clock, X } from "lucide-react";
const GST_RATES = [0, 5, 12, 18, 28];
const GST_TYPES = ["Inclusive", "Exclusive"];
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { DatePicker } from "../components/ui/DatePicker";
const PublicQuotation = /* @__PURE__ */ __name(() => {
  const [mr, setMr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showSupplierResults, setShowSupplierResults] = useState(false);
  const supplierDropdownRef = useRef(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState([]);
  const [quotationId, setQuotationId] = useState("");
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const initialTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);
  const toggleTheme = /* @__PURE__ */ __name(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, "toggleTheme");
  const [freightAmount, setFreightAmount] = useState(0);
  const [freightGstPct, setFreightGstPct] = useState(18);
  const [freightGstType, setFreightGstType] = useState("Exclusive");
  const [loadingAmount, setLoadingAmount] = useState(0);
  const [loadingGstPct, setLoadingGstPct] = useState(18);
  const [loadingGstType, setLoadingGstType] = useState("Exclusive");
  const [unloadingAmount, setUnloadingAmount] = useState(0);
  const [unloadingGstPct, setUnloadingGstPct] = useState(18);
  const [unloadingGstType, setUnloadingGstType] = useState("Exclusive");
  const params = new URLSearchParams(window.location.hash.split("?")[1]);
  const mrId = params.get("mrId");
  const categoryFilter = params.get("category");
  useEffect(() => {
    fetchSuppliers();
    if (mrId) {
      fetchMR();
    } else {
      setLoading(false);
    }
  }, [mrId, categoryFilter]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        setShowSupplierResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const fetchSuppliers = /* @__PURE__ */ __name(async (search) => {
    try {
      const res = await api.get("public/suppliers", { search, limit: search ? 50 : 2e3 });
      if (res.success) {
        if (search) {
          setFilteredSuppliers(res.data);
        } else {
          setSuppliers(res.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch suppliers", error);
    }
  }, "fetchSuppliers");
  const handleSupplierSearch = /* @__PURE__ */ __name(async (val) => {
    setSupplierName(val);
    setSupplierId("");
    if (val.length === 0) {
      setFilteredSuppliers(suppliers);
      setShowSupplierResults(suppliers.length > 0);
    } else {
      const filtered = suppliers.filter(
        (s) => (s.companyName || s.name || "").toLowerCase().includes(val.toLowerCase())
      );
      setFilteredSuppliers(filtered);
      setShowSupplierResults(true);
      if (filtered.length === 0) {
        await fetchSuppliers(val);
      }
    }
  }, "handleSupplierSearch");
  const selectSupplier = /* @__PURE__ */ __name((supplier) => {
    console.log("Selected Supplier:", supplier);
    setSupplierName(supplier.companyName || supplier.name || "");
    setSupplierId(supplier.id || supplier._id || "");
    setOwnerName(supplier.ownerName || supplier.contact || "");
    setMobile(supplier.mobile || supplier.phone || "");
    setGstNumber(supplier.gstNumber || supplier.gst || "");
    setShowSupplierResults(false);
    toast.success(`Supplier details for ${supplier.companyName || supplier.name} loaded!`);
  }, "selectSupplier");
  const fetchMR = /* @__PURE__ */ __name(async () => {
    try {
      const res = await api.get(`public/mr/${mrId}`);
      if (res.success) {
        setMr(res.data);
        const filteredItems = res.data.items.filter((item) => {
          if (categoryFilter && item.category !== categoryFilter) return false;
          return (item.remainingQty !== void 0 ? item.remainingQty : item.qty) > 0;
        });
        const initialItems = filteredItems.map((item) => ({
          materialName: item.materialName,
          sku: item.sku || "",
          category: item.category,
          mrQty: item.remainingQty !== void 0 ? item.remainingQty : item.qty,
          mrUnit: item.unit,
          qty: item.remainingQty !== void 0 ? item.remainingQty : item.qty,
          unit: item.unit,
          rate: 0,
          gstPct: 18,
          gstType: "Exclusive"
        }));
        setItems(initialItems);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load MR details");
    } finally {
      setLoading(false);
    }
  }, "fetchMR");
  const handleRateChange = /* @__PURE__ */ __name((index, rate) => {
    const newItems = [...items];
    newItems[index].rate = isNaN(rate) ? 0 : rate;
    setItems(newItems);
  }, "handleRateChange");
  const handleGstPctChange = /* @__PURE__ */ __name((index, pct) => {
    const newItems = [...items];
    newItems[index].gstPct = pct;
    setItems(newItems);
  }, "handleGstPctChange");
  const handleRemoveItem = /* @__PURE__ */ __name((index) => {
    setItems(items.filter((_, i) => i !== index));
  }, "handleRemoveItem");
  const handleGstTypeChange = /* @__PURE__ */ __name((index, type) => {
    const newItems = [...items];
    newItems[index].gstType = type;
    setItems(newItems);
  }, "handleGstTypeChange");
  const calculateItemTotal = /* @__PURE__ */ __name((item) => {
    const base = item.qty * item.rate;
    if (item.gstType === "Exclusive") {
      return base + base * (item.gstPct || 0) / 100;
    }
    return base;
  }, "calculateItemTotal");
  const calculateChargeTotal = /* @__PURE__ */ __name((amount, gstPct, gstType) => {
    if (!amount) return 0;
    if (gstType === "Exclusive") {
      return amount + amount * gstPct / 100;
    }
    return amount;
  }, "calculateChargeTotal");
  const calculateGrandTotal = /* @__PURE__ */ __name(() => {
    const itemsTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const freightTotal = calculateChargeTotal(freightAmount, freightGstPct, freightGstType);
    const loadingTotal = calculateChargeTotal(loadingAmount, loadingGstPct, loadingGstType);
    const unloadingTotal = calculateChargeTotal(unloadingAmount, unloadingGstPct, unloadingGstType);
    return itemsTotal + freightTotal + loadingTotal + unloadingTotal;
  }, "calculateGrandTotal");
  const handleSubmit = /* @__PURE__ */ __name(async (e) => {
    e.preventDefault();
    if (!supplierName) {
      toast.error("Please enter your Company Name");
      return;
    }
    if (!deliveryDate) {
      toast.error("Please select an Expected Delivery Date");
      return;
    }
    if (items.some((item) => item.rate <= 0)) {
      toast.error("Please provide rates for all items");
      return;
    }
    setSubmitting(true);
    try {
      const grandTotal = calculateGrandTotal();
      const res = await api.post("public/quotation", {
        mrId,
        category: categoryFilter,
        supplierName,
        supplierId,
        ownerName,
        mobile,
        items,
        deliveryDate,
        remarks,
        gstNumber,
        freightAmount,
        freightGstPct,
        freightGstType,
        loadingAmount,
        loadingGstPct,
        loadingGstType,
        unloadingAmount,
        unloadingGstPct,
        unloadingGstType,
        totalAmount: grandTotal
      });
      if (res.success) {
        setQuotationId(res.data.id);
        setSuccess(true);
        toast.success("Quotation submitted successfully!");
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit quotation");
    } finally {
      setSubmitting(false);
    }
  }, "handleSubmit");
  const fmt = /* @__PURE__ */ __name((num) => (num || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), "fmt");
  if (!loading && !mrId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
            <Package className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Missing MR ID</h1>
          <p className="text-gray-500">No Material Requirement ID was found in the URL. Please use the specific link provided by the project manager.</p>
        </div>
      </div>;
  }
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F172A]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>;
  }
  if (!mrId || !mr) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F172A] p-4 text-center">
        <div className="max-w-md w-full bg-white dark:bg-[#1E293B] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Invalid Link</h2>
          <p className="text-gray-500 dark:text-gray-400">This quotation link is invalid or expired. Please contact the Project Manager for a new link.</p>
        </div>
      </div>;
  }
  if (mr.quotationLinkActive === false) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F172A] p-4 text-center">
        <div className="max-w-md w-full bg-white dark:bg-[#1E293B] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Link Deactivated</h2>
          <p className="text-gray-500 dark:text-gray-400">This quotation submission link has been deactivated by the AGM and is no longer accepting responses.</p>
        </div>
      </div>;
  }
  if (mr.status === "Pending") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F172A] p-4 text-center">
        <div className="max-w-md w-full bg-white dark:bg-[#1E293B] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Awaiting Approval</h2>
          <p className="text-gray-500 dark:text-gray-400">This requirement is currently undergoing internal review by the Store Incharge. Please check back later.</p>
        </div>
      </div>;
  }
  if (success) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F172A] p-4 text-center">
        <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white dark:bg-[#1E293B] p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800"
    >
          <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Quotation Received!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-2">Your quotation for MR <span className="font-bold text-orange-500">{mrId}</span> has been submitted successfully.</p>
          <p className="text-sm font-medium text-gray-400 tracking-widest">Quotation Id: {quotationId}</p>
        </motion.div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50/50 dark:bg-[#020617] text-gray-900 dark:text-gray-100 selection:bg-orange-100 dark:selection:bg-orange-500/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6"
  >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-gray-900 dark:text-white">Submit Quotation</h1>
            </div>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium max-w-xl">
              Quotation for <span className="text-orange-600 dark:text-orange-400 font-bold">MR #{mrId}</span> &bull; {items.length} items requested
            </p>
          </div>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {
    /* MR Details Summary */
  }
          <Card className="p-6 sm:p-10 border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                <h3 className="text-xs font-bold text-gray-900 dark:text-white tracking-widest">Requirement overview</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <Field label="Project Name" value={mr.project} disabled className="bg-gray-50/50 dark:bg-gray-400/5" />
                <Field label="Delivery Location" value={mr.location || "N/A"} disabled className="bg-gray-50/50 dark:bg-gray-400/5" />
                <Field label="Target Delivery Date" value={mr.requirementDate || "ASAP"} disabled className="bg-gray-50/50 dark:bg-gray-400/5" />
              </div>
            </div>
          </Card>

          {
    /* Supplier Info */
  }
          <Card className="p-6 sm:p-10 overflow-visible border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                <h3 className="text-xs font-bold text-gray-900 dark:text-white tracking-widest">Supplier details</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="relative lg:col-span-2" ref={supplierDropdownRef}>
                  <Field
    label="Search Company / Firm Name *"
    placeholder="Type to search your registered name..."
    value={supplierName}
    onChange={(e) => handleSupplierSearch(e.target.value)}
    onFocus={() => {
      if (supplierName.length === 0 && suppliers.length > 0) {
        setFilteredSuppliers(suppliers);
        setShowSupplierResults(true);
      } else if (supplierName.length > 0) {
        setShowSupplierResults(true);
      }
    }}
    required
    className="h-12 text-base font-semibold"
  />
                  <AnimatePresence>
                    {showSupplierResults && <motion.div
    initial={{ opacity: 0, y: -10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -10, scale: 0.98 }}
    className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl max-h-80 overflow-y-auto backdrop-blur-xl"
  >
                        {filteredSuppliers.length > 0 ? filteredSuppliers.map((s) => <button
    key={s.id || s._id}
    type="button"
    onClick={() => selectSupplier(s)}
    className="w-full text-left px-5 py-4 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 border-b border-gray-50 dark:border-gray-700 last:border-0 transition-all flex items-center gap-4 group"
  >
                            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
                              <Building2 className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{s.companyName || s.name}</p>
                              <p className="text-[10px] text-gray-400 font-semibold tracking-widest mt-0.5">{s.ownerName || s.contact} &bull; {s.mobile || s.phone}</p>
                            </div>
                          </button>) : <div className="px-5 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No supplier found. Try a different name.</div>}
                      </motion.div>}
                  </AnimatePresence>
                </div>
                <div className="h-12 w-full mt-0">
                  <DatePicker
    label="Expected Delivery Date *"
    value={deliveryDate}
    onChange={(e) => setDeliveryDate(e.target.value)}
    required
    className="w-full"
  />
                </div>
              </div>
              
              {
    /* Auto-filled details */
  }
              <AnimatePresence>
                {(ownerName || mobile || gstNumber) && <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-gray-50/30 dark:bg-gray-500/5 p-8 rounded-3xl border border-gray-100 dark:border-gray-800"
  >
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Contact person</label>
                      <div className="h-12 flex items-center px-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white">
                        {ownerName || "---"}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Mobile number</label>
                      <div className="h-12 flex items-center px-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white">
                        {mobile || "---"}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Gst number</label>
                      <div className="h-12 flex items-center px-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white font-mono tracking-wider">
                        {gstNumber || "---"}
                      </div>
                    </div>
                  </motion.div>}
              </AnimatePresence>
            </div>
          </Card>


          {
    /* Item Pricing */
  }
          <Card className="overflow-visible">
            <div className="p-6 sm:p-8 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-[13px] font-bold text-gray-900 dark:text-white tracking-wider">Price quotation (per item)</h3>
            </div>
            
            {
    /* Desktop Table View */
  }
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800 text-[10px] font-bold text-gray-400 tracking-widest border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-5 w-1/4">Item details</th>
                    <th className="px-4 py-3 text-center w-24">Required</th>
                    <th className="px-4 py-3 text-center w-32">Offer Qty</th>
                    <th className="px-4 py-3 text-center w-40">Rate (₹)</th>
                    <th className="px-4 py-3 text-center">Gst details</th>
                    <th className="px-6 py-5 text-right w-40">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item, idx) => <tr key={idx} className="transition-all group">
                      <td className="px-6 py-6">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight mb-1">{item.materialName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded font-medium tracking-wider">Sku</span>
                          <span className="text-[10px] text-gray-400 font-mono">{item.sku || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-gray-900 dark:text-white text-base">{item.mrQty !== void 0 ? item.mrQty : item.qty}</span>
                          <span className="text-[10px] font-medium text-gray-400 tracking-widest">{item.mrUnit || item.unit || "NOS"}</span>
                        </div>
                      </td>
                      <td className="px-2 py-6">
                        <div className="flex flex-col items-center gap-1.5 w-full max-w-[90px] mx-auto">
                          <input
    type="number"
    required
    placeholder="Qty"
    value={item.qty === 0 ? "" : item.qty}
    onChange={(e) => {
      const val = parseFloat(e.target.value);
      const newItems = [...items];
      newItems[idx].qty = isNaN(val) ? 0 : val;
      setItems(newItems);
    }}
    className="w-full text-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md h-9 text-[13px] font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 transition-all px-1"
  />
                          <input
    type="text"
    required
    placeholder="Unit"
    value={item.unit || ""}
    onChange={(e) => {
      const newItems = [...items];
      newItems[idx].unit = e.target.value;
      setItems(newItems);
    }}
    className="w-full text-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md h-7 text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase focus:outline-none focus:border-orange-500 transition-all px-1"
  />
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="w-full max-w-[120px] mx-auto">
                          <input
    type="number"
    required
    placeholder="0.00"
    value={item.rate === 0 ? "" : item.rate}
    onChange={(e) => handleRateChange(idx, parseFloat(e.target.value))}
    className="w-full text-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-[14px] font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 transition-all px-2"
  />
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex items-center gap-2 justify-center min-w-[220px]">
                          <select
    value={item.gstPct}
    onChange={(e) => handleGstPctChange(idx, parseInt(e.target.value))}
    className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-medium text-gray-900 dark:text-gray-100 px-3 py-2 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                            {GST_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
                          </select>
                          <select
    value={item.gstType}
    onChange={(e) => handleGstTypeChange(idx, e.target.value)}
    className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-semibold text-gray-900 dark:text-gray-100 px-3 py-2 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                            {GST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div>
                            <p className="text-[10px] font-medium text-gray-400 tracking-widest mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Line total</p>
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              ₹ {fmt(calculateItemTotal(item))}
                            </span>
                          </div>
                          {items.length > 1 && <button
    type="button"
    onClick={() => handleRemoveItem(idx)}
    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
    title="Remove item"
  >
                              <X className="w-4 h-4" />
                            </button>}
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>

            {
    /* Mobile Card View */
  }
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, idx) => <div key={idx} className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">{item.materialName}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5 tracking-wider">{item.sku || "No sku"}</p>
                    </div>
                    <div className="flex items-start gap-3 text-right">
                      <div>
                        <p className="text-[10px] font-medium text-orange-500 tracking-widest mb-1">Item total</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">₹ {fmt(calculateItemTotal(item))}</p>
                      </div>
                      {items.length > 1 && <button
    type="button"
    onClick={() => handleRemoveItem(idx)}
    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
    title="Remove item"
  >
                          <X className="w-4 h-4" />
                        </button>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Required" value={`${item.mrQty || item.qty} ${item.mrUnit || item.unit || "NOS"}`} disabled />
                    <Field
    label="Rate (₹) *"
    type="number"
    placeholder="0.00"
    value={item.rate === 0 ? "" : item.rate}
    onChange={(e) => handleRateChange(idx, parseFloat(e.target.value))}
    className="font-semibold h-11"
  />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field
    label="Offer Qty *"
    type="number"
    value={item.qty === 0 ? "" : item.qty}
    onChange={(e) => {
      const newItems = [...items];
      newItems[idx].qty = parseFloat(e.target.value) || 0;
      setItems(newItems);
    }}
    className="font-semibold h-11"
  />
                    <Field
    label="Offer Unit *"
    type="text"
    value={item.unit || ""}
    onChange={(e) => {
      const newItems = [...items];
      newItems[idx].unit = e.target.value;
      setItems(newItems);
    }}
    className="font-semibold h-11 uppercase"
  />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest block">Gst rate</label>
                      <select
    value={item.gstPct}
    onChange={(e) => handleGstPctChange(idx, parseInt(e.target.value))}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                        {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 tracking-widest block">Gst type</label>
                      <select
    value={item.gstType}
    onChange={(e) => handleGstTypeChange(idx, e.target.value)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                        {GST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>)}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 sm:px-8 border-t border-gray-100 dark:border-gray-800/50 space-y-3">
              <div className="flex justify-between items-center text-[13px] font-medium text-gray-500 dark:text-gray-400">
                <span>Items Subtotal:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">₹ {fmt(items.reduce((sum, item) => sum + calculateItemTotal(item), 0))}</span>
              </div>
              
              {freightAmount > 0 && <div className="flex justify-between items-center text-[13px] font-medium text-gray-500 dark:text-gray-400">
                  <span>Freight Charges ({freightGstPct}% GST {freightGstType}):</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">₹ {fmt(calculateChargeTotal(freightAmount, freightGstPct, freightGstType))}</span>
                </div>}
              
              {loadingAmount > 0 && <div className="flex justify-between items-center text-[13px] font-medium text-gray-500 dark:text-gray-400">
                  <span>Loading Charges ({loadingGstPct}% GST {loadingGstType}):</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">₹ {fmt(calculateChargeTotal(loadingAmount, loadingGstPct, loadingGstType))}</span>
                </div>}

              {unloadingAmount > 0 && <div className="flex justify-between items-center text-[13px] font-medium text-gray-500 dark:text-gray-400">
                  <span>Unloading Charges ({unloadingGstPct}% GST {unloadingGstType}):</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">₹ {fmt(calculateChargeTotal(unloadingAmount, unloadingGstPct, unloadingGstType))}</span>
                </div>}

              <div className="h-px bg-gray-200 dark:bg-gray-800/80 my-4" />

              <div className="flex justify-between items-center mt-2">
                <p className="font-bold text-gray-900 dark:text-white tracking-wide text-sm">Estimated Grand Total</p>
                <span className="text-3xl font-black text-orange-500 tracking-tight">₹ {fmt(calculateGrandTotal())}</span>
              </div>
            </div>

          </Card>

          {
    /* Other Charges */
  }
          <Card className="p-6 sm:p-8 bg-gray-50/30 dark:bg-[#1E293B]">
            <div className="mb-6 flex items-center gap-4">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-widest">Other Charges</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {
    /* Freight */
  }
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-400 tracking-widest">Freight Charges (₹)</label>
                <input
    type="number"
    placeholder="0.00"
    value={freightAmount || ""}
    onChange={(e) => setFreightAmount(parseFloat(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 px-4 h-12 outline-none focus:border-orange-500 transition-all box-border"
  />
                <div className="grid grid-cols-2 gap-3">
                  <select
    value={freightGstPct}
    onChange={(e) => setFreightGstPct(parseInt(e.target.value))}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
                  </select>
                  <select
    value={freightGstType}
    onChange={(e) => setFreightGstType(e.target.value)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[12px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                    {GST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {
    /* Loading */
  }
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-400 tracking-widest">Loading Charges (₹)</label>
                <input
    type="number"
    placeholder="0.00"
    value={loadingAmount || ""}
    onChange={(e) => setLoadingAmount(parseFloat(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 px-4 h-12 outline-none focus:border-orange-500 transition-all box-border"
  />
                <div className="grid grid-cols-2 gap-3">
                  <select
    value={loadingGstPct}
    onChange={(e) => setLoadingGstPct(parseInt(e.target.value))}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
                  </select>
                  <select
    value={loadingGstType}
    onChange={(e) => setLoadingGstType(e.target.value)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[12px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                    {GST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {
    /* Unloading */
  }
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-400 tracking-widest">Unloading Charges (₹)</label>
                <input
    type="number"
    placeholder="0.00"
    value={unloadingAmount || ""}
    onChange={(e) => setUnloadingAmount(parseFloat(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 px-4 h-12 outline-none focus:border-orange-500 transition-all box-border"
  />
                <div className="grid grid-cols-2 gap-3">
                  <select
    value={unloadingGstPct}
    onChange={(e) => setUnloadingGstPct(parseInt(e.target.value))}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
                  </select>
                  <select
    value={unloadingGstType}
    onChange={(e) => setUnloadingGstType(e.target.value)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[12px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                    {GST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {
    /* Remarks */
  }
          <Card className="p-6 sm:p-8">
            <Field
    label="Additional Remarks (Optional)"
    placeholder="Any special notes, terms or conditions..."
    value={remarks}
    onChange={(e) => setRemarks(e.target.value)}
    rows={3}
    multiline
  />
          </Card>

          <div className="pt-4">
            <Btn
    type="submit"
    className="w-full h-14 text-lg font-bold"
    loading={submitting}
    label={submitting ? "Submitting Quotation..." : "Submit Quotation"}
    icon={Send}
  />
          </div>
        </form>

        <div className="mt-12 text-center">
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em]">
            &copy; 2026 Neoteric Properties &bull; Garden city procurement
          </p>
        </div>
      </div>
    </div>;
}, "PublicQuotation");
export {
  PublicQuotation
};
