var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useRef } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Btn, Field } from "../components/ui";
import {
  Settings as SettingsIcon,
  ShieldAlert,
  FileText,
  Users,
  Building,
  Plus,
  X as CloseIcon,
  Trash2,
  Key,
  Percent,
  Check,
  Palette,
  Image as ImageIcon,
  Globe,
  Upload,
  Coins,
  Pencil,
} from "lucide-react";
import { toast } from "react-hot-toast";
const ListManager = /* @__PURE__ */ __name(({
  title,
  icon: Icon,
  value,
  onChange,
  onAdd,
  onRemove,
  items,
  disabled = false
}) => <div className={`p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-800 transition-all ${disabled ? "opacity-60" : "hover:shadow-xs"}`}>
    <h4 className="text-[12px] font-bold text-gray-700 dark:text-gray-300 tracking-widest mb-3 flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      {title}
    </h4>
    {!disabled && <div className="flex gap-2 mb-3">
        <input
  type="text"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && onAdd()}
  placeholder={`Add new ${title.slice(0, -1).toLowerCase()}...`}
  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
/>
        <button
  onClick={onAdd}
  className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center shrink-0 w-9 h-9 cursor-pointer"
>
          <Plus className="w-4 h-4" />
        </button>
      </div>}
    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
      {items.map((item) => <div
  key={item}
  className={`flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-400 transition-all ${!disabled ? "group hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10" : ""}`}
>
          {item}
          {!disabled && <button
  onClick={() => onRemove(item)}
  className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
>
              <CloseIcon className="w-3 h-3" />
            </button>}
        </div>)}
      {items.length === 0 && <p className="text-[10px] text-gray-400 italic mt-1">No items added yet</p>}
    </div>
  </div>, "ListManager");
