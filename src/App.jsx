var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useEffect, useState, Suspense, lazy } from "react";
import { AppProvider, useAppStore } from "./store";
import { Layout } from "./components/Layout";
import { Toaster } from "react-hot-toast";
import { Login } from "./pages/Login";
import { ROUTES } from "./routes";
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Inventory = lazy(() => import("./pages/Inventory").then((m) => ({ default: m.Inventory })));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders").then((m) => ({ default: m.PurchaseOrders })));
const MaterialPlanning = lazy(() => import("./pages/MaterialPlanning").then((m) => ({ default: m.MaterialPlanning })));
const GRNPage = lazy(() => import("./pages/GRN").then((m) => ({ default: m.GRNPage })));
const Suppliers = lazy(() => import("./pages/Suppliers").then((m) => ({ default: m.Suppliers })));
const Catalogue = lazy(() => import("./pages/Catalogue").then((m) => ({ default: m.Catalogue })));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin").then((m) => ({ default: m.SuperAdmin })));
const Profile = lazy(() => import("./pages/Profile").then((m) => ({ default: m.Profile })));
const TransactionsPage = lazy(() => import("./pages/Transactions").then((m) => ({ default: m.TransactionsPage })));
const PublicInward = lazy(() => import("./pages/PublicInward").then((m) => ({ default: m.PublicInward })));
const PublicOutward = lazy(() => import("./pages/PublicOutward").then((m) => ({ default: m.PublicOutward })));
const PublicPortal = lazy(() => import("./pages/PublicPortal").then((m) => ({ default: m.PublicPortal })));
const PublicTransactionForm = lazy(() => import("./pages/PublicTransactionForm").then((m) => ({ default: m.PublicTransactionForm })));
const PublicSupplierRegistration = lazy(() => import("./pages/PublicSupplierRegistration").then((m) => ({ default: m.PublicSupplierRegistration })));
const PublicPO = lazy(() => import("./pages/PublicPO").then((m) => ({ default: m.PublicPO })));
const MaterialRequirementPage = lazy(() => import("./pages/MaterialRequirement").then((m) => ({ default: m.MaterialRequirementPage })));
const PublicMaterialRequirement = lazy(() => import("./pages/PublicMaterialRequirement").then((m) => ({ default: m.PublicMaterialRequirement })));
const PublicQuotation = lazy(() => import("./pages/PublicQuotation").then((m) => ({ default: m.PublicQuotation })));
const Quotations = lazy(() => import("./pages/Quotations").then((m) => ({ default: m.Quotations })));
const WriteOffPage = lazy(() => import("./pages/WriteOff").then((m) => ({ default: m.WriteOffPage })));
const StockCheck = lazy(() => import("./pages/StockCheck").then((m) => ({ default: m.StockCheck })));
const StockCheckReports = lazy(() => import("./pages/StockCheckReports").then((m) => ({ default: m.StockCheckReports })));
const DailyReport = lazy(() => import("./pages/DailyReport").then((m) => ({ default: m.DailyReport })));
const ProjectReports = lazy(() => import("./pages/ProjectReports").then((m) => ({ default: m.ProjectReports })));
const Archive = lazy(() => import("./pages/Archive").then((m) => ({ default: m.Archive })));
const AuditLogs = lazy(() => import("./pages/AuditLogs").then((m) => ({ default: m.AuditLogs })));
const AccountsPage = lazy(() => import("./pages/AccountsPage").then((m) => ({ default: m.AccountsPage })));
const TrackingPage = lazy(() => import("./pages/Tracking").then((m) => ({ default: m.TrackingPage })));
const SettingsPage = lazy(() => import("./pages/Settings").then((m) => ({ default: m.SettingsPage })));
const POReport = lazy(() => import("./pages/POReport").then((m) => ({ default: m.POReport })));
const PageLoader = /* @__PURE__ */ __name(() => (
  <div className="p-6 space-y-6 w-full animate-pulse">
    <div className="flex flex-col lg:flex-row justify-between gap-4">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48" />
      </div>
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-32" />
    </div>
    <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl w-full" />
    <div className="h-[400px] bg-gray-200 dark:bg-gray-800 rounded-xl w-full" />
  </div>
), "PageLoader");
const hexToRgb = /* @__PURE__ */ __name((hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}, "hexToRgb");
const AppContent = /* @__PURE__ */ __name(() => {
  const { isAuthenticated, role, isAuthLoading, hasPermission, settings } = useAppStore();
  useEffect(() => {
    if (settings) {
      if (settings.appName) document.title = settings.appName;
      if (settings.themeColor) {
        document.documentElement.style.setProperty("--color-primary", settings.themeColor);
        const rgb = hexToRgb(settings.themeColor);
        if (rgb) document.documentElement.style.setProperty("--color-primary-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
      if (settings.fontFamily) {
        const fontId = "dynamic-google-font";
        let link = document.getElementById(fontId);
        if (!link) {
          link = document.createElement("link");
          link.id = fontId;
          link.rel = "stylesheet";
          document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(/\s+/g, "+")}:wght@300;400;500;600;700;800;900&display=swap`;
        document.documentElement.style.setProperty("--font-sans", `"${settings.fontFamily}", ui-sans-serif, system-ui, sans-serif`);
      }
      if (settings.faviconUrl) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        const fullUrl = settings.faviconUrl.startsWith("/uploads") ? `${window.location.protocol}//${window.location.hostname}:5000${settings.faviconUrl}` : settings.faviconUrl;
        link.href = fullUrl;
      }
    }
  }, [settings]);
  const getHash = /* @__PURE__ */ __name(() => {
    const h = window.location.hash.replace("#", "");
    return h.split("?")[0] || "dashboard";
  }, "getHash");
  const [hash, setHash] = useState(getHash());
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      const currentHash = getHash();
      if (!currentHash || currentHash === "" || currentHash === "login") {
        window.location.hash = "dashboard";
        setHash("dashboard");
      } else if (!currentHash.startsWith("public-")) {
        const currentRoute = ROUTES.find((r) => r.id === currentHash);
        if (currentRoute) {
          const isAllowed = currentRoute.permission ? hasPermission(currentRoute.permission) : currentRoute.roles.includes(role || "");
          if (!isAllowed && role && !isAuthLoading) {
            if (currentHash !== "dashboard" && currentHash !== "profile") {
              window.location.hash = "dashboard";
              setHash("dashboard");
            }
          }
        }
      }
    }
  }, [isAuthenticated, role, hash, isAuthLoading, hasPermission]);
  useEffect(() => {
    const handleHashChange = /* @__PURE__ */ __name(() => setHash(getHash()), "handleHashChange");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  if (hash === "public-portal") return <Suspense fallback={<PageLoader />}><PublicPortal /></Suspense>;
  if (hash === "public-inward") return <Suspense fallback={<PageLoader />}><PublicInward /></Suspense>;
  if (hash === "public-outward") return <Suspense fallback={<PageLoader />}><PublicOutward /></Suspense>;
  if (hash === "public-inward-return") return <Suspense fallback={<PageLoader />}><PublicTransactionForm type="Public Inward Return" /></Suspense>;
  if (hash === "public-outward-return") return <Suspense fallback={<PageLoader />}><PublicTransactionForm type="Public Outward Return" /></Suspense>;
  if (hash === "public-transfer-inward") return <Suspense fallback={<PageLoader />}><PublicTransactionForm type="Public Transfer Inward" /></Suspense>;
  if (hash === "public-transfer-outward") return <Suspense fallback={<PageLoader />}><PublicTransactionForm type="Public Transfer Outward" /></Suspense>;
  if (hash === "public-supplier-registration") return <Suspense fallback={<PageLoader />}><PublicSupplierRegistration /></Suspense>;
  if (hash === "public-material-requirement") return <Suspense fallback={<PageLoader />}><PublicMaterialRequirement /></Suspense>;
  if (hash === "public-quotation") return <Suspense fallback={<PageLoader />}><PublicQuotation /></Suspense>;
  if (hash === "public-tracking") return <Suspense fallback={<PageLoader />}><TrackingPage /></Suspense>;
  if (hash === "public-po") return <Suspense fallback={<PageLoader />}><PublicPO /></Suspense>;
  if (isAuthLoading) {
    return <div className="min-h-screen bg-white dark:bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Initializing System...</p>
        </div>
      </div>;
  }
  if (!isAuthenticated) return <Login />;
  const renderPage = /* @__PURE__ */ __name(() => {
    const currentRoute = ROUTES.find((r) => r.id === hash);
    if (currentRoute) {
      const isAllowed = currentRoute.permission ? hasPermission(currentRoute.permission) : currentRoute.roles.includes(role || "");
      if (!isAllowed) {
        if (window.location.hash !== "#dashboard") window.location.hash = "dashboard";
        return <Dashboard />;
      }
    }
    switch (hash) {
      case "dashboard":
        return <Dashboard />;
      case "users-manage":
        return <SuperAdmin />;
      case "audit-logs":
        return <AuditLogs />;
      case "catalogue":
        return <Catalogue />;
      case "suppliers":
        return <Suppliers />;
      case "inventory":
        return <Inventory />;
      case "planning":
        return <MaterialPlanning />;
      case "pos":
        return <PurchaseOrders />;
      case "accounts":
        return <AccountsPage />;
      case "grn":
        return <GRNPage />;
      case "inward":
        return <TransactionsPage type="Inward" />;
      case "outward":
        return <TransactionsPage type="Outward" />;
      case "inward-returns":
        return <TransactionsPage type="Inward Return" />;
      case "outward-returns":
        return <TransactionsPage type="Outward Return" />;
      case "transfer-inward":
        return <TransactionsPage type="Transfer Inward" />;
      case "transfer-outward":
        return <TransactionsPage type="Transfer Outward" />;
      case "material-requirements":
        return <MaterialRequirementPage />;
      case "po-report":
        return <POReport />;
      case "quotations":
        return <Quotations />;
      case "writeoffs":
        return <WriteOffPage />;
      case "stockcheck":
        return <StockCheck />;
      case "stockcheck-reports":
        return <StockCheckReports />;
      case "daily-report":
        return <DailyReport />;
      case "project-reports":
        return <ProjectReports />;
      case "profile":
        return <Profile />;
      case "settings":
        return <SettingsPage />;
      case "archive":
        return <Archive />;
      case "tracking":
        return <TrackingPage />;
      default:
        return <Dashboard />;
    }
  }, "renderPage");
  return <Layout>
      <Suspense fallback={<PageLoader />}>
        {renderPage()}
      </Suspense>
    </Layout>;
}, "AppContent");
function App() {
  return <AppProvider>
      <Toaster position="top-right" />
      <AppContent />
    </AppProvider>;
}
__name(App, "App");
export {
  App as default
};
