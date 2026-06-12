var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SEED_INVENTORY, SEED_SUPPLIERS, SEED_POS, SEED_CATALOGUE, PROJECTS, REQUESTERS, CATEGORIES, UNITS, WORK_TYPES, MY_COMPANIES } from "./data";
import { api } from "./services/api";
import { toast } from "react-hot-toast";
const AppContext = createContext(void 0);
const AppProvider = /* @__PURE__ */ __name(({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );
  const [role, setRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryPagination, setInventoryPagination] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [cataloguePagination, setCataloguePagination] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersPagination, setSuppliersPagination] = useState(null);
  const [pos, setPos] = useState([]);
  const [posPagination, setPosPagination] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansPagination, setPlansPagination] = useState(null);
  const [materialRequirements, setMaterialRequirements] = useState([]);
  const [materialRequirementsPagination, setMaterialRequirementsPagination] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [quotationsPagination, setQuotationsPagination] = useState(null);
  const [grns, setGrns] = useState([]);
  const [grnsPagination, setGrnsPagination] = useState(null);
  const [inwards, setInwards] = useState([]);
  const [inwardsPagination, setInwardsPagination] = useState(null);
  const [outwards, setOutwards] = useState([]);
  const [outwardsPagination, setOutwardsPagination] = useState(null);
  const [inwardReturns, setInwardReturns] = useState([]);
  const [inwardReturnsPagination, setInwardReturnsPagination] = useState(null);
  const [outwardReturns, setOutwardReturns] = useState([]);
  const [outwardReturnsPagination, setOutwardReturnsPagination] = useState(null);
  const [writeOffs, setWriteOffs] = useState([]);
  const [writeOffsPagination, setWriteOffsPagination] = useState(null);
  const [stockCheckReports, setStockCheckReports] = useState([]);
  const [stockCheckReportsPagination, setStockCheckReportsPagination] = useState(null);
  const [mrAllocations, setMrAllocations] = useState([]);
  const [mrAllocationsPagination, setMrAllocationsPagination] = useState(null);
  const [planRevisions, setPlanRevisions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionsPagination, setTransactionsPagination] = useState(null);
  const [availableGatePasses, setAvailableGatePasses] = useState([]);
  const fetchAvailableGatePasses = /* @__PURE__ */ __name(async () => {
    try {
      const res = await api.get("gate-passes/available");
      setAvailableGatePasses(res.data);
      return res.data;
    } catch (error) {
      console.error("Failed to fetch available gate passes:", error);
      return [];
    }
  }, "fetchAvailableGatePasses");
  const [stats, setStats] = useState({
    totalSKUs: 0,
    inStock: 0,
    reusable: 0,
    pendingPOs: 0,
    lowStockCount: 0,
    pendingWriteOffs: 0,
    outOfStock: 0,
    categoriesCount: 0,
    stockByCategory: [],
    todayInward: 0,
    todayOutward: 0
  });
  const [notifications, setNotifications] = useState([]);
  const unreadCount = (notifications || []).filter((n) => !n.read).length;
  const addNotification = /* @__PURE__ */ __name((notification) => {
    const id = notification.id || Math.random().toString(36).substring(7);
    const timestamp = notification.timestamp || (/* @__PURE__ */ new Date()).toISOString();
    setNotifications((prev) => {
      if (prev.some((n) => n.id === id)) return prev;
      const newNotif = {
        ...notification,
        id,
        timestamp,
        read: notification.read ?? false
      };
      return [newNotif, ...prev].slice(0, 100);
    });
  }, "addNotification");
  const markAsRead = /* @__PURE__ */ __name(async (id) => {
    try {
      await api.post(`notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, "markAsRead");
  const markAllAsRead = /* @__PURE__ */ __name(async () => {
    try {
      await api.post("notifications/read-all", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, "markAllAsRead");
  const clearNotifications = /* @__PURE__ */ __name(() => {
    setNotifications([]);
  }, "clearNotifications");
  const [settings, setSettings] = useState({
    poThreshold: 5e4,
    minQuotesLow: 3,
    minQuotesHigh: 5,
    projects: PROJECTS,
    requesters: REQUESTERS,
    categories: CATEGORIES,
    units: UNITS,
    workTypes: WORK_TYPES,
    companies: MY_COMPANIES,
    appName: "Garden City",
    companyFullName: "Neoteric Properties",
    footerText: "",
    logoUrl: "",
    faviconUrl: "",
    themeColor: "#F97316",
    fontFamily: "Inter",
    approvers: {
      purchaseCoord: "Vijay Kushwah",
      l1: "Akhilesh Singh",
      l2: "Jinesh Jain",
      l3: "Rahul Gupta"
    }
  });
  const saveSettings = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      const res = await api.putSimple("settings", data);
      const serverData = res.data || res;
      setSettings((prev) => ({ ...prev, ...serverData, approvers: { ...prev.approvers, ...(serverData.approvers || {}) } }));
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(`Error saving settings: ${error.message || "Unknown error"}`);
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, "saveSettings");
  const [loading, setLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggleTheme = /* @__PURE__ */ __name(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  }, "toggleTheme");
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === "Super Admin" || user.role === "superadmin") return true;
    if (user.permissions?.includes(permission)) return true;
    const rp = rolePermissions.find((p) => p.role === user.role);
    if (rp) {
      return rp.permissions.includes(permission);
    }
    if (user.rolePermissions?.includes(permission)) return true;
    return false;
  }, [user, rolePermissions]);
  const fetchRolePermissions = useCallback(async () => {
    try {
      const res = await api.get("role-permissions");
      if (res.success) {
        setRolePermissions((prev) => JSON.stringify(prev) === JSON.stringify(res.data) ? prev : res.data);
      }
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
    }
  }, []);
  const updateRolePermissions = /* @__PURE__ */ __name(async (role2, permissions) => {
    setActionLoading(true);
    try {
      const res = await api.post("role-permissions", { role: role2, permissions });
      if (res.success) {
        setRolePermissions((prev) => {
          const exists = prev.find((rp) => rp.role === role2);
          if (exists) {
            return prev.map((rp) => rp.role === role2 ? res.data : rp);
          }
          return [...prev, res.data];
        });
        toast.success(`Permissions updated for ${role2}`);
        if (user && user.role === role2) {
          setUser((prev) => prev ? { ...prev, rolePermissions: permissions } : null);
        }
      }
    } catch (error) {
      toast.error(error.message || "Failed to update role permissions");
    } finally {
      setActionLoading(false);
    }
  }, "updateRolePermissions");
  const deleteRolePermissions = /* @__PURE__ */ __name(async (role2) => {
    setActionLoading(true);
    try {
      const res = await api.delete("role-permissions", role2);
      if (res.success) {
        setRolePermissions((prev) => prev.filter((rp) => rp.role !== role2));
        toast.success(`Role ${role2} deleted successfully`);
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete role");
    } finally {
      setActionLoading(false);
    }
  }, "deleteRolePermissions");
  const renameRolePermissions = /* @__PURE__ */ __name(async (oldRole, newRole) => {
    setActionLoading(true);
    try {
      const res = await api.post("role-permissions-rename", { oldRole, newRole });
      if (res.success) {
        setRolePermissions((prev) => prev.map((rp) => rp.role === oldRole ? { ...rp, role: newRole } : rp));
        setUsers((prev) => prev.map((u) => u.role === oldRole ? { ...u, role: newRole } : u));
        toast.success(`Role renamed to ${newRole}`);
      }
    } catch (error) {
      toast.error(error.message || "Failed to rename role");
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, "renameRolePermissions");
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("users");
      if (res.success) {
        setUsers((prev) => JSON.stringify(prev) === JSON.stringify(res.data) ? prev : res.data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, []);
  const addUser = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      const res = await api.post("users", data);
      if (res.success) {
        setUsers((prev) => [res.data, ...prev]);
        toast.success("User added successfully");
      }
    } catch (error) {
      toast.error(error.message || "Failed to add user");
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, "addUser");
  const updateUser = /* @__PURE__ */ __name(async (id, data) => {
    console.log(`[STORE] Attempting to update user with ID: ${id}`, data);
    setActionLoading(true);
    try {
      const res = await api.patch(`users/${id}`, data);
      console.log(`[STORE] Update response:`, res);
      if (res.success) {
        setUsers((prev) => prev.map((u) => u._id === id ? res.data : u));
        toast.success("User updated successfully");
      }
    } catch (error) {
      console.error("Update user error:", error);
      toast.error(error.message || "Failed to update user");
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, "updateUser");
  const deleteUser = /* @__PURE__ */ __name(async (id) => {
    const previousUsers = [...users];
    setUsers((prev) => prev.filter((u) => u._id !== id));
    try {
      if (!id) throw new Error("User ID is required");
      await api.delete("users", id);
      toast.success("User deleted successfully");
    } catch (error) {
      setUsers(previousUsers);
      toast.error(error.message || "Failed to delete user");
      throw error;
    }
  }, "deleteUser");
  const fetchAuditLogs = useCallback(async (search, user, dateRange) => {
    try {
      const params = {};
      if (search) params.search = search;
      if (user) params.user = user;
      if (dateRange?.start) params.startDate = new Date(dateRange.start + "T00:00:00").toISOString();
      if (dateRange?.end) params.endDate = new Date(dateRange.end + "T23:59:59").toISOString();
      
      const res = await api.get("audit-logs", params);
      if (res.success) setAuditLogs(res.data);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    }
  }, []);
  const login = /* @__PURE__ */ __name(async (email, password) => {
    try {
      const res = await api.post("auth/login", { email, password });
      const { user: userData, token } = res.data;
      localStorage.setItem("token", token);
      setUser(userData);
      setRole(userData.role);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      throw error;
    }
  }, "login");
  const changePassword = /* @__PURE__ */ __name(async (currentPassword, newPassword) => {
    setActionLoading(true);
    try {
      const res = await api.post("auth/change-password", { currentPassword, newPassword });
      if (res.success) {
        toast.success("Password changed successfully");
        return true;
      }
      return false;
    } catch (error) {
      toast.error(error.message || "Failed to change password");
      return false;
    } finally {
      setActionLoading(false);
    }
  }, "changePassword");
  const logout = /* @__PURE__ */ __name(async () => {
    await api.post("auth/logout", {});
    localStorage.removeItem("token");
    localStorage.removeItem("originalToken");
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
    window.location.hash = "dashboard";
  }, "logout");
  const isSwitched = !!localStorage.getItem("originalToken");
  const switchUser = /* @__PURE__ */ __name(async (targetUserId) => {
    const currentToken = localStorage.getItem("token");
    const res = await api.post("auth/switch-user", { targetUserId });
    const { user: userData, token } = res.data;
    if (currentToken && !localStorage.getItem("originalToken")) {
      localStorage.setItem("originalToken", currentToken);
    }
    localStorage.setItem("token", token);
    setUser(userData);
    setRole(userData.role);
    setIsAuthenticated(true);
  }, "switchUser");
  const switchBack = /* @__PURE__ */ __name(async () => {
    const originalToken = localStorage.getItem("originalToken");
    if (!originalToken) return;
    localStorage.setItem("token", originalToken);
    localStorage.removeItem("originalToken");
    await checkAuth();
  }, "switchBack");
  const checkAuth = /* @__PURE__ */ __name(async () => {
    setIsAuthLoading(true);
    try {
      const res = await api.get("auth/me");
      if (res.success) {
        const { user: userData, token } = res.data;
        setUser(userData);
        setRole(userData.role);
        setIsAuthenticated(true);
        if (token) {
          localStorage.setItem("token", token);
        }
      } else {
        localStorage.removeItem("token");
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    } finally {
      setIsAuthLoading(false);
    }
  }, "checkAuth");
  const lastFetchRef = React.useRef({});
  const fetchResource = useCallback(async (resource, page = 1, limit = 100, silent = false, search = "", filter = null, append = false, unused = false, startDate = "", endDate = "", force = false) => {
    if (!isAuthenticated && !resource.startsWith("public")) return;
    const cacheKey = `${resource}-${page}-${limit}-${search}-${JSON.stringify(filter)}-${unused}-${startDate}-${endDate}`;
    const now = Date.now();
    if (!force && lastFetchRef.current[cacheKey] && now - lastFetchRef.current[cacheKey] < 1e4 && !append && lastFetchRef.current[`${resource}-last`] === cacheKey) {
      console.log(`[STORE] Skipping redundant fetch for ${resource} (cached)`);
      return;
    }
    lastFetchRef.current[cacheKey] = now;
    lastFetchRef.current[`${resource}-last`] = cacheKey;
    if (!silent) setLoading(true);
    console.log(`Fetching resource: ${resource}, page: ${page}, search: ${search}`);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (filter) params.filter = JSON.stringify(filter);
      if (unused) params.unused = "true";
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get(resource, params);
      if (res.success) {
        console.log(`Fetched ${resource}: ${res.data.length} items`);
        switch (resource) {
          case "inventory":
          case "public/inventory":
            setInventory((prev) => {
              if (search || filter) return res.data;
              if (append) {
                const existingSkus = new Set(prev.map((i) => i.sku || i._id));
                const uniqueNewItems = res.data.filter((i) => !existingSkus.has(i.sku || i._id));
                return [...prev, ...uniqueNewItems];
              }
              if (prev.length > 50 && res.data.length <= 100 && !search && !filter) {
                const updatedSkus = new Set(res.data.map((i) => i.sku || i._id));
                const filteredPrev = prev.filter((item) => !updatedSkus.has(item.sku || item._id));
                return [...res.data, ...filteredPrev];
              }
              return res.data;
            });
            setInventoryPagination(res.pagination);
            break;
          case "catalogue":
          case "public/catalogue":
            setCatalogue((prev) => append ? [...prev, ...res.data] : res.data);
            setCataloguePagination(res.pagination);
            break;
          case "suppliers":
          case "public/suppliers":
            setSuppliers((prev) => append ? [...prev, ...res.data] : res.data);
            setSuppliersPagination(res.pagination);
            break;
          case "pos":
            setPos((prev) => append ? [...prev, ...res.data] : res.data);
            setPosPagination(res.pagination);
            break;
          case "planning":
            setPlans((prev) => append ? [...prev, ...res.data] : res.data);
            setPlansPagination(res.pagination);
            break;
          case "material-requirements":
          case "public/material-requirements":
            setMaterialRequirements((prev) => append ? [...prev, ...res.data] : res.data);
            setMaterialRequirementsPagination(res.pagination);
            break;
          case "quotations":
            setQuotations((prev) => append ? [...prev, ...res.data] : res.data);
            setQuotationsPagination(res.pagination);
            break;
          case "grn":
            setGrns((prev) => append ? [...prev, ...res.data] : res.data);
            setGrnsPagination(res.pagination);
            break;
          case "settings":
          case "public-settings": {
            const serverData = res.data || res || {};
            setSettings((prev) => {
              const updated = {
                poThreshold: serverData.poThreshold ?? prev.poThreshold ?? 5e4,
                minQuotesLow: serverData.minQuotesLow ?? prev.minQuotesLow ?? 3,
                minQuotesHigh: serverData.minQuotesHigh ?? prev.minQuotesHigh ?? 5,
                projects: Array.isArray(serverData.projects) ? serverData.projects : prev.projects ?? PROJECTS,
                requesters: Array.isArray(serverData.requesters) ? serverData.requesters : prev.requesters ?? REQUESTERS,
                categories: Array.isArray(serverData.categories) ? serverData.categories : prev.categories ?? CATEGORIES,
                units: Array.isArray(serverData.units) ? serverData.units : prev.units ?? UNITS,
                workTypes: Array.isArray(serverData.workTypes) ? serverData.workTypes : prev.workTypes ?? WORK_TYPES,
                companies: Array.isArray(serverData.companies) ? serverData.companies : prev.companies ?? MY_COMPANIES,
                appName: serverData.appName ?? prev.appName ?? "Garden City",
                companyFullName: serverData.companyFullName ?? prev.companyFullName ?? "Neoteric Properties",
                footerText: serverData.footerText ?? prev.footerText ?? "",
                logoUrl: serverData.logoUrl ?? prev.logoUrl ?? "",
                faviconUrl: serverData.faviconUrl ?? prev.faviconUrl ?? "",
                themeColor: serverData.themeColor ?? prev.themeColor ?? "#F97316",
                fontFamily: serverData.fontFamily ?? prev.fontFamily ?? "Inter",
                approvers: serverData.approvers ?? prev.approvers ?? {
                  purchaseCoord: "Vijay Kushwah",
                  l1: "Akhilesh Singh",
                  l2: "Jinesh Jain",
                  l3: "Rahul Gupta"
                }
              };
              const isEmpty = !serverData.projects?.length && !serverData.requesters?.length && !serverData.categories?.length && !serverData.units?.length && !serverData.workTypes?.length && !serverData.companies?.length;
              if (resource === "settings" && isEmpty) {
                console.log("[STORE] Settings missing from server, initializing with defaults...");
                api.putSimple("settings", updated).catch((err) => console.error("[STORE] Failed to initialize settings:", err));
              }
              return updated;
            });
            break;
          }
          case "inward":
            setInwards((prev) => append ? [...prev, ...res.data] : res.data);
            setInwardsPagination(res.pagination);
            break;
          case "outward":
            setOutwards((prev) => append ? [...prev, ...res.data] : res.data);
            setOutwardsPagination(res.pagination);
            break;
          case "inward-returns":
            setInwardReturns((prev) => append ? [...prev, ...res.data] : res.data);
            setInwardReturnsPagination(res.pagination);
            break;
          case "outward-returns":
            setOutwardReturns((prev) => append ? [...prev, ...res.data] : res.data);
            setOutwardReturnsPagination(res.pagination);
            break;
          case "writeoffs":
            setWriteOffs((prev) => append ? [...prev, ...res.data] : res.data);
            setWriteOffsPagination(res.pagination);
            break;
          case "stock-check-reports":
            setStockCheckReports((prev) => append ? [...prev, ...res.data] : res.data);
            setStockCheckReportsPagination(res.pagination);
            break;
          case "mr-allocations":
            setMrAllocations((prev) => append ? [...prev, ...res.data] : res.data);
            setMrAllocationsPagination(res.pagination);
            break;
          case "plan-revisions":
            setPlanRevisions(res.data);
            break;
          case "transactions":
            setTransactions((prev) => append ? [...prev, ...res.data] : res.data);
            setTransactionsPagination(res.pagination);
            break;
          case "role-permissions":
            setRolePermissions((prev) => JSON.stringify(prev) === JSON.stringify(res.data) ? prev : res.data);
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${resource}:`, error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated]);
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("stats");
      if (res.success) {
        console.log("Fetched stats:", res.data);
        setStats(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("notifications");
      if (res.success) {
        const mapped = res.data.map((n) => ({
          ...n,
          timestamp: n.createdAt
        }));
        setNotifications(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await Promise.all([
        fetchResource("settings", 1, 1, true),
        fetchRolePermissions()
      ]);
      setTimeout(() => {
        fetchStats();
        fetchNotifications();
        fetchResource("pos", 1, 10, true);
      }, 0);
      try {
        const res = await api.get("inventory", { limit: 1 });
        if (res.success && res.pagination.total === 0) {
          console.log("Database empty, seeding initial data...");
          await api.seed({
            SEED_INVENTORY,
            SEED_CATALOGUE,
            SEED_SUPPLIERS,
            SEED_POS,
            SEED_PLANS: [],
            SEED_GRNS: [],
            SEED_INWARDS: [],
            SEED_OUTWARDS: [],
            SEED_INWARD_RETURNS: [],
            SEED_OUTWARD_RETURNS: [],
            SEED_WRITEOFFS: [],
            SEED_TRANSACTIONS: []
          });
          await refreshData();
        }
      } catch (invErr) {
        console.warn("Could not check inventory for seeding (likely permission issue)");
      }
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  }, [fetchResource, isAuthenticated, fetchStats, fetchNotifications, user]);
  const authRef = React.useRef(isAuthenticated);
  const userRef = React.useRef(user);
  const refreshDataRef = React.useRef(refreshData);
  const fetchResourceRef = React.useRef(fetchResource);
  const fetchStatsRef = React.useRef(fetchStats);
  const fetchRolePermissionsRef = React.useRef(fetchRolePermissions);
  const addNotificationRef = React.useRef(addNotification);
  const inventoryRef = React.useRef(inventory);
  const posRef = React.useRef(pos);
  const mrRef = React.useRef(materialRequirements);
  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);
  useEffect(() => {
    fetchResourceRef.current = fetchResource;
  }, [fetchResource]);
  useEffect(() => {
    fetchStatsRef.current = fetchStats;
  }, [fetchStats]);
  useEffect(() => {
    fetchRolePermissionsRef.current = fetchRolePermissions;
  }, [fetchRolePermissions]);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    mrRef.current = materialRequirements;
  }, [materialRequirements]);
  const updateInventory = /* @__PURE__ */ __name(async (sku, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("inventory", sku, data);
      setInventory((prev) => prev.map((item) => item.sku === sku ? { ...item, ...res.data } : item));
    } finally {
      setActionLoading(false);
    }
  }, "updateInventory");
  const addInventory = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("inventory", data);
      await fetchResource("inventory", 1, 100, true);
    } finally {
      setActionLoading(false);
    }
  }, "addInventory");
  const deleteInventory = /* @__PURE__ */ __name(async (sku) => {
    const previousInventory = [...inventory];
    setInventory((prev) => prev.filter((item) => item.sku !== sku));
    setActionLoading(true);
    try {
      await api.delete("inventory", sku);
      toast.success("Item deleted successfully");
    } catch (error) {
      setInventory(previousInventory);
      toast.error(error.message || "Failed to delete item");
    } finally {
      setActionLoading(false);
    }
  }, "deleteInventory");
  const updateCatalogue = /* @__PURE__ */ __name(async (sku, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("catalogue", sku, data);
      setCatalogue((prev) => prev.map((item) => item.sku === sku ? { ...item, ...res.data } : item));
    } finally {
      setActionLoading(false);
    }
  }, "updateCatalogue");
  const addCatalogue = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("catalogue", data);
      await fetchResource("catalogue", 1, 100, true);
    } finally {
      setActionLoading(false);
    }
  }, "addCatalogue");
  const deleteCatalogue = /* @__PURE__ */ __name(async (sku) => {
    const previousCatalogue = [...catalogue];
    setCatalogue((prev) => prev.filter((item) => item.sku !== sku));
    setActionLoading(true);
    try {
      await api.delete("catalogue", sku);
      toast.success("Catalogue entry deleted");
    } catch (error) {
      setCatalogue(previousCatalogue);
      toast.error(error.message || "Failed to delete catalogue entry");
    } finally {
      setActionLoading(false);
    }
  }, "deleteCatalogue");
  const updateSupplier = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("suppliers", id, data);
      setSuppliers((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
    } finally {
      setActionLoading(false);
    }
  }, "updateSupplier");
  const addSupplier = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("suppliers", data);
      await fetchResource("suppliers");
    } finally {
      setActionLoading(false);
    }
  }, "addSupplier");
  const deleteSupplier = /* @__PURE__ */ __name(async (id) => {
    const previousSuppliers = [...suppliers];
    setSuppliers((prev) => prev.filter((item) => item.id === id ? false : item._id !== id));
    setActionLoading(true);
    try {
      await api.delete("suppliers", id);
      toast.success("Supplier deleted");
    } catch (error) {
      setSuppliers(previousSuppliers);
      toast.error(error.message || "Failed to delete supplier");
    } finally {
      setActionLoading(false);
    }
  }, "deleteSupplier");
  const updatePO = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("pos", id, data);
      setPos((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
    } finally {
      setActionLoading(false);
    }
  }, "updatePO");
  const addPO = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("pos", data);
      await fetchResource("pos");
    } finally {
      setActionLoading(false);
    }
  }, "addPO");
  const deletePO = /* @__PURE__ */ __name(async (id) => {
    const previousPOs = [...pos];
    setPos((prev) => prev.filter((item) => item.id !== id));
    setActionLoading(true);
    try {
      await api.delete("pos", id);
      toast.success("Purchase Order deleted");
      fetchResource("pos", 1, 100, false);
      fetchResource("material-requirements", 1, 100, false, "", null, false, true);
    } catch (error) {
      setPos(previousPOs);
      toast.error(error.message || "Failed to delete PO");
    } finally {
      setActionLoading(false);
    }
  }, "deletePO");
  const updatePlan = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("planning", id, data);
      setPlans((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
    } finally {
      setActionLoading(false);
    }
  }, "updatePlan");
  const addPlan = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("planning", data);
      await fetchResource("planning");
    } finally {
      setActionLoading(false);
    }
  }, "addPlan");
  const deletePlan = /* @__PURE__ */ __name(async (id) => {
    setActionLoading(true);
    try {
      await api.delete("planning", id);
      await fetchResource("planning");
    } finally {
      setActionLoading(false);
    }
  }, "deletePlan");
  const submitPlan = useCallback(async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`planning/${id}/submit`, {});
      if (res.success) setPlans((prev) => prev.map((p) => p.id === id ? { ...p, ...res.data } : p));
      return res;
    } finally {
      setActionLoading(false);
    }
  }, []);
  const approvePlan = useCallback(async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`planning/${id}/approve`, {});
      if (res.success) setPlans((prev) => prev.map((p) => p.id === id ? { ...p, ...res.data } : p));
      return res;
    } finally {
      setActionLoading(false);
    }
  }, []);
  const rejectPlan = useCallback(async (id, reason) => {
    setActionLoading(true);
    try {
      const res = await api.post(`planning/${id}/reject`, { reason });
      if (res.success) setPlans((prev) => prev.map((p) => p.id === id ? { ...p, ...res.data } : p));
      return res;
    } finally {
      setActionLoading(false);
    }
  }, []);
  const createPlanRevision = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      const res = await api.post("plan-revisions", data);
      await fetchResource("plan-revisions", 1, 500, true);
      return res.data;
    } finally {
      setActionLoading(false);
    }
  }, "createPlanRevision");
  const reviewPlanRevision = /* @__PURE__ */ __name(async (id, payload) => {
    setActionLoading(true);
    try {
      const res = await api.put("plan-revisions", id, payload);
      setPlanRevisions((prev) => prev.map((r) => r.id === id ? { ...r, ...res.data } : r));
      await fetchResource("planning", 1, 50, true);
      return res.data;
    } finally {
      setActionLoading(false);
    }
  }, "reviewPlanRevision");
  const updateMaterialRequirement = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("material-requirements", id, data);
      setMaterialRequirements((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
      return res.data;
    } finally {
      setActionLoading(false);
    }
  }, "updateMaterialRequirement");
  const addMaterialRequirement = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      const res = await api.post("material-requirements", data);
      await fetchResource("material-requirements");
      return res.data;
    } finally {
      setActionLoading(false);
    }
  }, "addMaterialRequirement");
  const deleteMaterialRequirement = /* @__PURE__ */ __name(async (id) => {
    const previousMRs = [...materialRequirements];
    setMaterialRequirements((prev) => prev.filter((item) => item.id !== id));
    try {
      await api.delete("material-requirements", id);
      toast.success("Material Requirement deleted");
    } catch (error) {
      setMaterialRequirements(previousMRs);
      toast.error(error.message || "Failed to delete MR");
    }
  }, "deleteMaterialRequirement");
  const updateQuotation = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("quotations", id, data);
      setQuotations((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
      return res.data;
    } finally {
      setActionLoading(false);
    }
  }, "updateQuotation");
  const addQuotation = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("quotations", data);
      await fetchResource("quotations");
    } finally {
      setActionLoading(false);
    }
  }, "addQuotation");
  const deleteQuotation = /* @__PURE__ */ __name(async (id) => {
    const previousQuotations = [...quotations];
    setQuotations((prev) => prev.filter((item) => item.id !== id));
    try {
      await api.delete("quotations", id);
      toast.success("Quotation deleted");
    } catch (error) {
      setQuotations(previousQuotations);
      toast.error(error.message || "Failed to delete quotation");
    }
  }, "deleteQuotation");
  const submitPublicMaterialRequirement = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      const res = await api.post("public/material-requirement", data);
      toast.success("Requirement submitted");
      return res.data;
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, "submitPublicMaterialRequirement");
  const submitPublicSupplierRegistration = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("public/supplier-registration", data);
      toast.success("Registration submitted");
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, "submitPublicSupplierRegistration");
  const updateGRN = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("grn", id, data);
      setGrns((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
    } finally {
      setActionLoading(false);
    }
  }, "updateGRN");
  const addGRN = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("grn", data);
      await fetchResource("grn");
    } finally {
      setActionLoading(false);
    }
  }, "addGRN");
  const deleteGRN = /* @__PURE__ */ __name(async (id) => {
    const previousGRNs = [...grns];
    setGrns((prev) => prev.filter((item) => item.id !== id));
    setActionLoading(true);
    try {
      await api.delete("grn", id);
      toast.success("GRN deleted");
    } catch (error) {
      setGrns(previousGRNs);
      toast.error(error.message || "Failed to delete GRN");
    } finally {
      setActionLoading(false);
    }
  }, "deleteGRN");
  const updateInward = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("inward", id, data);
      setInwards((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
      await fetchResource("inventory", 1, 100, true);
    } finally {
      setActionLoading(false);
    }
  }, "updateInward");
  const addInward = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("inward", data);
      await Promise.all([
        fetchResource("inward", 1, 100, true),
        fetchResource("inventory", 1, 100, true)
      ]);
    } finally {
      setActionLoading(false);
    }
  }, "addInward");
  const deleteInward = /* @__PURE__ */ __name(async (id) => {
    const previousInwards = [...inwards];
    setInwards((prev) => prev.filter((item) => item.id !== id));
    setActionLoading(true);
    try {
      await api.delete("inward", id);
      toast.success("Inward deleted");
      await Promise.all([
        fetchResource("inventory", 1, 100, true),
        fetchResource("material-requirements", 1, 100, true)
      ]);
    } catch (error) {
      setInwards(previousInwards);
      toast.error(error.message || "Failed to delete inward");
    } finally {
      setActionLoading(false);
    }
  }, "deleteInward");
  const updateOutward = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("outward", id, data);
      setOutwards((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
      await fetchResource("inventory", 1, 100, true);
    } finally {
      setActionLoading(false);
    }
  }, "updateOutward");
  const addOutward = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("outward", data);
      await Promise.all([
        fetchResource("outward"),
        fetchResource("inventory", 1, 100, true)
      ]);
    } finally {
      setActionLoading(false);
    }
  }, "addOutward");
  const deleteOutward = /* @__PURE__ */ __name(async (id) => {
    const previousOutwards = [...outwards];
    setOutwards((prev) => prev.filter((item) => item.id !== id));
    setActionLoading(true);
    try {
      await api.delete("outward", id);
      toast.success("Outward deleted");
      await Promise.all([
        fetchResource("inventory", 1, 100, true),
        fetchResource("material-requirements", 1, 100, true)
      ]);
    } catch (error) {
      setOutwards(previousOutwards);
      toast.error(error.message || "Failed to delete outward");
    } finally {
      setActionLoading(false);
    }
  }, "deleteOutward");
  const updateInwardReturn = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("inward-returns", id, data);
      setInwardReturns((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
      await fetchResource("inventory", 1, 100, true);
    } finally {
      setActionLoading(false);
    }
  }, "updateInwardReturn");
  const addInwardReturn = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("inward-returns", data);
      await Promise.all([
        fetchResource("inward-returns"),
        fetchResource("inventory", 1, 100, true)
      ]);
    } finally {
      setActionLoading(false);
    }
  }, "addInwardReturn");
  const deleteInwardReturn = /* @__PURE__ */ __name(async (id) => {
    const previousReturns = [...inwardReturns];
    setInwardReturns((prev) => prev.filter((item) => item.id !== id));
    setActionLoading(true);
    try {
      await api.delete("inward-returns", id);
      toast.success("Inward return deleted");
      fetchResource("inventory", 1, 100, true);
    } catch (error) {
      setInwardReturns(previousReturns);
      toast.error(error.message || "Failed to delete inward return");
    } finally {
      setActionLoading(false);
    }
  }, "deleteInwardReturn");
  const updateOutwardReturn = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("outward-returns", id, data);
      setOutwardReturns((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
      await fetchResource("inventory", 1, 1e3, true);
    } finally {
      setActionLoading(false);
    }
  }, "updateOutwardReturn");
  const addOutwardReturn = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("outward-returns", data);
      await Promise.all([
        fetchResource("outward-returns"),
        fetchResource("inventory", 1, 100, true)
      ]);
    } finally {
      setActionLoading(false);
    }
  }, "addOutwardReturn");
  const deleteOutwardReturn = /* @__PURE__ */ __name(async (id) => {
    const previousReturns = [...outwardReturns];
    setOutwardReturns((prev) => prev.filter((item) => item.id !== id));
    setActionLoading(true);
    try {
      await api.delete("outward-returns", id);
      toast.success("Outward return deleted");
      fetchResource("inventory", 1, 100, true);
    } catch (error) {
      setOutwardReturns(previousReturns);
      toast.error(error.message || "Failed to delete outward return");
    } finally {
      setActionLoading(false);
    }
  }, "deleteOutwardReturn");
  const updateWriteOff = /* @__PURE__ */ __name(async (id, data) => {
    setActionLoading(true);
    try {
      const res = await api.put("writeoffs", id, data);
      setWriteOffs((prev) => prev.map((item) => item.id === id ? { ...item, ...res.data } : item));
    } finally {
      setActionLoading(false);
    }
  }, "updateWriteOff");
  const addWriteOff = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("writeoffs", data);
      await fetchResource("writeoffs");
    } finally {
      setActionLoading(false);
    }
  }, "addWriteOff");
  const deleteWriteOff = /* @__PURE__ */ __name(async (id) => {
    const previousWriteOffs = [...writeOffs];
    setWriteOffs((prev) => prev.filter((item) => item.id !== id));
    try {
      await api.delete("writeoffs", id);
      toast.success("Write-off deleted");
    } catch (error) {
      setWriteOffs(previousWriteOffs);
      toast.error(error.message || "Failed to delete write-off");
    }
  }, "deleteWriteOff");
  const submitStockCheck = /* @__PURE__ */ __name(async (report) => {
    setActionLoading(true);
    try {
      await api.post("stock-check", report);
      await Promise.all([
        fetchResource("inventory", 1, 100, true),
        fetchResource("stock-check-reports", 1, 100, true)
      ]);
    } finally {
      setActionLoading(false);
    }
  }, "submitStockCheck");
  const approveStockCheck = /* @__PURE__ */ __name(async (id, reason) => {
    setActionLoading(true);
    try {
      await api.post(`stock-check/${id}/approve`, { reason });
      await Promise.all([
        fetchResource("inventory", 1, 100, true),
        fetchResource("stock-check-reports", 1, 100, true)
      ]);
    } finally {
      setActionLoading(false);
    }
  }, "approveStockCheck");
  const rejectStockCheck = /* @__PURE__ */ __name(async (id, reason) => {
    setActionLoading(true);
    try {
      await api.post(`stock-check/${id}/reject`, { reason });
      await fetchResource("stock-check-reports", 1, 100, true);
    } finally {
      setActionLoading(false);
    }
  }, "rejectStockCheck");
  const addTransaction = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("transactions", data);
      await Promise.all([
        fetchResource("transactions"),
        fetchResource("inventory", 1, 100, true)
      ]);
    } finally {
      setActionLoading(false);
    }
  }, "addTransaction");
  const deleteTransaction = /* @__PURE__ */ __name(async (id) => {
    const previousTransactions = [...transactions];
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    setActionLoading(true);
    try {
      await api.delete("transactions", id);
      toast.success("Transaction deleted");
      fetchResource("inventory", 1, 100, true);
    } catch (error) {
      setTransactions(previousTransactions);
      toast.error(error.message || "Failed to delete transaction");
    } finally {
      setActionLoading(false);
    }
  }, "deleteTransaction");
  const uploadImage = /* @__PURE__ */ __name(async (file) => {
    return await api.upload(file);
  }, "uploadImage");
  const fetchPublicInventory = useCallback(async (params) => {
    const res = await api.get("public/inventory", params);
    return res.data;
  }, []);
  const fetchPublicCatalogue = useCallback(async (params) => {
    const res = await api.get("public/catalogue", params);
    return res.data;
  }, []);
  const fetchPublicSuppliers = useCallback(async (params) => {
    const res = await api.get("public/suppliers", params);
    return res.data;
  }, []);
  const fetchPublicMRs = useCallback(async (params) => {
    const res = await api.get("public/material-requirements", params);
    return res.data;
  }, []);
  const submitPublicInward = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("public/inward", data);
    } finally {
      setActionLoading(false);
    }
  }, "submitPublicInward");
  const submitPublicOutward = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("public/outward", data);
    } finally {
      setActionLoading(false);
    }
  }, "submitPublicOutward");
  const submitPublicInwardReturn = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("public/inward-returns", data);
    } finally {
      setActionLoading(false);
    }
  }, "submitPublicInwardReturn");
  const submitPublicOutwardReturn = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("public/outward-returns", data);
    } finally {
      setActionLoading(false);
    }
  }, "submitPublicOutwardReturn");
  const submitPublicPO = /* @__PURE__ */ __name(async (data) => {
    setActionLoading(true);
    try {
      await api.post("public/po", data);
    } finally {
      setActionLoading(false);
    }
  }, "submitPublicPO");
  const uploadPublicImage = /* @__PURE__ */ __name(async (file) => {
    return await api.upload(file, "public/upload");
  }, "uploadPublicImage");
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated, refreshData]);
  useEffect(() => {
    checkAuth();
    fetchResource("public-settings");
    document.documentElement.classList.toggle("dark", theme === "dark");
    let socket;
    let reconnectTimeout;
    let reconnectDelay = 3e3;
    const MAX_RECONNECT_DELAY = 3e4;
    const connectWS = /* @__PURE__ */ __name(() => {
      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        return;
      }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      let wsUrl = `${protocol}//${window.location.host}`;
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      if (apiBaseUrl && apiBaseUrl.startsWith("http")) {
        const normalized = apiBaseUrl.replace(/\/api\/?$/, "");
        wsUrl = normalized.replace(/^http/, "ws");
      } else if (window.location.port === "5173") {
        wsUrl = `${protocol}//${window.location.hostname}:5000`;
      }
      try {
        const WS = window.WebSocket || globalThis.WebSocket;
        if (!WS || typeof WS !== "function") {
          console.warn("WebSocket not supported in this environment");
          return;
        }
        socket = new WS(wsUrl);
        socket.onopen = () => {
          console.log("WebSocket connected");
          reconnectDelay = 3e3;
          if (authRef.current && userRef.current?.role) {
            socket.send(JSON.stringify({
              type: "REGISTER_ROLE",
              role: userRef.current.role
            }));
          }
        };
      } catch (wsError) {
        reconnectTimeout = setTimeout(connectWS, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
        return;
      }
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "DATA_UPDATED") {
            const isAuth = authRef.current;
            console.log("Data updated remotely, refreshing...", data.path);
            if (data.path === "all") {
              if (isAuth) refreshDataRef.current();
              if (inventoryRef.current.length > 0) fetchResourceRef.current(isAuth ? "inventory" : "public/inventory", 1, 1e3, false);
              if (isAuth && posRef.current.length > 0) fetchResourceRef.current("pos", 1, 100, false);
              if (mrRef.current.length > 0) fetchResourceRef.current(isAuth ? "material-requirements" : "public/material-requirements", 1, 100, false);
            } else {
              const resourceMap = {
                "inwards": "inward",
                "outwards": "outward",
                "materialRequirements": "material-requirements",
                "stockCheckReports": "stock-check-reports",
                "stock-check": "stock-check-reports"
              };
              const resourceName = resourceMap[data.path] || data.path;
              const finalResourceName = !isAuth && resourceName === "settings" ? "public-settings" : resourceName;
              const limit = ["inventory", "catalogue", "quotations", "material-requirements"].includes(finalResourceName) ? 1e3 : 100;
              fetchResourceRef.current(finalResourceName, 1, limit, false, "", null, false, false, "", "", true);
              if (isAuth && resourceName === "inventory") {
                fetchStatsRef.current();
              }
            }
          } else if (data.type === "NOTIFICATION") {
            if (!authRef.current) return;
            const { message, severity, path, senderId, id: notifId } = data;
            const newNotification = {
              id: notifId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              message,
              severity: severity || "info",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              read: false,
              senderId,
              path: path || ((message?.toLowerCase() || "").includes("po") || (message?.toLowerCase() || "").includes("purchase order") ? "pos" : (message?.toLowerCase() || "").includes("grn") ? "grn" : (message?.toLowerCase() || "").includes("inventory") ? "inventory" : (message?.toLowerCase() || "").includes("stock check") ? "stock-check-reports" : "dashboard")
            };
            addNotificationRef.current(newNotification);
            const currentUserId = userRef.current?._id || userRef.current?.id;
            if (senderId && currentUserId && senderId === currentUserId) {
              console.log("Skipping toast for current user");
            } else {
              switch (severity) {
                case "success":
                  toast.success(message, { duration: 5e3 });
                  break;
                case "warning":
                  toast.error(message, { duration: 6e3, icon: "\u26A0\uFE0F" });
                  break;
                case "error":
                  toast.error(message, { duration: 8e3 });
                  break;
                default:
                  toast(message, { duration: 5e3, icon: "\u2139\uFE0F" });
              }
            }
          } else if (data.type === "PERMISSIONS_CHANGED") {
            fetchRolePermissionsRef.current();
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };
      socket.onclose = (event) => {
        if (event.code !== 1e3) {
          console.warn(`WebSocket closed (code: ${event.code}). Retrying in ${reconnectDelay / 1e3}s...`);
        }
        reconnectTimeout = setTimeout(connectWS, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      };
      socket.onerror = () => {
      };
    }, "connectWS");
    connectWS();
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, []);
  return <AppContext.Provider
    value={{
      user,
      isAuthenticated,
      login,
      changePassword,
      logout,
      checkAuth,
      switchUser,
      switchBack,
      isSwitched,
      theme,
      toggleTheme,
      role,
      setRole,
      users,
      fetchUsers,
      addUser,
      updateUser,
      deleteUser,
      auditLogs,
      fetchAuditLogs,
      rolePermissions,
      fetchRolePermissions,
      updateRolePermissions,
      deleteRolePermissions,
      renameRolePermissions,
      hasPermission,
      inventory,
      setInventory,
      inventoryPagination,
      catalogue,
      cataloguePagination,
      suppliers,
      suppliersPagination,
      // vendors / vendorsPagination removed — use suppliers / suppliersPagination directly
      pos,
      posPagination,
      plans,
      plansPagination,
      grns,
      grnsPagination,
      inwards,
      inwardsPagination,
      outwards,
      outwardsPagination,
      inwardReturns,
      inwardReturnsPagination,
      outwardReturns,
      outwardReturnsPagination,
      writeOffs,
      writeOffsPagination,
      stockCheckReports,
      stockCheckReportsPagination,
      mrAllocations,
      mrAllocationsPagination,
      settings,
      setSettings,
      saveSettings,
      loading,
      isAuthLoading,
      actionLoading,
      setActionLoading,
      refreshData,
      fetchResource,
      updateInventory,
      addInventory,
      deleteInventory,
      updateCatalogue,
      addCatalogue,
      deleteCatalogue,
      updateSupplier,
      addSupplier,
      deleteSupplier,
      updatePO,
      addPO,
      deletePO,
      updatePlan,
      addPlan,
      deletePlan,
      submitPlan,
      approvePlan,
      rejectPlan,
      planRevisions,
      createPlanRevision,
      reviewPlanRevision,
      materialRequirements,
      materialRequirementsPagination,
      updateMaterialRequirement,
      addMaterialRequirement,
      deleteMaterialRequirement,
      quotations,
      quotationsPagination,
      updateQuotation,
      addQuotation,
      deleteQuotation,
      submitPublicMaterialRequirement,
      submitPublicSupplierRegistration,
      updateGRN,
      addGRN,
      deleteGRN,
      updateInward,
      addInward,
      deleteInward,
      updateOutward,
      addOutward,
      deleteOutward,
      addInwardReturn,
      updateInwardReturn,
      deleteInwardReturn,
      addOutwardReturn,
      updateOutwardReturn,
      deleteOutwardReturn,
      updateWriteOff,
      addWriteOff,
      deleteWriteOff,
      submitStockCheck,
      approveStockCheck,
      rejectStockCheck,
      transactions,
      transactionsPagination,
      availableGatePasses,
      fetchAvailableGatePasses,
      addTransaction,
      deleteTransaction,
      uploadImage,
      fetchPublicInventory,
      fetchPublicCatalogue,
      fetchPublicSuppliers,
      fetchPublicMRs,
      submitPublicInward,
      submitPublicOutward,
      submitPublicInwardReturn,
      submitPublicOutwardReturn,
      submitPublicPO,
      uploadPublicImage,
      stats,
      fetchStats,
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      api
    }}
  >
      {children}
    </AppContext.Provider>;
}, "AppProvider");
const useAppStore = /* @__PURE__ */ __name(() => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
}, "useAppStore");
export {
  AppProvider,
  useAppStore
};