const PRESET_COLORS = [
  { name: "Sunset Orange", hex: "#F97316" },
  { name: "Ocean Blue", hex: "#3B82F6" },
  { name: "Teal Emerald", hex: "#10B981" },
  { name: "Regal Purple", hex: "#8B5CF6" },
  { name: "Crimson Rose", hex: "#F43F5E" },
  { name: "Midnight Slate", hex: "#64748B" }
];
const FONTS_LIST = [
  "Inter",
  "Outfit",
  "Poppins",
  "Roboto",
  "Space Grotesk",
  "Plus Jakarta Sans",
  "Instrument Sans"
];
const SettingsPage = /* @__PURE__ */ __name(() => {
  const {
    settings,
    setSettings,
    saveSettings,
    actionLoading,
    uploadImage,
    role,
    gstRates,
    addGSTRate,
    removeGSTRate,
  } = useAppStore();
  const isSuperAdmin = role === "Super Admin";
  const [activeTab, setActiveTab] = useState("branding");
  const [newItem, setNewItem] = useState({
    projects: "",
    requesters: "",
    categories: "",
    units: "",
    workTypes: "",
    stores: "",
    gstRates: ""
  });
  const [newCompany, setNewCompany] = useState({ name: "", gstin: "", address: "" });
  const [editingCompanyIdx, setEditingCompanyIdx] = useState(null);
  const [editCompanyDraft, setEditCompanyDraft] = useState({ name: "", gstin: "", address: "" });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  const getEffectiveList = /* @__PURE__ */ __name((listKey) => {
    if (listKey === "gstRates" && !settings[listKey]?.length)
      return ["0%", "5%", "12%", "18%", "28%"];
    return settings[listKey] || [];
  }, "getEffectiveList");
  const addItemToList = /* @__PURE__ */ __name(async (listKey) => {
    const val = newItem[listKey].trim();
    if (!val) return;
    const currentList = getEffectiveList(listKey);
    if (currentList.includes(val)) {
      toast.error(`${val} already exists in the list`);
      return;
    }
    const updatedList = [...currentList, val];
    const updatedSettings = { ...settings, [listKey]: updatedList };
    setSettings(updatedSettings);
    setNewItem({ ...newItem, [listKey]: "" });
    try {
      await saveSettings(updatedSettings);
    } catch (err) {
    }
  }, "addItemToList");
  const removeItemFromList = /* @__PURE__ */ __name(async (listKey, item) => {
    const updatedList = getEffectiveList(listKey).filter((i) => i !== item);
    const updatedSettings = { ...settings, [listKey]: updatedList };
    setSettings(updatedSettings);
    try {
      await saveSettings(updatedSettings);
    } catch (err) {
    }
  }, "removeItemFromList");
  const addCompany = /* @__PURE__ */ __name(async () => {
    if (!newCompany.name.trim()) return;
    const updatedCompanies = [...settings.companies || [], newCompany];
    const updatedSettings = { ...settings, companies: updatedCompanies };
    setSettings(updatedSettings);
    setNewCompany({ name: "", gstin: "", address: "" });
    try {
      await saveSettings(updatedSettings);
    } catch (err) {
    }
  }, "addCompany");
  const removeCompany = /* @__PURE__ */ __name(async (index) => {
    const updatedCompanies = (settings.companies || []).filter((_, i) => i !== index);
    const updatedSettings = { ...settings, companies: updatedCompanies };
    setSettings(updatedSettings);
    try {
      await saveSettings(updatedSettings);
    } catch (err) {
    }
  }, "removeCompany");

  const saveEditCompany = async () => {
    if (!editCompanyDraft.name.trim()) return;
    const updatedCompanies = (settings.companies || []).map((co, i) =>
      i === editingCompanyIdx ? { ...editCompanyDraft } : co
    );
    const updatedSettings = { ...settings, companies: updatedCompanies };
    setSettings(updatedSettings);
    setEditingCompanyIdx(null);
    try {
      await saveSettings(updatedSettings);
      toast.success("Company updated");
    } catch (err) {
      toast.error("Failed to save");
    }
  };
  const handleFileUpload = /* @__PURE__ */ __name(async (file, type) => {
    if (!file) return;
    try {
      if (type === "logo") setUploadingLogo(true);
      else setUploadingFavicon(true);
      const res = await uploadImage(file);
      const updatedSettings = {
        ...settings,
        [type === "logo" ? "logoUrl" : "faviconUrl"]: res.url
      };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);
      toast.success(`${type === "logo" ? "Logo" : "Favicon"} uploaded and saved`);
    } catch (err) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  }, "handleFileUpload");
  const handleCommitSettings = /* @__PURE__ */ __name(async () => {
    try {
      await saveSettings(settings);
      toast.success("System configurations committed successfully");
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
    }
  }, "handleCommitSettings");
  return <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
    title="Settings Hub"
    sub="Control look-and-feel, dynamic theme styling, compliance protocols, and master databases."
  />

      {
    /* Access restriction banner */
  }
      {!isSuperAdmin && <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/10">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-amber-800 dark:text-amber-300">View-only access</p>
            <p className="text-[12px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Only <span className="font-bold">Super Admin</span> can modify settings. You can browse current configurations below.
            </p>
          </div>
        </div>}

      {
    /* Tabs list */
  }
      <div className="flex gap-1 bg-gray-100/60 dark:bg-gray-800/40 p-1.5 rounded-xl border border-gray-100 dark:border-gray-800/60 overflow-x-auto no-scrollbar">
        {[
    { id: "branding", label: "Branding & Theme", icon: Palette },
    { id: "companies", label: "My Companies", icon: Building },
    { id: "policies", label: "Compliance & Policies", icon: Coins },
    { id: "approvers", label: "Approvers & Workflow", icon: Users },
    { id: "master-data", label: "Master Data Databases", icon: DatabaseIcon }
  ].map((t) => <button
    key={t.id}
    onClick={() => setActiveTab(t.id)}
    className={`flex items-center gap-2.5 px-6 py-3 rounded-lg text-xs font-bold tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer ${activeTab === t.id ? "bg-white dark:bg-gray-800 text-primary shadow-xs border-b-2 border-primary" : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/40 dark:hover:bg-gray-800/20"}`}
  >
            <t.icon className={`w-4 h-4 ${activeTab === t.id ? "text-primary" : "text-gray-400"}`} />
            {t.label}
          </button>)}
      </div>

      {
    /* BRANDING TAB */
  }
      {activeTab === "branding" && <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {
    /* Main Visual Customization Form */
  }
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 space-y-6">
              <h3 className="text-sm font-bold tracking-wider text-gray-400 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                <Globe className="w-4 h-4 text-primary" /> General Platform settings
              </h3>
              
              <Field
    label="Application Display Title"
    placeholder="E.g. Garden City Inventory"
    value={settings.appName || ""}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, appName: e.target.value })}
    disabled={!isSuperAdmin}
  />

              <Field
    label="Company Full Legal Name"
    placeholder="E.g. Neoteric Properties Pvt. Ltd."
    value={settings.companyFullName || ""}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, companyFullName: e.target.value })}
    disabled={!isSuperAdmin}
  />

              <Field
    label="Login Footer Text (optional)"
    placeholder="E.g. © 2025 Your Company"
    value={settings.footerText || ""}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, footerText: e.target.value })}
    disabled={!isSuperAdmin}
  />

              <div className={`space-y-3 ${!isSuperAdmin ? "opacity-60 pointer-events-none select-none" : ""}`}>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest">
                  Primary Theme Color Selection
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_COLORS.map((color) => <button
    key={color.hex}
    onClick={() => isSuperAdmin && setSettings({ ...settings, themeColor: color.hex })}
    disabled={!isSuperAdmin}
    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${isSuperAdmin ? "cursor-pointer hover:shadow-xs" : "cursor-not-allowed"} ${settings.themeColor === color.hex ? "border-primary bg-primary/5 dark:bg-primary/15" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}
  >
                      <span
    className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10 shrink-0"
    style={{ backgroundColor: color.hex }}
  />
                      {color.name}
                    </button>)}
                </div>

                <div className="flex items-center gap-3 mt-3 pt-2">
                  <span className="text-xs font-semibold text-gray-400">Custom Color Hex:</span>
                  <div className="relative flex items-center">
                    <input
    type="color"
    value={settings.themeColor || "#F97316"}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, themeColor: e.target.value })}
    disabled={!isSuperAdmin}
    className={`w-8 h-8 rounded-lg bg-transparent border-0 shrink-0 p-0 ${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed"}`}
  />
                    <input
    type="text"
    value={settings.themeColor || ""}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, themeColor: e.target.value })}
    disabled={!isSuperAdmin}
    placeholder="#F97316"
    className="ml-2 w-28 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed"
  />
                  </div>
                </div>
              </div>

              {
    /* Font Family selection */
  }
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest">
                  Global Typography Family
                </label>
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${!isSuperAdmin ? "opacity-60 pointer-events-none select-none" : ""}`}>
                  {FONTS_LIST.map((font) => <button
    key={font}
    onClick={() => isSuperAdmin && setSettings({ ...settings, fontFamily: font })}
    disabled={!isSuperAdmin}
    className={`p-3 text-center rounded-xl border text-xs font-bold transition-all ${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed"} ${settings.fontFamily === font ? "border-primary bg-primary/5 dark:bg-primary/15 text-primary" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
    style={{ fontFamily: font }}
  >
                      {font}
                    </button>)}
                </div>
              </div>
            </Card>

            {
    /* Media Uploaders Card */
  }
            <Card className="p-6 space-y-6">
              <h3 className="text-sm font-bold tracking-wider text-gray-400 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                <ImageIcon className="w-4 h-4 text-primary" /> Assets & Branding Media
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {
    /* Logo uploader */
  }
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest">
                    Corporate Branding Logo
                  </label>
                  <div
    onClick={() => isSuperAdmin && logoInputRef.current?.click()}
    className={`border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center transition-all bg-gray-50/50 dark:bg-gray-800/10 group relative overflow-hidden h-40 flex flex-col justify-center items-center ${isSuperAdmin ? "cursor-pointer hover:border-primary/50 dark:hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/20" : "cursor-not-allowed opacity-60"}`}
  >
                    {uploadingLogo ? <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-400 font-medium animate-pulse">Uploading file...</span>
                      </div> : settings.logoUrl ? <div className="space-y-2 flex flex-col items-center">
                        <img
    src={settings.logoUrl.startsWith("/") && !settings.logoUrl.startsWith("/uploads") ? settings.logoUrl : settings.logoUrl.startsWith("/uploads") ? `${window.location.protocol}//${window.location.hostname}:5000${settings.logoUrl}` : settings.logoUrl}
    alt="Logo Preview"
    className="h-16 object-contain rounded-lg p-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800"
  />
                        <span className="text-[10px] text-gray-400 group-hover:text-primary transition-colors font-semibold tracking-widest">Change image logo</span>
                      </div> : <div className="space-y-1.5 text-gray-400 flex flex-col items-center">
                        <Upload className="w-7 h-7 group-hover:text-primary transition-colors duration-200" />
                        <span className="text-xs font-bold group-hover:text-primary transition-colors duration-200">Click to upload Logo</span>
                        <span className="text-[9px] text-gray-400 italic">PNG, JPG, or SVG recommended</span>
                      </div>}
                    <input
    type="file"
    ref={logoInputRef}
    onChange={(e) => isSuperAdmin && e.target.files?.[0] && handleFileUpload(e.target.files[0], "logo")}
    disabled={!isSuperAdmin}
    className="hidden"
    accept="image/*"
  />
                  </div>
                </div>

                {
    /* Favicon uploader */
  }
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest">
                    Browser Tab Favicon Icon
                  </label>
                  <div
    onClick={() => isSuperAdmin && faviconInputRef.current?.click()}
    className={`border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center transition-all bg-gray-50/50 dark:bg-gray-800/10 group relative overflow-hidden h-40 flex flex-col justify-center items-center ${isSuperAdmin ? "cursor-pointer hover:border-primary/50 dark:hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/20" : "cursor-not-allowed opacity-60"}`}
  >
                    {uploadingFavicon ? <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-400 font-medium animate-pulse">Uploading file...</span>
                      </div> : settings.faviconUrl ? <div className="space-y-2 flex flex-col items-center">
                        <img
    src={settings.faviconUrl.startsWith("/") && !settings.faviconUrl.startsWith("/uploads") ? settings.faviconUrl : settings.faviconUrl.startsWith("/uploads") ? `${window.location.protocol}//${window.location.hostname}:5000${settings.faviconUrl}` : settings.faviconUrl}
    alt="Favicon Preview"
    className="w-12 h-12 object-contain rounded-lg p-1.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800"
  />
                        <span className="text-[10px] text-gray-400 group-hover:text-primary transition-colors font-semibold tracking-widest">Change favicon icon</span>
                      </div> : <div className="space-y-1.5 text-gray-400 flex flex-col items-center">
                        <Upload className="w-7 h-7 group-hover:text-primary transition-colors duration-200" />
                        <span className="text-xs font-bold group-hover:text-primary transition-colors duration-200">Click to upload Favicon</span>
                        <span className="text-[9px] text-gray-400 italic">Square .ico, .png, or .svg</span>
                      </div>}
                    <input
    type="file"
    ref={faviconInputRef}
    onChange={(e) => isSuperAdmin && e.target.files?.[0] && handleFileUpload(e.target.files[0], "favicon")}
    disabled={!isSuperAdmin}
    className="hidden"
    accept="image/*"
  />
                  </div>
                </div>

              </div>
            </Card>
          </div>

          {
    /* Live Preview Panel */
  }
          <div className="space-y-6">
            <Card className="p-6 sticky top-6 border-primary/20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/60 dark:to-gray-900 overflow-hidden relative shadow-md">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Palette className="w-32 h-32 -mr-8 -mt-8" />
              </div>

              <h3 className="text-[11px] font-black tracking-widest text-primary mb-5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live System Preview
              </h3>
              
              <div className="space-y-6 relative z-10" style={{ fontFamily: settings.fontFamily }}>
                
                {
    /* Simulated Header/Sidebar */
  }
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-xs">
                  <div className="h-11 border-b border-gray-100 dark:border-gray-700 px-3 bg-gray-900 text-white flex items-center gap-2">
                    {settings.logoUrl ? <img
    src={settings.logoUrl.startsWith("/") && !settings.logoUrl.startsWith("/uploads") ? settings.logoUrl : settings.logoUrl.startsWith("/uploads") ? `${window.location.protocol}//${window.location.hostname}:5000${settings.logoUrl}` : settings.logoUrl}
    alt="Logo"
    className="w-5.5 h-5.5 object-contain"
  /> : <div className="w-5.5 h-5.5 bg-primary rounded flex items-center justify-center font-bold text-[10px]">
                        {(settings.appName || "N").charAt(0)}
                      </div>}
                    <span className="text-xs font-bold truncate">{settings.appName || "Garden City"}</span>
                    
                    <div className="ml-auto flex gap-1 items-center shrink-0">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: settings.themeColor }} />
                    </div>
                  </div>

                  <div className="p-4 space-y-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                    <h4 className="text-[12px] font-black tracking-tight">Typography test panel</h4>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-normal">
                      The dynamic typography will inject custom styling stack directly into the document. Quick brown fox jumps over the lazy dog.
                    </p>
                    
                    <div className="flex gap-2 pt-2">
                      <button
    className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1 cursor-default"
    style={{ backgroundColor: settings.themeColor }}
  >
                        Primary button
                      </button>
                      <button className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-transparent cursor-default">
                        Secondary
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 text-[10px] text-primary/80 leading-relaxed font-semibold italic">
                  Note: Theme color styling overrides elements containing bg-primary, border-primary and text-primary values instantly.
                </div>
              </div>
            </Card>
          </div>

          {isSuperAdmin && <div className="md:col-span-3 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <Btn
    label="Commit Customizations"
    icon={Check}
    onClick={handleCommitSettings}
    loading={actionLoading}
    shadow
  />
            </div>}
        </div>}

      {
    /* POLICIES TAB */
  }
      {activeTab === "policies" && <Card className="p-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          <div className="bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-black text-gray-900 dark:text-white tracking-tight">System Global Configuration</h3>
              <p className="text-xs text-gray-500">Override base logic and threshold values for the entire platform</p>
            </div>
            <SettingsIcon className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                  <h4 className="text-[12px] font-bold text-primary tracking-widest mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Approval Thresholds
                  </h4>
                  <Field
    label="PO Auto-Approve Limit (₹)"
    type="number"
    value={settings.poThreshold || 0}
    onChange={(e) => isSuperAdmin && setSettings({
      ...settings,
      poThreshold: Number(e.target.value)
    })}
    disabled={!isSuperAdmin}
  />
                  <p className="mt-2 text-[10px] text-gray-400 italic leading-relaxed">Orders below this amount will bypass manual director L1/L2 approval cycles.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-sky-50/50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/20">
                <h4 className="text-[12px] font-bold text-sky-600 dark:text-sky-400 tracking-widest mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Procurement Compliance Rules
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <Field
    label="Min Supplier Quotes (Low Value)"
    type="number"
    value={settings.minQuotesLow || 0}
    onChange={(e) => isSuperAdmin && setSettings({
      ...settings,
      minQuotesLow: Number(e.target.value)
    })}
    disabled={!isSuperAdmin}
  />
                  <Field
    label="Min Supplier Quotes (High Value)"
    type="number"
    value={settings.minQuotesHigh || 0}
    onChange={(e) => isSuperAdmin && setSettings({
      ...settings,
      minQuotesHigh: Number(e.target.value)
    })}
    disabled={!isSuperAdmin}
  />
                </div>
                <p className="mt-2 text-[10px] text-gray-400 italic leading-relaxed">Required number of quotations for procurement verification phase before generating PO.</p>
              </div>
            </div>

            {isSuperAdmin && <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <Btn
    label="Commit Policies"
    icon={Check}
    onClick={handleCommitSettings}
    loading={actionLoading}
    shadow
  />
              </div>}
          </div>
        </Card>}

      {
    /* APPROVERS TAB */
  }
      {activeTab === "approvers" && <Card className="p-6 space-y-6 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="border-b border-gray-100 dark:border-gray-700/50 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-black text-gray-900 dark:text-white tracking-tight">Approval Hierarchy</h3>
              <p className="text-xs text-gray-500 mt-0.5">Names printed on PO PDF under the approval signature section</p>
            </div>
            <Users className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`space-y-4 ${!isSuperAdmin ? "opacity-60 pointer-events-none" : ""}`}>
              <Field
    label="Purchase Coordinator (Initiator)"
    placeholder="e.g. Vijay Kushwah"
    value={settings.approvers?.purchaseCoord || ""}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, approvers: { ...settings.approvers, purchaseCoord: e.target.value } })}
    disabled={!isSuperAdmin}
  />
              {/* L1 */}
              <div className="space-y-1.5">
                <Field
    label="L1 Approver — AGM Purchase"
    placeholder="e.g. Akhilesh Singh"
    value={settings.approvers?.l1 || ""}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, approvers: { ...settings.approvers, l1: e.target.value } })}
    disabled={!isSuperAdmin}
  />
                <label className="flex items-center justify-between px-1 cursor-pointer select-none">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Bypass L1 Approval</span>
                  <button
                    type="button"
                    onClick={() => isSuperAdmin && setSettings({ ...settings, bypassApprovals: { ...settings.bypassApprovals, l1: !settings.bypassApprovals?.l1 } })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${settings.bypassApprovals?.l1 ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${settings.bypassApprovals?.l1 ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </label>
              </div>
              {/* L2 */}
              <div className="space-y-1.5">
                <Field
    label="L2 Approver — Project Head / Manager"
    placeholder="e.g. Jinesh Jain"
    value={settings.approvers?.l2 || ""}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, approvers: { ...settings.approvers, l2: e.target.value } })}
    disabled={!isSuperAdmin}
  />
                <label className="flex items-center justify-between px-1 cursor-pointer select-none">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Bypass L2 Approval</span>
                  <button
                    type="button"
                    onClick={() => isSuperAdmin && setSettings({ ...settings, bypassApprovals: { ...settings.bypassApprovals, l2: !settings.bypassApprovals?.l2 } })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${settings.bypassApprovals?.l2 ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${settings.bypassApprovals?.l2 ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </label>
              </div>
              {/* L3 */}
              <div className="space-y-1.5">
                <Field
    label="L3 Approver — Director (Final Sign-off)"
    placeholder="e.g. Rahul Gupta"
    value={settings.approvers?.l3 || ""}
    onChange={(e) => isSuperAdmin && setSettings({ ...settings, approvers: { ...settings.approvers, l3: e.target.value } })}
    disabled={!isSuperAdmin}
  />
                <label className="flex items-center justify-between px-1 cursor-pointer select-none">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Bypass L3 Approval</span>
                  <button
                    type="button"
                    onClick={() => isSuperAdmin && setSettings({ ...settings, bypassApprovals: { ...settings.bypassApprovals, l3: !settings.bypassApprovals?.l3 } })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${settings.bypassApprovals?.l3 ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${settings.bypassApprovals?.l3 ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </label>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 self-start">
              <h4 className="text-[11px] font-black text-orange-600 dark:text-orange-400 tracking-widest mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Preview — PO PDF Signature Row
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
    { role: "PURCHASE COORD", name: settings.approvers?.purchaseCoord || "—" },
    { role: "AGM (L1)", name: settings.approvers?.l1 || "—" },
    { role: "PM / HEAD (L2)", name: settings.approvers?.l2 || "—" },
    { role: "DIRECTOR (L3)", name: settings.approvers?.l3 || "—" }
  ].map((a) => <div key={a.role} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    <p className="text-[9px] font-black text-gray-400 tracking-widest mb-1">{a.role}</p>
                    <p className="text-[12px] font-bold text-gray-800 dark:text-gray-200 truncate">{a.name}</p>
                    <div className="mt-2 h-px bg-gray-200 dark:bg-gray-700" />
                    <p className="text-[8px] text-gray-400 mt-1">Signature</p>
                  </div>)}
              </div>
              <p className="text-[9px] text-gray-400 mt-3 italic">This appears at the bottom of every generated PO PDF.</p>
            </div>
          </div>

          {isSuperAdmin && <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-end">
              <Btn
    label="Save Approvers"
    icon={Check}
    onClick={handleCommitSettings}
    loading={actionLoading}
    shadow
  />
            </div>}
        </Card>}

      {
    /* COMPANIES TAB */
  }
      {activeTab === "companies" && (
        <Card className="p-6 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" /> My Companies (Legal Entities)
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">These are the billing companies used in Purchase Orders.</p>
            </div>
            {isSuperAdmin && (settings.companies || []).length > 0 && (
              <Btn
                label="Save to Database"
                icon={Check}
                small
                onClick={async () => { try { await saveSettings(settings); toast.success("Companies saved!"); } catch { toast.error("Save failed"); } }}
                loading={actionLoading}
              />
            )}
          </div>

          {/* Add new company form */}
          {isSuperAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <Field
                label="Company Name"
                placeholder="Legal Name"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
              />
              <Field
                label="GSTIN"
                placeholder="e.g. 23AACCG4572A1Z5"
                value={newCompany.gstin}
                onChange={(e) => setNewCompany({ ...newCompany, gstin: e.target.value })}
              />
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Field
                    label="Address"
                    placeholder="Full registered address"
                    value={newCompany.address}
                    onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                  />
                </div>
                <button
                  onClick={addCompany}
                  className="mb-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all flex items-center gap-1.5 text-[12px] font-bold cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          )}

          {/* Company list */}
          <div className="space-y-3">
            {(settings.companies || []).map((co, idx) => (
              <div key={idx} className={`flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl transition-all ${isSuperAdmin ? "group hover:border-primary/30 hover:shadow-sm" : ""}`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{co.name}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      {co.gstin && <p className="text-[10px] font-mono text-primary font-bold bg-primary/5 px-1.5 py-0.5 rounded">GST: {co.gstin}</p>}
                      {co.address && <p className="text-[10px] text-gray-500 truncate max-w-sm">{co.address}</p>}
                    </div>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2">
                    <button
                      onClick={() => { setEditingCompanyIdx(idx); setEditCompanyDraft({ ...co }); }}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeCompany(idx)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {(!settings.companies || settings.companies.length === 0) && (
              <div className="text-center py-12">
                <Building className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-[13px] text-gray-400 font-medium">No companies added yet</p>
                <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">Add your first legal entity above</p>
              </div>
            )}
          </div>

          {/* Edit Company Modal */}
          {editingCompanyIdx !== null && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-[14px] font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" /> Edit Company
                  </h3>
                  <button onClick={() => setEditingCompanyIdx(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <CloseIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <Field
                    label="Company Name"
                    placeholder="Legal Name"
                    value={editCompanyDraft.name}
                    onChange={e => setEditCompanyDraft({ ...editCompanyDraft, name: e.target.value })}
                  />
                  <Field
                    label="GSTIN"
                    placeholder="e.g. 23AACCG4572A1Z5"
                    value={editCompanyDraft.gstin}
                    onChange={e => setEditCompanyDraft({ ...editCompanyDraft, gstin: e.target.value })}
                  />
                  <Field
                    label="Address"
                    placeholder="Full registered address"
                    value={editCompanyDraft.address}
                    onChange={e => setEditCompanyDraft({ ...editCompanyDraft, address: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                  <Btn label="Cancel" outline onClick={() => setEditingCompanyIdx(null)} />
                  <Btn label="Save Changes" icon={Check} onClick={saveEditCompany} loading={actionLoading} />
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {
    /* MASTER DATA TAB */
  }
      {activeTab === "master-data" && <Card className="p-6 space-y-6 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-black text-gray-900 dark:text-white tracking-tight">Master Data Management</h3>
              <p className="text-xs text-gray-500">Configure global choices loaded inside dropdown filters and selectors</p>
            </div>
            <Key className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ListManager
    title="Projects"
    icon={FileText}
    value={newItem.projects}
    onChange={(val) => setNewItem({ ...newItem, projects: val })}
    onAdd={() => addItemToList("projects")}
    onRemove={(item) => removeItemFromList("projects", item)}
    items={settings.projects || []}
    disabled={!isSuperAdmin}
  />
            <ListManager
    title="Engineers / Requesters"
    icon={Users}
    value={newItem.requesters}
    onChange={(val) => setNewItem({ ...newItem, requesters: val })}
    onAdd={() => addItemToList("requesters")}
    onRemove={(item) => removeItemFromList("requesters", item)}
    items={settings.requesters || []}
    disabled={!isSuperAdmin}
  />
            <ListManager
    title="Categories"
    icon={SettingsIcon}
    value={newItem.categories}
    onChange={(val) => setNewItem({ ...newItem, categories: val })}
    onAdd={() => addItemToList("categories")}
    onRemove={(item) => removeItemFromList("categories", item)}
    items={settings.categories || []}
    disabled={!isSuperAdmin}
  />
            <ListManager
    title="Units (UOM)"
    icon={ShieldAlert}
    value={newItem.units}
    onChange={(val) => setNewItem({ ...newItem, units: val })}
    onAdd={() => addItemToList("units")}
    onRemove={(item) => removeItemFromList("units", item)}
    items={settings.units || []}
    disabled={!isSuperAdmin}
  />
            <ListManager
    title="Work Types"
    icon={Key}
    value={newItem.workTypes}
    onChange={(val) => setNewItem({ ...newItem, workTypes: val })}
    onAdd={() => addItemToList("workTypes")}
    onRemove={(item) => removeItemFromList("workTypes", item)}
    items={settings.workTypes || []}
    disabled={!isSuperAdmin}
  />
            <ListManager
    title="Stores / Godowns"
    icon={Building}
    value={newItem.stores}
    onChange={(val) => setNewItem({ ...newItem, stores: val })}
    onAdd={() => addItemToList("stores")}
    onRemove={(item) => removeItemFromList("stores", item)}
    items={settings.stores || []}
    disabled={!isSuperAdmin}
  />
            <ListManager
    title="GST Rates (%)"
    icon={Percent}
    value={newItem.gstRates}
    onChange={(val) => setNewItem({ ...newItem, gstRates: val })}
    onAdd={async () => {
      if (!newItem.gstRates.trim()) return;
      try {
        await addGSTRate(newItem.gstRates.trim());
        setNewItem({ ...newItem, gstRates: "" });
      } catch {}
    }}
    onRemove={async (item) => {
      const found = gstRates.find((r) => r.rate === parseInt(item));
      if (found) await removeGSTRate(found._id);
    }}
    items={gstRates.length ? gstRates.map((r) => `${r.rate}%`) : ["0%", "5%", "12%", "18%", "28%"]}
    disabled={!isSuperAdmin}
  />

          </div>

          {isSuperAdmin && <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <Btn
    label="Commit Databases"
    icon={Check}
    onClick={handleCommitSettings}
    loading={actionLoading}
    shadow
  />
            </div>}
        </Card>}
    </div>;
}, "SettingsPage");
const DatabaseIcon = /* @__PURE__ */ __name((props) => <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  {...props}
>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>, "DatabaseIcon");
export {
  SettingsPage
};
