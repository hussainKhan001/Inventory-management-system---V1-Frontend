var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Btn, StatusBadge, Field, Modal, DateField, ConfirmModal } from "../components/ui";
import { FilterRow, SearchFilter, SelectFilter } from "../components/ui/Filters";
import { ShieldAlert, Settings, Users, FileText, UserPlus, Pencil, Trash2, Key, Check, X as CloseIcon, ArrowLeft, Eye, EyeOff, Plus, Search, Phone, BadgeInfo, Briefcase, Building2, Calendar, Lock, Shield } from "lucide-react";
import { fmtCur } from "../utils";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
const PERMISSION_GROUPS = [
  {
    id: "core",
    name: "System & Core",
    perms: [
      "VIEW_DASHBOARD",
      "VIEW_ADMIN_DASHBOARD",
      "VIEW_AGM_DASHBOARD",
      "VIEW_STORE_DASHBOARD",
      "VIEW_ENGINEER_DASHBOARD",
      "MANAGE_USERS",
      "VIEW_PUBLIC_PORTAL"
    ]
  },
  {
    id: "reports",
    name: "Reports",
    perms: ["VIEW_REPORTS", "VIEW_DAILY_REPORT", "VIEW_STOCK_CHECK_REPORTS", "VIEW_AUDIT_LOGS"]
  },
  {
    id: "catalogue",
    name: "Catalogue",
    perms: ["VIEW_CATALOGUE", "CREATE_CATALOGUE", "EDIT_CATALOGUE", "DELETE_CATALOGUE"]
  },
  {
    id: "suppliers",
    name: "Suppliers",
    perms: ["VIEW_SUPPLIERS", "CREATE_SUPPLIER", "EDIT_SUPPLIER", "DELETE_SUPPLIER"]
  },
  {
    id: "inventory",
    name: "Inventory",
    perms: ["VIEW_INVENTORY", "CREATE_INVENTORY", "EDIT_INVENTORY", "DELETE_INVENTORY"]
  },
  {
    id: "planning",
    name: "Material Planning",
    perms: ["VIEW_MATERIAL_PLAN", "CREATE_MATERIAL_PLAN", "EDIT_MATERIAL_PLAN", "DELETE_MATERIAL_PLAN", "APPROVE_MATERIAL_PLAN", "REJECT_MATERIAL_PLAN"]
  },
  {
    id: "requirement",
    name: "Material Requirement",
    perms: [
      "VIEW_MATERIAL_REQUIREMENT",
      "CREATE_MATERIAL_REQUIREMENT",
      "EDIT_MATERIAL_REQUIREMENT",
      "DELETE_MATERIAL_REQUIREMENT",
      "SAVE_MR_ITEM",
      "APPROVE_MATERIAL_REQUIREMENT",
      "REJECT_MR",
      "ALLOCATE_MR",
      "EDIT_MR_PURCHASE",
      "APPROVE_MR_STORE",
      "APPROVE_MR_AGM",
      "REVISE_MR",
      "GET_QUOTATION_LINK",
      "TOGGLE_QUOTATION_LINK",
      "VIEW_MR_PO_PENDING_TAB",
      "VIEW_MR_ALLOCATIONS_TAB",
      "VIEW_MR_GRN_READY_TAB"
    ]
  },
  {
    id: "quotations",
    name: "Quotations",
    perms: ["VIEW_QUOTATIONS", "CREATE_QUOTATION", "EDIT_QUOTATION", "DELETE_QUOTATION", "APPROVE_QUOTATION", "REJECT_QUOTATION", "VIEW_QUOTATION_DETAILS"]
  },
  {
    id: "pos",
    name: "Purchase Orders",
    perms: [
      "VIEW_PURCHASE_ORDERS",
      "CREATE_PURCHASE_ORDER",
      "EDIT_PURCHASE_ORDER",
      "DELETE_PURCHASE_ORDER",
      "APPROVE_PURCHASE_ORDER_L1",
      "APPROVE_PURCHASE_ORDER_L2",
      "APPROVE_PURCHASE_ORDER_L3",
      "REJECT_PURCHASE_ORDER",
      "CLOSE_PURCHASE_ORDER",
      "CANCEL_PURCHASE_ORDER"
    ]
  },
  {
    id: "grn",
    name: "GRN",
    perms: ["VIEW_GRN", "CREATE_GRN", "EDIT_GRN", "EDIT_GRN_RECEIPT", "DELETE_GRN"]
  },
  {
    id: "inward",
    name: "Inward",
    perms: ["VIEW_INWARD", "CREATE_INWARD", "EDIT_INWARD", "DELETE_INWARD"]
  },
  {
    id: "outward",
    name: "Outward",
    perms: ["VIEW_OUTWARD", "CREATE_OUTWARD", "EDIT_OUTWARD", "DELETE_OUTWARD"]
  },
  {
    id: "inward_return",
    name: "Inward Return",
    perms: ["VIEW_INWARD_RETURN", "CREATE_INWARD_RETURN", "EDIT_INWARD_RETURN", "DELETE_INWARD_RETURN"]
  },
  {
    id: "outward_return",
    name: "Outward Return",
    perms: ["VIEW_OUTWARD_RETURN", "CREATE_OUTWARD_RETURN", "EDIT_OUTWARD_RETURN", "DELETE_OUTWARD_RETURN"]
  },
  {
    id: "transfer_inward",
    name: "Transfer Inward",
    perms: ["VIEW_TRANSFER_INWARD", "CREATE_TRANSFER_INWARD", "EDIT_TRANSFER_INWARD", "DELETE_TRANSFER_INWARD"]
  },
  {
    id: "transfer_outward",
    name: "Transfer Outward",
    perms: ["VIEW_TRANSFER_OUTWARD", "CREATE_TRANSFER_OUTWARD", "EDIT_TRANSFER_OUTWARD", "DELETE_TRANSFER_OUTWARD"]
  },
  {
    id: "write_offs",
    name: "Write Offs",
    perms: ["VIEW_WRITE_OFFS", "CREATE_WRITE_OFF", "EDIT_WRITE_OFF", "DELETE_WRITE_OFF", "APPROVE_WRITE_OFF"]
  },
  {
    id: "stock_check",
    name: "Stock Check",
    perms: ["VIEW_STOCK_CHECK", "CREATE_STOCK_CHECK", "APPROVE_STOCK_CHECK", "VIEW_STOCK_CHECK_REPORTS", "DELETE_STOCK_CHECK_REPORT"]
  },
  {
    id: "accounts",
    name: "Accounts & Payments",
    perms: ["VIEW_ACCOUNTS", "VERIFY_BILL", "REJECT_BILL", "MAKE_PAYMENT", "VIEW_PAYMENTS"]
  },
  {
    id: "archive",
    name: "Archive",
    perms: ["VIEW_ARCHIVE", "RESTORE_ARCHIVE"]
  }
];
const ListManager = /* @__PURE__ */ __name(({
  title,
  listKey,
  icon: Icon,
  value,
  onChange,
  onAdd,
  onRemove,
  items
}) => <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
    <h4 className="text-[12px] font-bold text-gray-700 dark:text-gray-300 tracking-widest mb-3 flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      {title}
    </h4>
    <div className="flex gap-2 mb-3">
      <input
  type="text"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && onAdd()}
  placeholder={`Add new ${title.slice(0, -1).toLowerCase()}...`}
  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30"
