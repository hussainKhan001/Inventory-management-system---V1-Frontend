var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState } from "react";
import { useAppStore } from "../store";
import {
  ShieldAlert,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { ROUTES } from "../routes";
import { ThemeToggle } from "./ui";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
const Layout = /* @__PURE__ */ __name(({ children }) => {
  const {
    user,
    logout,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    inventoryPagination,
    cataloguePagination,
    suppliersPagination,
    posPagination,
    plansPagination,
    grnsPagination,
    writeOffsPagination,
    inwardsPagination,
    outwardsPagination,
    inwardReturnsPagination,
    outwardReturnsPagination,
    stockCheckReportsPagination,
    hasPermission,
    loading,
    settings,
    users,
    fetchUsers,
    switchUser,
    switchBack,
    isSwitched
  } = useAppStore();
  const role = user?.role;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSwitchUserMenu, setShowSwitchUserMenu] = useState(false);
  const [switchUserSearch, setSwitchUserSearch] = useState("");
  const [currentHash, setCurrentHash] = useState(window.location.hash.replace("#", "") || "dashboard");
  React.useEffect(() => {
    const handleHashChange = /* @__PURE__ */ __name(() => {
      setCurrentHash(window.location.hash.replace("#", "") || "dashboard");
    }, "handleHashChange");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  const canSwitchUsers = ["Super Admin", "superadmin"].includes(role || "") || isSwitched;
  React.useEffect(() => {
    if (showProfileDropdown && canSwitchUsers && users.length === 0) {
      fetchUsers();
    }
  }, [showProfileDropdown]);
  const filteredUsers = users.filter(
    (u) => u._id !== user?._id && (u.name.toLowerCase().includes(switchUserSearch.toLowerCase()) || u.email.toLowerCase().includes(switchUserSearch.toLowerCase()))
  );
  const handleSwitchUser = /* @__PURE__ */ __name(async (targetId) => {
    try {
      await switchUser(targetId);
      setShowProfileDropdown(false);
      setShowSwitchUserMenu(false);
      setSwitchUserSearch("");
      window.location.hash = "dashboard";
      toast.success("Switched user successfully");
    } catch (e) {
      toast.error(e?.message || "Failed to switch user");
    }
  }, "handleSwitchUser");
  const handleSwitchBack = /* @__PURE__ */ __name(async () => {
    try {
      await switchBack();
      setShowProfileDropdown(false);
      window.location.hash = "dashboard";
      toast.success("Switched back to your account");
    } catch (e) {
      toast.error(e?.message || "Failed to switch back");
    }
  }, "handleSwitchBack");
  const handleNotificationClick = /* @__PURE__ */ __name((notification) => {
    markAsRead(notification.id);
    if (notification.path) {
      window.location.hash = notification.path;
    }
    setShowNotifications(false);
  }, "handleNotificationClick");
  const handleLogout = /* @__PURE__ */ __name(async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  }, "handleLogout");
  const visibleNav = ROUTES.filter((item) => {
    if (item.permission) {
      return hasPermission(item.permission);
    }
    return item.roles.includes(role || "");
  });
  const getCount = /* @__PURE__ */ __name((id) => {
    switch (id) {
      case "inventory":
        return inventoryPagination?.total;
      case "catalogue":
        return cataloguePagination?.total;
      case "suppliers":
        return suppliersPagination?.total;
      case "pos":
        return posPagination?.total;
      case "planning":
        return plansPagination?.total;
      case "grn":
        return grnsPagination?.total;
      case "writeoffs":
        return writeOffsPagination?.total;
      case "inward":
        return inwardsPagination?.total;
      case "outward":
        return outwardsPagination?.total;
      case "inward-returns":
        return inwardReturnsPagination?.total;
      case "outward-returns":
        return outwardReturnsPagination?.total;
      case "stockcheck-reports":
        return stockCheckReportsPagination?.total;
      default:
        return null;
    }
  }, "getCount");
  return <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300">
{
    /* Mobile Sidebar Overlay */
  }
      {mobileMenuOpen && <div
    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
    onClick={() => setMobileMenuOpen(false)}
  />}

      {
    /* Sidebar */
  }
      <div
    className={`fixed inset-y-0 left-0 z-50 lg:relative lg:flex flex-col bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-all duration-300 shrink-0 [will-change:width,transform] border-r lg:border border-gray-100 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] lg:my-1 lg:ml-1 lg:rounded-xl overflow-hidden backdrop-blur-xl
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "lg:w-16" : "lg:w-[230px] w-[260px]"}
        `}
  >
        <div className="h-14 flex items-center px-4 border-b border-gray-100 dark:border-gray-700/50 shrink-0">
          {settings?.logoUrl ? <img
    src={settings.logoUrl.startsWith("/") && !settings.logoUrl.startsWith("/uploads") ? settings.logoUrl : settings.logoUrl.startsWith("/uploads") ? `${import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:5000`}${settings.logoUrl}` : settings.logoUrl}
    alt="Logo"
    className="w-8 h-8 object-contain shrink-0 rounded-lg"
  /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 text-white" style={{background: `linear-gradient(135deg, #F97316, #ea580c)`}}>
              {(settings?.appName || "N").charAt(0)}
            </div>}
          {(!collapsed || mobileMenuOpen) && <span className="ml-3 font-bold text-gray-900 dark:text-white truncate text-[14px]">{settings?.appName || "Garden City"}</span>}
          <button
    onClick={() => setMobileMenuOpen(false)}
    className="ml-auto lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar space-y-0.5">
          {visibleNav.map((item) => {
    const count = getCount(item.id);
    const isActive = currentHash === item.id;
    return <a
      key={item.id}
      href={`#${item.id}`}
      onClick={() => setMobileMenuOpen(false)}
      className={`flex items-center py-2.5 rounded-lg transition-all duration-200 group ${collapsed && !mobileMenuOpen ? "justify-center px-2" : "px-3"} ${isActive ? "bg-primary/10 dark:bg-primary/15 text-primary font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"}`}
    >
                <item.icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${isActive ? "text-primary" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200"}`} style={{width: '18px', height: '18px'}} />
                {(!collapsed || mobileMenuOpen) && <div className="ml-2.5 flex-1 flex items-center justify-between min-w-0">
                    <span className="text-[13px] truncate">
                      {item.label}
                    </span>
                    {count > 0 && !isActive && <span className="ml-2 text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full px-1.5 py-0.5 shrink-0">{count > 99 ? "99+" : count}</span>}
                  </div>}
              </a>;
  })}
        </div>

        <div className="p-2 border-t border-gray-100 dark:border-gray-700/50 shrink-0">
          <button
    onClick={handleLogout}
    className={`flex items-center w-full py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200 group ${collapsed && !mobileMenuOpen ? "justify-center px-2" : "px-3"}`}
  >
            <LogOut className="w-[18px] h-[18px] shrink-0 group-hover:text-red-500 dark:group-hover:text-red-400" />
            {(!collapsed || mobileMenuOpen) && <span className="ml-2.5 text-[13px] font-medium">Sign Out</span>}
          </button>
        </div>
      </div>

      {
    /* Main Content */
  }
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {
    /* Subtle loading progress bar */
  }
        {loading && <div className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden bg-gray-100 dark:bg-gray-800 pointer-events-none">
            <div className="h-full bg-orange-500 animate-progress origin-left" />
          </div>}

        <header className="relative z-30 h-14 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-sm flex items-center justify-between px-3 sm:px-4 shrink-0 transition-colors duration-200 mx-1 mt-1 rounded-xl">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
    onClick={() => {
      if (window.innerWidth < 1024) {
        setMobileMenuOpen(true);
      } else {
        setCollapsed(!collapsed);
      }
    }}
    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
  >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-[13px] text-gray-500 dark:text-gray-400 hidden sm:block">
              {settings?.appName || "Garden City"} /{" "}
              <span className="text-gray-900 dark:text-white font-medium capitalize">
                {ROUTES.find((r) => r.id === currentHash)?.label || "Dashboard"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="relative">
              <button
    onClick={() => setShowNotifications(!showNotifications)}
    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
  >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>}
              </button>

              <AnimatePresence>
                {showNotifications && <>
                    <div
    className="fixed inset-0 z-40"
    onClick={() => setShowNotifications(false)}
  />
                    <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.95 }}
    className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
  >
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="font-bold text-sm">Notifications</h3>
                        <div className="flex gap-2">
                          {unreadCount > 0 && <button
    onClick={markAllAsRead}
    className="text-[11px] text-primary hover:underline font-medium"
  >
                              Mark all read
                            </button>}
                          <button
    onClick={clearNotifications}
    className="text-[11px] text-gray-500 hover:text-red-500 font-medium"
  >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {!notifications || notifications.length === 0 ? <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-[13px]">No notifications yet</p>
                          </div> : notifications.map((n) => <button
    key={n.id}
    onClick={() => handleNotificationClick(n)}
    className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors flex gap-3 ${!n.read ? "bg-primary/5 dark:bg-primary/10" : ""}`}
  >
                              <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.severity === "success" ? "bg-green-100 text-green-600 dark:bg-green-900/30" : n.severity === "warning" ? "bg-amber-100 text-orange-500 dark:bg-amber-900/30" : n.severity === "error" ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-blue-100 text-blue-500 dark:bg-blue-900/30"}`}>
                                {n.severity === "success" ? <CheckCircle2 className="w-4 h-4" /> : n.severity === "warning" ? <AlertCircle className="w-4 h-4" /> : n.severity === "error" ? <X className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[13px] leading-snug ${!n.read ? "font-semibold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                                  {n.message}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                              {!n.read && <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />}
                            </button>)}
                      </div>
                    </motion.div>
                  </>}
              </AnimatePresence>
            </div>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <div className="relative">
              <button
    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
    className="flex items-center gap-3 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
  >
                <div className="text-right hidden sm:block">
                  <div className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight">
                    {user?.name === role ? role : user?.name}
                  </div>
                  {user?.name !== role && <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                    {role}
                  </div>}
                </div>
                <div
    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${role === "Super Admin" ? "bg-gradient-to-br from-purple-600 to-purple-800" : "bg-primary"}`}
  >
                  {user?.name?.charAt(0)}
                </div>
              </button>

              <AnimatePresence>
                {showProfileDropdown && <>
                    <div
    className="fixed inset-0 z-40"
    onClick={() => setShowProfileDropdown(false)}
  />
                    <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.95 }}
    className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
  >
                      {
    /* User header */
  }
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${role === "Super Admin" ? "bg-gradient-to-br from-purple-600 to-purple-800" : "bg-primary"}`}>
                          {user?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                          <p className="text-[10px] text-primary font-semibold">{role}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0 mb-auto mt-1" title="Online" />
                      </div>

                      <div className="p-2 space-y-1">
                        {hasPermission("MANAGE_USERS") && <button
    onClick={() => {
      setShowProfileDropdown(false);
      window.location.hash = "users-manage";
    }}
    className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all group"
  >
                            <ShieldAlert className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                            Super Admin
                          </button>}
                        <button
    onClick={() => {
      setShowProfileDropdown(false);
      window.location.hash = "profile";
    }}
    className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all group"
  >
                          <Users className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                          My Profile
                        </button>
                      </div>

                      {
    /* Switch User section — only for Super Admin / Director / AGM */
  }
                      {canSwitchUsers && <div className="border-t border-gray-100 dark:border-gray-800 px-2 pb-2 pt-1">
                          <p className="text-[9px] font-black tracking-widest text-gray-400 dark:text-gray-600 px-2 py-1">SWITCH USER</p>
                          <button
    onClick={() => setShowSwitchUserMenu((v) => !v)}
    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[12px] font-semibold text-gray-700 dark:text-gray-300 hover:border-primary/50 transition-all"
  >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {user?.name?.charAt(0)}
                              </div>
                              <span className="truncate">{user?.name} ({user?.email?.split("@")[0]}...)</span>
                            </div>
                            {showSwitchUserMenu ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
                          </button>

                          {showSwitchUserMenu && <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <Search className="w-3 h-3 text-gray-400 shrink-0" />
                                <input
    autoFocus
    type="text"
    placeholder="Search..."
    value={switchUserSearch}
    onChange={(e) => setSwitchUserSearch(e.target.value)}
    className="flex-1 bg-transparent text-[12px] text-gray-900 dark:text-white placeholder-gray-400 outline-none"
  />
                              </div>
                              <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-900">
                                {filteredUsers.length === 0 ? <p className="text-[11px] text-gray-400 text-center py-3">No users found</p> : filteredUsers.map((u) => <button
    key={u._id}
    onClick={() => handleSwitchUser(u._id)}
    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
  >
                                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 shrink-0">
                                        {u.name.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate">{u.name} ({u.email?.split("@")[0]}...)</p>
                                        <p className="text-[10px] text-gray-400 truncate">{u.role}</p>
                                      </div>
                                    </button>)}
                              </div>
                            </div>}

                          {isSwitched && <button
    onClick={handleSwitchBack}
    className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-orange-500 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
  >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Switch Back
                            </button>}
                        </div>}

                      <div className="border-t border-gray-100 dark:border-gray-700 p-2">
                        <button
    onClick={() => {
      setShowProfileDropdown(false);
      handleLogout();
    }}
    className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all active:scale-95 group"
  >
                          <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 custom-scrollbar px-2 sm:px-3 ${isSwitched ? "pt-14 pb-2" : "py-2 sm:py-3"}`}>
          <div className="mx-auto w-full min-h-full bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100/80 dark:border-gray-700/30 shadow-sm p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>;
}, "Layout");
export {
  Layout
};