/>
      <button
  onClick={onAdd}
  className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
>
        <Plus className="w-4 h-4" />
      </button>
    </div>
    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
      {items.map((item) => <div
  key={item}
  className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-400 group hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
>
          {item}
          <button
  onClick={() => onRemove(item)}
  className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
>
            <CloseIcon className="w-3 h-3" />
          </button>
        </div>)}
      {items.length === 0 && <p className="text-[10px] text-gray-400 italic">No items added yet</p>}
    </div>
  </div>, "ListManager");
const SuperAdmin = /* @__PURE__ */ __name(() => {
  const {
    user,
    pos,
    updatePO,
    settings,
    setSettings,
    saveSettings,
    actionLoading,
    loading,
    users,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    rolePermissions,
    fetchRolePermissions,
    updateRolePermissions,
    deleteRolePermissions,
    renameRolePermissions,
    hasPermission,
    fetchResource
  } = useAppStore();
  const [tab, setTab] = useState("overview");
  const [subTab, setSubTab] = useState("users");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isManagingPerms, setIsManagingPerms] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [renamingRole, setRenamingRole] = useState(null);
  const [newNameForRole, setNewNameForRole] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [deletingRole, setDeletingRole] = useState(null);
  const [drawerUser, setDrawerUser] = useState(null);
  const [showDrawerPass, setShowDrawerPass] = useState(false);
  const [overrideSearch, setOverrideSearch] = useState("");
  const [overrideStartDate, setOverrideStartDate] = useState("");
  const [overrideEndDate, setOverrideEndDate] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const DEPARTMENTS = ["Civil", "Electrical", "Plumbing", "Mechanical", "Store", "Accounts", "Management", "IT", "HR", "Other"];
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    phone: "",
    designation: "",
    department: "",
    employeeId: ""
  });
  useEffect(() => {
    if (tab === "users" && hasPermission("MANAGE_USERS")) {
      fetchUsers();
      fetchRolePermissions();
    }
    fetchResource("pos", 1, 1e3, true);
    fetchResource("settings", 1, 1, true);
  }, [tab, hasPermission, fetchUsers, fetchRolePermissions, fetchResource]);
  const handleUpdateRolePermissions = /* @__PURE__ */ __name(async (role, permissions) => {
    try {
      await updateRolePermissions(role, permissions);
    } catch (err) {
    }
  }, "handleUpdateRolePermissions");
  const handleAddRole = /* @__PURE__ */ __name(async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      await updateRolePermissions(newRoleName.trim(), []);
      setNewRoleName("");
      setShowAddRoleModal(false);
    } catch (err) {
    }
  }, "handleAddRole");
  const ROLES_LIST = Array.from(/* @__PURE__ */ new Set([
    "Super Admin",
    "Director",
    "AGM",
    "Head",
    "Purchase coordinator",
    "Inventory Manager",
    "Project Manager",
    "Site Engineer",
    "Store Incharge",
    "Accountant",
    "admin",
    "superadmin",
    "manager",
    "staff",
    ...rolePermissions.map((rp) => rp.role)
  ]));
  const handleAddUser = /* @__PURE__ */ __name(async (e) => {
    e.preventDefault();
    try {
      await addUser(newUser);
      setShowAddModal(false);
      setNewUser({ name: "", email: "", password: "", role: "staff", phone: "", designation: "", department: "", employeeId: "" });
    } catch (err) {
    }
  }, "handleAddUser");
  const handleUpdateUserBasic = /* @__PURE__ */ __name(async () => {
    if (!selectedUser) return;
    try {
      const updateData = {
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        phone: selectedUser.phone || "",
        designation: selectedUser.designation || "",
        department: selectedUser.department || "",
        employeeId: selectedUser.employeeId || ""
      };
      if (editPassword) {
        updateData.password = editPassword;
      }
      await updateUser(selectedUser._id, updateData);
      toast.success("User details updated successfully");
      if (editPassword) setEditPassword("");
      setIsManagingPerms(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error("Failed to update user details");
    }
  }, "handleUpdateUserBasic");
  const toggleUserStatus = /* @__PURE__ */ __name(async (user2) => {
    try {
      await updateUser(user2._id, { isActive: !user2.isActive });
    } catch (err) {
    }
  }, "toggleUserStatus");
  const totalValue = pos.reduce((sum, p) => sum + p.totalValue, 0);
  const pendingPOs = pos.filter(
    (p) => ["Pending L1", "Pending L2", "Pending L3"].includes(p.status)
  );
  const filteredOverridePOs = pos.filter((po) => {
    const matchesSearch = !overrideSearch.trim() || po.id.toLowerCase().includes(overrideSearch.trim().toLowerCase()) || po.project.toLowerCase().includes(overrideSearch.trim().toLowerCase()) || po.supplier.toLowerCase().includes(overrideSearch.trim().toLowerCase());
    const poDate = new Date(po.date).getTime();
    const start = overrideStartDate ? new Date(overrideStartDate).getTime() : 0;
    const end = overrideEndDate ? new Date(overrideEndDate).getTime() : Infinity;
    const matchesDate = poDate >= start && poDate <= end + 864e5;
    return matchesSearch && matchesDate;
  });
  const handleForceApprove = /* @__PURE__ */ __name(async (id) => {
    await updatePO(id, {
      status: "Approved",
      approvalL1: "Approved",
      approvalL2: "Approved",
      approvalL3: "Approved"
    });
  }, "handleForceApprove");
  const handleBlock = /* @__PURE__ */ __name(async (id) => {
    await updatePO(id, { status: "Blocked" });
  }, "handleBlock");
  const handleSaveSettings = /* @__PURE__ */ __name(async (passedSettings) => {
    try {
      const dataToSave = passedSettings && "poThreshold" in passedSettings ? passedSettings : settings;
      await saveSettings(dataToSave);
      if (passedSettings === settings || !passedSettings || !("poThreshold" in passedSettings)) {
        toast.success("System settings updated successfully");
      }
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
    }
  }, "handleSaveSettings");
  const [newItem, setNewItem] = useState({
    projects: "",
    requesters: "",
    categories: "",
    units: "",
    workTypes: ""
  });
  const [newCompany, setNewCompany] = useState({ name: "", gstin: "", address: "" });
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
    const updatedCompanies = settings.companies.filter((_, i) => i !== index);
    const updatedSettings = { ...settings, companies: updatedCompanies };
    setSettings(updatedSettings);
    try {
      await saveSettings(updatedSettings);
    } catch (err) {
    }
  }, "removeCompany");
  const addItemToList = /* @__PURE__ */ __name(async (listKey) => {
    const val = newItem[listKey].trim();
    if (!val) return;
    if (settings[listKey].includes(val)) {
      toast.error(`${val} already exists in the list`);
      return;
    }
    const updatedList = [...settings[listKey], val];
    const updatedSettings = { ...settings, [listKey]: updatedList };
    setSettings(updatedSettings);
    setNewItem({ ...newItem, [listKey]: "" });
    try {
      await saveSettings(updatedSettings);
    } catch (err) {
    }
  }, "addItemToList");
  const removeItemFromList = /* @__PURE__ */ __name(async (listKey, item) => {
    const updatedList = settings[listKey].filter((i) => i !== item);
    const updatedSettings = { ...settings, [listKey]: updatedList };
    setSettings(updatedSettings);
    try {
      await saveSettings(updatedSettings);
    } catch (err) {
    }
  }, "removeItemFromList");
  const [permSearch, setPermSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(PERMISSION_GROUPS.map((g) => g.id));
  const toggleGroup = /* @__PURE__ */ __name((groupId) => {
    setExpandedGroups(
      (prev) => prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }, "toggleGroup");
  const handleGroupSelectAll = /* @__PURE__ */ __name((perms, selected) => {
    if (isManagingPerms && selectedUser) {
      let newPerms = [...selectedUser.permissions || []];
      if (selected) {
        perms.forEach((p) => {
          if (!newPerms.includes(p)) newPerms.push(p);
        });
      } else {
        newPerms = newPerms.filter((p) => !perms.includes(p));
      }
      setSelectedUser({ ...selectedUser, permissions: newPerms });
      updateUser(selectedUser._id, { permissions: newPerms });
      return;
    }
    if (selectedRole) {
      const currentRolePerms = rolePermissions.find((rp) => rp.role === selectedRole)?.permissions || [];
      let newPerms = [...currentRolePerms];
      if (selected) {
        perms.forEach((p) => {
          if (!newPerms.includes(p)) newPerms.push(p);
        });
      } else {
        newPerms = newPerms.filter((p) => !perms.includes(p));
      }
      handleUpdateRolePermissions(selectedRole, newPerms);
    }
  }, "handleGroupSelectAll");
  const filteredUsers = users.filter((u) => {
    const matchesSearch = !userSearch.trim() || u.name?.toLowerCase().includes(userSearch.trim().toLowerCase()) || u.email?.toLowerCase().includes(userSearch.trim().toLowerCase()) || u._id?.toLowerCase().includes(userSearch.trim().toLowerCase());
    const matchesRole = userRoleFilter === "" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });
  if (selectedRole) {
    const currentRolePerms = rolePermissions.find((rp) => rp.role === selectedRole)?.permissions || [];
    return <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
      onClick={() => setSelectedRole(null)}
      className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all shadow-sm text-gray-500 hover:text-primary group"
    >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Role permissions protocol</h2>
              <p className="text-xs text-gray-500 font-mono tracking-widest">Editing permissions for: {selectedRole}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full h-fit">
             <ShieldAlert className="w-4 h-4 text-primary" />
             <span className="text-[11px] font-bold text-primary tracking-wider">{selectedRole} authority matrix</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {
      /* Permissions Grid */
    }
          <Card className="p-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="bg-gray-50/50 dark:bg-gray-800/50 p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-[17px] font-black text-gray-900 dark:text-white tracking-tight">Role permission matrix</h3>
                <p className="text-[10px] text-gray-500 tracking-widest font-mono">Assigned authorizations: {currentRolePerms.length}</p>
              </div>
              <div className="relative">
                <Settings className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
      type="text"
      placeholder="Search matrix..."
      value={permSearch}
      onChange={(e) => setPermSearch(e.target.value)}
      className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64 shadow-sm"
    />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {PERMISSION_GROUPS.map((group) => {
      const filteredPerms = group.perms.filter(
        (p) => p.toLowerCase().includes(permSearch.trim().toLowerCase()) || group.name.toLowerCase().includes(permSearch.trim().toLowerCase())
      );
      if (filteredPerms.length === 0) return null;
      const isExpanded = expandedGroups.includes(group.id);
      const allSelected = group.perms.every((p) => currentRolePerms.includes(p));
      const someSelected = group.perms.some((p) => currentRolePerms.includes(p)) && !allSelected;
      return <div key={group.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-gray-800/20">
                    <div
        className={`flex items-center justify-between p-4 cursor-pointer transition-all ${isExpanded ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
        onClick={() => toggleGroup(group.id)}
      >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${allSelected ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>
                          <Key className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-black text-gray-900 dark:text-white tracking-tight">{group.name}</h4>
                          <p className="text-[10px] text-gray-400 font-mono tracking-tight">{filteredPerms.length} Node{filteredPerms.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                        <label className="flex items-center gap-2 cursor-pointer group">
                           <div className="relative inline-flex items-center cursor-pointer">
                             <input
        type="checkbox"
        className="sr-only peer"
        checked={allSelected}
        ref={(el) => {
          if (el) el.indeterminate = someSelected;
        }}
        onChange={(e) => handleGroupSelectAll(group.perms, e.target.checked)}
      />
                             <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary" />
                           </div>
                           <span className="text-[11px] font-black text-gray-500 tracking-widest group-hover:text-primary transition-colors">Select unit</span>
                        </label>
                        <div className={`transform transition-transform duration-300 ${isExpanded ? "rotate-180 text-primary" : "text-gray-400"}`}>
                           <ArrowLeft className="-rotate-90 w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {isExpanded && <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-white dark:bg-gray-900 animate-in slide-in-from-top-2 duration-300">
                        {filteredPerms.map((p) => {
        const isChecked = currentRolePerms.includes(p);
        const isView = p.startsWith("VIEW_");
        const isEdit = p.startsWith("EDIT_") || p.startsWith("CREATE_") || p.startsWith("MANAGE_");
        const isDelete = p.startsWith("DELETE_");
        const isApprove = p.startsWith("APPROVE_");
        const isReject = p.startsWith("REJECT_");
        return <label
          key={p}
          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer group ${isChecked ? "border-primary/20 bg-primary/5 dark:bg-primary/20 shadow-sm" : "border-gray-50 dark:border-gray-800 hover:border-gray-100 dark:hover:border-gray-700"}`}
        >
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-[12px] font-black tracking-tight transition-colors ${isChecked ? "text-primary" : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"}`}>
                                  {(p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).replace(/_/g, " ")}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1 h-1 rounded-full ${isView ? "bg-blue-400" : isEdit ? "bg-amber-400" : isDelete ? "bg-red-400" : isApprove ? "bg-emerald-400" : isReject ? "bg-rose-400" : "bg-gray-400"}`} />
                                  <span className="text-[9px] text-gray-400 tracking-widest font-bold">
                                    {isView ? "Read node" : isEdit ? "Logic write" : isDelete ? "Purge data" : isApprove ? "GM approve" : isReject ? "GM reject" : "Sys-link"}
                                  </span>
                                </div>
                              </div>
                              <div className="relative inline-flex items-center cursor-pointer">
                                <input
          type="checkbox"
          className="sr-only peer"
          checked={isChecked}
          onChange={(e) => {
            const newPerms = e.target.checked ? [...currentRolePerms, p] : currentRolePerms.filter((perm) => perm !== p);
            handleUpdateRolePermissions(selectedRole, newPerms);
          }}
        />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary" />
                              </div>
                            </label>;
      })}
                      </div>}
                  </div>;
    })}
            </div>
          </Card>
        </div>
      </div>;
  }
  if (isManagingPerms && selectedUser) {
    return <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
      onClick={() => {
        setIsManagingPerms(false);
        setEditPassword("");
      }}
      className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all shadow-sm text-gray-500 hover:text-primary group"
    >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Access Control Protocol</h2>
              <p className="text-xs text-gray-500 font-mono tracking-widest">Editing: {selectedUser.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full h-fit">
             <ShieldAlert className="w-4 h-4 text-primary" />
             <span className="text-[11px] font-bold text-primary tracking-wider">{selectedUser.role} Profile</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {
      /* User Info Card */
    }
          <Card className="p-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-indigo-500/10 h-32 relative">
              <div className="absolute -bottom-12 left-8">
                  <div className="w-24 h-24 rounded-3xl bg-white dark:bg-gray-800 p-1 shadow-xl ring-1 ring-black/5">
                    <div className="w-full h-full rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-3xl">
                      {selectedUser.name.charAt(0)}
                    </div>
                  </div>
              </div>
            </div>
            
            <div className="pt-16 p-8 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{selectedUser.name}</h4>
                  <p className="text-sm text-gray-500 font-medium">{selectedUser.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 ${selectedUser.isActive ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                    <div className={`w-2 h-2 rounded-full ${selectedUser.isActive ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                    <span className="text-xs font-black tracking-widest">{selectedUser.isActive ? "Active Node" : "Deactivated"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Full Name</label>
                  <input type="text" value={selectedUser.name} onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })} className="w-full bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Account Role</label>
                  <select className="w-full bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" value={selectedUser?.role} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}>
                    {ROLES_LIST.map((r) => <option key={r} value={r} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Phone Number</label>
                  <input type="text" value={selectedUser.phone || ""} onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })} placeholder="e.g. +91 98765 43210" className="w-full bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Employee ID</label>
                  <input type="text" value={selectedUser.employeeId || ""} onChange={(e) => setSelectedUser({ ...selectedUser, employeeId: e.target.value })} placeholder="e.g. EMP-001" className="w-full bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Designation</label>
                  <input type="text" value={selectedUser.designation || ""} onChange={(e) => setSelectedUser({ ...selectedUser, designation: e.target.value })} placeholder="e.g. Civil Engineer" className="w-full bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Department</label>
                  <select className="w-full bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]" value={selectedUser.department || ""} onChange={(e) => setSelectedUser({ ...selectedUser, department: e.target.value })}>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {
      /* Password section */
    }
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Current Password (stored)</label>
                  <div className="relative">
                    <input
      type={showPass ? "text" : "password"}
      readOnly
      value={selectedUser.plainPassword || "\u2014"}
      className="w-full bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded-xl px-4 py-3 text-[13px] outline-none font-mono font-medium text-amber-700 dark:text-amber-400 pr-10 cursor-default"
    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400 hover:text-primary transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Set New Password</label>
                  <input
      type="password"
      placeholder="Leave blank to keep current"
      value={editPassword}
      onChange={(e) => setEditPassword(e.target.value)}
      className="w-full bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
    />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex items-start gap-4">
                 <ShieldAlert className="w-6 h-6 text-orange-500 dark:text-amber-400 mt-1" />
                 <div>
                    <h5 className="text-[14px] font-bold text-amber-800 dark:text-amber-300">Role-Based Access Notice</h5>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                      Permissions for this user are automatically inherited from the <strong>{selectedUser.role}</strong> role. 
                      To modify access rights, please navigate to the <strong>Roles</strong> tab in the Access Control panel.
                    </p>
                 </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                <Btn
      label="Update User Account"
      icon={Check}
      onClick={handleUpdateUserBasic}
      loading={actionLoading}
      shadow
    />
                <button
      onClick={() => toggleUserStatus(selectedUser)}
      className={`px-6 py-2.5 rounded-xl border text-[13px] font-bold transition-all ${selectedUser.isActive ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/10 dark:border-red-900/20" : "border-green-100 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/10 dark:border-green-900/20"}`}
    >
                  {selectedUser.isActive ? "Suspend Access" : "Restore Access"}
                </button>
              </div>
            </div>
          </Card>
          <button
      onClick={() => {
        setIsManagingPerms(false);
        setEditPassword("");
      }}
      className="w-full py-3 flex items-center justify-center gap-2 text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:text-primary transition-colors group"
    >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Return to User Collective
          </button>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      <PageHeader
    title="Super Admin Panel"
    sub="System configuration and overrides"
  />

      <div className="flex gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl mb-8 overflow-x-auto no-scrollbar scroll-smooth">
        {[
    { id: "overview", label: "Overview", icon: FileText },
    { id: "overrides", label: "Override Approvals", icon: ShieldAlert },
    { id: "users", label: "User & Role Mgmt", icon: Users }
  ].map((t) => <button
    key={t.id}
    onClick={() => setTab(t.id)}
    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[13px] font-bold tracking-wider transition-all duration-200 whitespace-nowrap ${tab === t.id ? "bg-white dark:bg-gray-700 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/30"}`}
  >
            <t.icon className={`w-4 h-4 ${tab === t.id ? "text-primary" : "text-gray-400"}`} />
            {t.label}
          </button>)}
      </div>

      {tab === "overview" && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="relative overflow-hidden group p-0 border-none bg-gradient-to-br from-primary to-indigo-700 text-white shadow-xl shadow-primary/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-24 h-24 -mr-8 -mt-8" />
            </div>
            <div className="p-6 relative z-10">
              <h3 className="text-[12px] font-bold tracking-widest text-primary-foreground/70 mb-1">
                Total PO Value (All Projects)
              </h3>
              <p className="text-4xl font-black tracking-tight">{fmtCur(totalValue)}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-primary-foreground/60 bg-black/10 w-fit px-2 py-1 rounded-full">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                 Last updated just now
              </div>
            </div>
          </Card>

          <Card className="p-6 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-orange-500 dark:text-amber-400 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <StatusBadge status="Pending" />
            </div>
            <h3 className="text-[12px] font-bold tracking-widest text-gray-500 dark:text-gray-400 mb-1">
              Pending Approvals
            </h3>
            <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              {pendingPOs.length}
            </p>
          </Card>

          <Card className="p-6 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-xl">
                <Settings className="w-5 h-5" />
              </div>
              <StatusBadge status="Configured" />
            </div>
            <h3 className="text-[12px] font-bold tracking-widest text-gray-500 dark:text-gray-400 mb-1">
              Auto-Approve Threshold
            </h3>
            <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              {fmtCur(settings.poThreshold)}
            </p>
          </Card>
        </div>}

      {tab === "overrides" && <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <Field
    small
    label="Search Audit POs"
    icon={Search}
    placeholder="Search POs by ID, Project, or Supplier..."
    value={overrideSearch}
    onChange={(e) => setOverrideSearch(e.target.value)}
    className="flex-1 mb-0"
  />
            <div className="flex gap-2">
              <DateField
    small
    label="From Date"
    value={overrideStartDate}
    onChange={(e) => setOverrideStartDate(e.target.value)}
    className="mb-0"
  />
              <DateField
    small
    label="To Date"
    value={overrideEndDate}
    onChange={(e) => setOverrideEndDate(e.target.value)}
    className="mb-0"
  />
              <button
    onClick={() => {
      setOverrideStartDate("");
      setOverrideEndDate("");
      setOverrideSearch("");
    }}
    className="mt-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
    title="Reset Filters"
  >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest">
                      PO No.
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest">
                      Project Details
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest text-right">
                      Total Value
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest text-right">
                      Management
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredOverridePOs.length === 0 ? <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic text-[13px]">
                        No purchase orders found matching the criteria
                      </td>
                    </tr> : filteredOverridePOs.map((po) => <tr key={po.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-all duration-200">
                        <td className="px-6 py-4 text-[13px] font-bold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                            {po.id}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1 font-mono">{new Date(po.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{po.project}</div>
                           <div className="text-[10px] text-gray-400 tracking-tight">{po.supplier}</div>
                        </td>
                        <td className="px-6 py-4 text-[14px] font-black text-right dark:text-gray-300 tabular-nums">
                          {fmtCur(po.totalValue)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={po.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {po.status !== "Approved" && po.status !== "Blocked" && <>
                                <Btn
    label="Approve"
    small
    color="green"
    onClick={() => handleForceApprove(po.id)}
  />
                                <Btn
    label="Block"
    small
    color="red"
    outline
    onClick={() => handleBlock(po.id)}
  />
                              </>}
                          </div>
                        </td>
                      </tr>)}
                </tbody>
              </table>
            </div>
          </Card>
        </div>}

      {tab === "settings" && <Card className="p-8 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden text-center max-w-xl mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Settings Have Moved!</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
            All system configurations, legal entities (companies), threshold limits, database list managers, custom branding, colors, logos, and fonts are now centralized in the new dedicated **Settings Hub** page.
          </p>
          <a
    href="#settings"
    className="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 px-6 py-3 bg-primary text-white hover:bg-primary/90 shadow-sm text-sm w-full cursor-pointer"
  >
            Go to Settings Hub
          </a>
        </Card>}
      {tab === "users" && <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h3 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">System Access Control</h3>
               <p className="text-xs text-gray-500">Manage user accounts, roles, and granular permissions</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                <button
    onClick={() => setSubTab("users")}
    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === "users" ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
  >
                  Users
                </button>
                <button
    onClick={() => setSubTab("roles")}
    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === "roles" ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
  >
                  Roles
                </button>
              </div>
              {subTab === "users" ? <Btn label="Register New User" icon={UserPlus} onClick={() => setShowAddModal(true)} shadow /> : <Btn label="Define New Role" icon={Plus} onClick={() => setShowAddRoleModal(true)} shadow />}
            </div>
          </div>

          {subTab === "users" ? <div className="space-y-4">
              <FilterRow>
                <SearchFilter
    value={userSearch}
    onChange={setUserSearch}
    placeholder="Search by Name, Email, or UID..."
  />
                <SelectFilter
    value={userRoleFilter}
    onChange={setUserRoleFilter}
    options={ROLES_LIST}
    placeholder="All Roles"
  />
              </FilterRow>
              <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest text-nowrap">Identity</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest text-nowrap">Contact Info</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest text-nowrap">Department/Role</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest text-nowrap">Account State</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-widest text-nowrap text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {filteredUsers.length === 0 ? <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic text-[13px]">
                            No users found matching the criteria
                          </td>
                        </tr> : filteredUsers.map((u) => <tr key={u._id} onClick={() => {
    setDrawerUser(u);
    setShowDrawerPass(false);
  }} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-all duration-200 cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-[14px] shadow-inner">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <span className="text-[14px] font-bold text-gray-900 dark:text-white block">{u.name}</span>
                              <span className="text-[10px] text-gray-400 tracking-tight font-mono">UID: {u._id?.slice(-6)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">{u.email}</div>
                           <div className="text-[10px] text-gray-400">Primary authentication method</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${u.role === "Super Admin" || u.role === "admin" || u.role === "superadmin" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : u.role === "Director" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : u.role === "AGM" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : u.role === "Head" ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" : u.role === "Purchase coordinator" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" : u.role === "Project Manager" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : u.role === "Accountant" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : u.role === "Store Incharge" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" : u.role === "manager" ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                              <ShieldAlert className="w-3 h-3" />
                              {u.role}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-gray-400 font-bold tracking-tighter">
                                Role: {rolePermissions.find((rp) => rp.role === u.role)?.permissions?.length || 0}
                              </span>
                              {u.permissions?.length > 0 && <span className="text-[9px] text-indigo-500 font-bold tracking-tighter">
                                  Direct: {u.permissions.length}
                                </span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
    onClick={() => toggleUserStatus(u)}
    className="transform transition-transform active:scale-95"
  >
                            <StatusBadge status={u.isActive ? "Active" : "Inactive"} />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                            <button
    onClick={() => {
      setSelectedUser(u);
      setIsManagingPerms(true);
    }}
    className="p-2 text-gray-400 hover:text-primary transition-all hover:bg-primary/10 rounded-lg active:bg-primary/20"
    title="Edit User"
  >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
    onClick={() => {
      if (u._id === user?._id) {
        toast.error("You cannot delete your own account while logged in.");
        return;
      }
      setDeletingUser(u);
    }}
    className="p-2 text-gray-400 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-lg active:bg-red-500/20"
    title="Delete Account"
  >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </Card>
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ROLES_LIST.map((r) => {
    const permsCount = rolePermissions.find((rp) => rp.role === r)?.permissions?.length || 0;
    return <Card key={r} className="p-6 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <ShieldAlert className="w-16 h-16 -mr-4 -mt-4 text-primary" />
                    </div>
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-gray-400 tracking-widest">{permsCount} Auth Nodes</span>
                          {r !== "Super Admin" && r !== "superadmin" && <div className="flex items-center gap-1">
                            <button
      onClick={(e) => {
        e.stopPropagation();
        setRenamingRole(r);
        setNewNameForRole(r);
      }}
      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/900/10 rounded-lg transition-all"
      title="Rename Role"
    >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
      onClick={(e) => {
        e.stopPropagation();
        setDeletingRole(r);
      }}
      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
      title="Delete Role"
    >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[15px] font-black text-gray-900 dark:text-white tracking-tight">{r}</h4>
                        <p className="text-xs text-gray-500 mt-1">Configure global access rights for this role type.</p>
                      </div>
                      <Btn
      label="Manage Permissions"
      icon={Key}
      outline
      small
      block
      onClick={() => setSelectedRole(r)}
    />
                    </div>
                  </Card>;
  })}
            </div>}

          {
    /* ── User Detail Drawer ────────────────────────────────────────── */
  }
          <AnimatePresence>
          {drawerUser && <>
              {
    /* Backdrop */
  }
              <motion.div
    key="drawer-backdrop"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.22 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40"
    onClick={() => setDrawerUser(null)}
  />

              {
    /* Drawer */
  }
              <motion.div
    key="drawer-panel"
    initial={{ x: "100%" }}
    animate={{ x: 0 }}
    exit={{ x: "100%" }}
    transition={{ type: "tween", duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    className="fixed right-0 top-0 h-full w-full max-w-[560px] z-50 flex flex-col bg-[#0f0f18] border-l border-white/[0.06] shadow-[0_0_80px_rgba(0,0,0,0.7)]"
  >
                {
    /* Top gradient strip */
  }
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

                {
    /* Header */
  }
                <div className="relative shrink-0 px-5 pt-6 pb-5">
                  {
    /* Subtle radial glow behind avatar */
  }
                  <div className="absolute top-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center font-black text-[18px] text-primary shadow-lg shadow-primary/10">
                          {drawerUser.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0f0f18] ${drawerUser.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                      </div>
                      <div>
                        <p className="text-[15px] font-black text-white tracking-tight">{drawerUser.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">UID · {drawerUser._id?.slice(-8)?.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.96 }}
    onClick={() => {
      setSelectedUser(drawerUser);
      setIsManagingPerms(true);
      setDrawerUser(null);
    }}
    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white border border-primary/20 hover:border-primary rounded-lg transition-all"
  >
                        <Pencil className="w-3 h-3" /> Edit
                      </motion.button>
                      <motion.button
    whileHover={{ scale: 1.08, rotate: 90 }}
    whileTap={{ scale: 0.9 }}
    onClick={() => setDrawerUser(null)}
    className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
  >
                        <CloseIcon className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {
    /* Status + Role pills */
  }
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${drawerUser.isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${drawerUser.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                      {drawerUser.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 border border-primary/20 text-primary">
                      <Shield className="w-3 h-3" /> {drawerUser.role}
                    </span>
                  </div>
                </div>

                {
    /* Divider */
  }
                <div className="h-px bg-white/[0.06] mx-5" />

                {
    /* Body */
  }
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 custom-scrollbar">

                  {
    /* Info fields */
  }
                  {[
    { icon: BadgeInfo, label: "EMAIL", value: drawerUser.email, full: true },
    { icon: Phone, label: "PHONE", value: drawerUser.phone || "\u2014" },
    { icon: BadgeInfo, label: "EMPLOYEE ID", value: drawerUser.employeeId || "\u2014" },
    { icon: Briefcase, label: "DESIGNATION", value: drawerUser.designation || "\u2014" },
    { icon: Building2, label: "DEPARTMENT", value: drawerUser.department || "\u2014" },
    { icon: Calendar, label: "JOINED", value: drawerUser.createdAt ? new Date(drawerUser.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014" }
  ].reduce((rows, item, idx, arr) => {
    if (item.full) {
      rows.push([item]);
    } else {
      const last = rows[rows.length - 1];
      if (last && last.length === 1 && !last[0].full) last.push(item);
      else rows.push([item]);
    }
    return rows;
  }, []).map((row, ri) => <div key={ri} className={`grid gap-4 ${row.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {row.map(({ icon: Icon, label, value }) => <div key={label} className="py-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className="w-3.5 h-3.5 text-gray-500" />
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
                          </div>
                          <p className="text-[14px] font-medium text-gray-200 break-all leading-snug">{value}</p>
                        </div>)}
                    </div>)}

                  {
    /* Password */
  }
                  <div className="py-2 mt-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lock className="w-3.5 h-3.5 text-amber-500/70" />
                      <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">Password (Admin View)</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      {drawerUser.plainPassword ? <>
                          <p className={`text-[14px] font-mono font-bold text-amber-300 flex-1 transition-all duration-300 tracking-widest ${!showDrawerPass ? "blur-[5px] select-none" : ""}`}>
                            {drawerUser.plainPassword}
                          </p>
                          <motion.button
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.92 }}
    onClick={() => setShowDrawerPass((p) => !p)}
    className="shrink-0 w-8 h-8 flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-amber-400 transition-all"
  >
                            {showDrawerPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </motion.button>
                        </> : <div className="flex-1 space-y-0.5">
                          <p className="text-[12px] text-amber-500/80 italic">Password not on record for this user.</p>
                          <p className="text-[10px] text-gray-500">
                            Reset via{" "}
                            <span
    className="text-primary font-bold cursor-pointer hover:underline"
    onClick={() => {
      setSelectedUser(drawerUser);
      setIsManagingPerms(true);
      setDrawerUser(null);
    }}
  >
                              Full Edit
                            </span>
                            {" "}to store it here.
                          </p>
                        </div>}
                    </div>
                  </div>

                  {
    /* Permissions */
  }
                  <div className="py-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Shield className="w-3.5 h-3.5 text-gray-500" />
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Permissions</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div>
                        <p className="text-[22px] font-black text-primary leading-none">{rolePermissions.find((rp) => rp.role === drawerUser.role)?.permissions?.length || 0}</p>
                        <p className="text-[10px] text-gray-500 mt-1">From role</p>
                      </div>
                      {drawerUser.permissions?.length > 0 && <>
                          <div className="w-px h-8 bg-white/10" />
                          <div>
                            <p className="text-[22px] font-black text-indigo-400 leading-none">{drawerUser.permissions.length}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Overrides</p>
                          </div>
                        </>}
                    </div>
                  </div>
                </div>

                {
    /* Footer */
  }
                <div className="shrink-0 px-5 py-4 border-t border-white/[0.06] flex gap-3">
                  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => {
      toggleUserStatus(drawerUser);
      setDrawerUser((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
    }}
    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all ${drawerUser.isActive ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}
  >
                    {drawerUser.isActive ? "Suspend Access" : "Restore Access"}
                  </motion.button>
                  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => {
      setSelectedUser(drawerUser);
      setIsManagingPerms(true);
      setDrawerUser(null);
    }}
    className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all"
  >
                    Full Edit
                  </motion.button>
                </div>
              </motion.div>
            </>}
          </AnimatePresence>

          {
    /* Add User Modal */
  }
          {showAddModal && <Modal
    onClose={() => setShowAddModal(false)}
    title="Register New User"
    footer={<div className="w-full">
              <Btn label="Create Account" onClick={() => {
      const form = document.getElementById("add-user-form");
      if (form) form.requestSubmit();
    }} block loading={actionLoading} />
            </div>}
  >
          <form id="add-user-form" onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name *" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
              <Field label="Email *" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
              <Field label="Password *" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
              <Field label="Phone Number" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="e.g. +91 98765 43210" />
              <Field label="Employee ID" value={newUser.employeeId} onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })} placeholder="e.g. EMP-001" />
              <Field label="Designation" value={newUser.designation} onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })} placeholder="e.g. Civil Engineer" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500">Department</label>
                <select
    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:light] dark:[color-scheme:dark]"
    value={newUser.department}
    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
  >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500">Role</label>
                <select
    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:light] dark:[color-scheme:dark]"
    value={newUser.role}
    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
  >
                  {ROLES_LIST.map((r) => <option key={r} value={r} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{r}</option>)}
                </select>
              </div>
            </div>
          </form>
        </Modal>}

          {
    /* Add Role Modal */
  }
          {showAddRoleModal && <Modal
    onClose={() => setShowAddRoleModal(false)}
    title="Define New System Role"
    footer={<div className="w-full">
              <Btn label="Create Role" onClick={() => {
      const form = document.getElementById("add-role-form");
      if (form) form.requestSubmit();
    }} block loading={actionLoading} />
            </div>}
  >
          <form id="add-role-form" onSubmit={handleAddRole} className="space-y-4">
            <Field
    label="Role Name"
    placeholder="e.g. Regional Manager"
    value={newRoleName}
    onChange={(e) => setNewRoleName(e.target.value)}
    required
  />
            <p className="text-[10px] text-gray-500">
              New roles are initialized with zero permissions. You will need to configure their access rights after creation.
            </p>
          </form>
        </Modal>}
        </div>}
      {deletingUser && <ConfirmModal
    title="Delete User Account"
    message={`Are you sure you want to permanently delete the account for ${deletingUser.name} (${deletingUser.email})? This action cannot be undone.`}
    onConfirm={async () => {
      await deleteUser(deletingUser._id || deletingUser.id);
      setDeletingUser(null);
    }}
    onCancel={() => setDeletingUser(null)}
    loading={actionLoading}
  />}
      {deletingRole && <ConfirmModal
    title="Delete System Role"
    message={`Are you sure you want to delete the "${deletingRole}" role? Users currently assigned to this role will lose all associated permissions.`}
    onConfirm={async () => {
      await deleteRolePermissions(deletingRole);
      setDeletingRole(null);
    }}
    onCancel={() => setDeletingRole(null)}
    loading={actionLoading}
  />}
      {renamingRole && <Modal
    onClose={() => setRenamingRole(null)}
    title={`Rename Role: ${renamingRole}`}
    footer={<div className="flex gap-3 w-full">
               <Btn label="Cancel" outline type="button" block onClick={() => setRenamingRole(null)} />
               <Btn label="Rename Role" onClick={() => {
      const form = document.getElementById("rename-role-form");
      if (form) form.requestSubmit();
    }} block loading={actionLoading} />
            </div>}
  >
          <form id="rename-role-form" className="space-y-4" onSubmit={async (e) => {
    e.preventDefault();
    if (!newNameForRole.trim() || newNameForRole === renamingRole) {
      setRenamingRole(null);
      return;
    }
    try {
      await renameRolePermissions(renamingRole, newNameForRole.trim());
      setRenamingRole(null);
    } catch (err) {
    }
  }}>
            <Field
    label="New Role Name"
    value={newNameForRole}
    onChange={(e) => setNewNameForRole(e.target.value)}
    required
  />
            <p className="text-[11px] text-orange-500 font-medium">
              Note: This will also update the role field for all users currently assigned to "{renamingRole}".
            </p>
          </form>
        </Modal>}
    </div>;
}, "SuperAdmin");
export {
  SuperAdmin
};
