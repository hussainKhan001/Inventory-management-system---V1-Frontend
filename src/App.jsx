var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useEffect, useState, useRef, Suspense, lazy } from "react";
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
const DailyMovementReport = lazy(() => import("./pages/DailyMovementReport").then((m) => ({ default: m.DailyMovementReport })));
const ProjectReports = lazy(() => import("./pages/ProjectReports").then((m) => ({ default: m.ProjectReports })));
const Archive = lazy(() => import("./pages/Archive").then((m) => ({ default: m.Archive })));
const AuditLogs = lazy(() => import("./pages/AuditLogs").then((m) => ({ default: m.AuditLogs })));
const AccountsPage = lazy(() => import("./pages/AccountsPage").then((m) => ({ default: m.AccountsPage })));
const LedgerSearch = lazy(() => import("./pages/LedgerSearch").then((m) => ({ default: m.LedgerSearch })));
const TrackingPage = lazy(() => import("./pages/Tracking").then((m) => ({ default: m.TrackingPage })));
const SettingsPage = lazy(() => import("./pages/Settings").then((m) => ({ default: m.SettingsPage })));
const POReport = lazy(() => import("./pages/POReport").then((m) => ({ default: m.POReport })));
const ProcurementTracker = lazy(() => import("./pages/ProcurementTracker").then((m) => ({ default: m.ProcurementTracker })));
const DRIPortal = lazy(() => import("./pages/DRIPortal").then((m) => ({ default: m.DRIPortal })));
const PublicDieselForm = lazy(() => import("./pages/PublicDieselForm").then((m) => ({ default: m.PublicDieselForm })));
const DieselConsumption = lazy(() => import("./pages/DieselConsumption").then((m) => ({ default: m.DieselConsumption })));
const ProcessCoordinatorPage = lazy(() => import("./pages/ProcessCoordinator").then((m) => ({ default: m.ProcessCoordinatorPage })));
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
  const [visitedRoutes, setVisitedRoutes] = useState(() => new Set([getHash()]));
  // Tracking remounts when the ?id= query param changes
  const [trackingKey, setTrackingKey] = useState(() => window.location.hash);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      const currentHash = getHash();
      if (!currentHash || currentHash === "" || currentHash === "login") {
        const landing = role === "DRI" ? "dri-portal" : "dashboard";
        window.location.hash = landing;
        setHash(landing);
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
    const handleHashChange = /* @__PURE__ */ __name(() => {
      const newHash = getHash();
      setHash(newHash);
      setVisitedRoutes(prev => { const n = new Set(prev); n.add(newHash); return n; });
      if (newHash === "tracking") setTrackingKey(window.location.hash);
    }, "handleHashChange");
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
  if (hash === "public-diesel-form") return <Suspense fallback={<PageLoader />}><PublicDieselForm /></Suspense>;
  if (isAuthLoading) {
    // Particles: [x, y] offsets from center (px), scattered around viewport
    const _neoDots = [
      [-480,-290],[380,-360],[-310,270],[450,200],[-220,-420],
      [290,340],[-400,80],[500,-150],[-150,400],[320,-280],
      [-460,190],[200,430],[420,280],[-350,-180],[180,-450],
      [-480,320],[480,80],[-200,380],[360,-200],[-280,-350],
      [150,350],[-400,-80],[440,-300],[260,420],[-340,310],
    ];
    return (
      <div style={{ position:"relative", minHeight:"100vh", background:"#0F172A", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        <style>{`
          @keyframes neoFly {
            0%   { transform: translate(var(--sx),var(--sy)) scale(0); opacity:0; }
            18%  { opacity:1; transform: translate(calc(var(--sx)*0.55),calc(var(--sy)*0.55)) scale(1.3); }
            72%  { opacity:0.85; transform: translate(0,0) scale(1); }
            88%  { opacity:0; transform: translate(0,0) scale(0.3); }
            100% { opacity:0; transform: translate(0,0) scale(0); }
          }
          @keyframes neoLogoAssemble {
            0%   { opacity:0; transform: scale(0.2) rotate(-15deg); filter:blur(12px); }
            55%  { transform: scale(1.12) rotate(2deg); filter:blur(0); }
            100% { opacity:1; transform: scale(1) rotate(0deg); filter:blur(0); }
          }
          @keyframes neoGlow {
            0%,100% { filter: drop-shadow(0 0 6px rgba(232,82,42,0.3)); }
            50%      { filter: drop-shadow(0 0 30px rgba(232,82,42,0.95)); }
          }
          @keyframes neoWordSlide {
            0%   { opacity:0; transform:translateY(18px); letter-spacing:0.35em; }
            100% { opacity:1; transform:translateY(0);   letter-spacing:0.06em; }
          }
          @keyframes neoBarIn {
            from { transform:scaleX(0); }
            to   { transform:scaleX(1); }
          }
          @keyframes neoLabelIn {
            from { opacity:0; }
            to   { opacity:1; }
          }
        `}</style>

        {/* Particles — fly from random positions to center, then vanish */}
        <div style={{ position:"absolute", top:"50%", left:"50%", width:0, height:0, pointerEvents:"none" }}>
          {_neoDots.map(([x,y],i) => (
            <div key={i} style={{
              position:"absolute",
              width: i%4===0?"9px":i%3===0?"6px":"5px",
              height: i%4===0?"9px":i%3===0?"6px":"5px",
              borderRadius:"50%",
              background: i%5===0?"#FF6B35":"#E8522A",
              marginLeft:"-3px", marginTop:"-3px",
              "--sx":`${x}px`, "--sy":`${y}px`,
              animation:`neoFly 1.55s cubic-bezier(0.25,0.46,0.45,0.94) ${(i*0.038).toFixed(3)}s both`,
            }} />
          ))}
        </div>

        {/* Logo + text — assembles after particles converge */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"26px", zIndex:1 }}>
          {/* Logo mark */}
          <div style={{ animation:"neoLogoAssemble 0.65s cubic-bezier(0.34,1.56,0.64,1) 1.25s both, neoGlow 2.6s ease-in-out 2s infinite" }}>
            <svg width="96" height="96" viewBox="0 0 110 110" fill="none">
              <defs>
                <filter id="neoSmooth" x="-15%" y="-15%" width="130%" height="130%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0.7"/>
                </filter>
              </defs>
              <g filter="url(#neoSmooth)" stroke="#E8522A" strokeLinejoin="round" strokeLinecap="round" strokeWidth="5" paintOrder="stroke fill">
                {/* dot — small equilateral triangle, bottom-left */}
                <path d="M 4,88 L 22,88 L 13,68 Z" fill="#E8522A"/>
                {/* left arm — narrow triangle */}
                <path d="M 24,5 L 41,5 L 65,103 Z" fill="#E8522A"/>
                {/* right arm — wide triangle, tip centered under outer edges: (24+105)/2=64.5≈65 */}
                <path d="M 65,103 L 106,5 L 76,5 Z" fill="#E8522A"/>
              </g>
            </svg>
          </div>

          {/* Wordmark — letters spread then tighten */}
          <div style={{ color:"#fff", fontSize:"22px", fontWeight:700, letterSpacing:"0.06em", animation:"neoWordSlide 0.6s cubic-bezier(0.34,1.56,0.64,1) 1.75s both" }}>
            Neoteric
          </div>

          {/* Progress bar */}
          <div style={{ width:"160px", height:"2px", background:"rgba(232,82,42,0.15)", borderRadius:"99px", overflow:"hidden" }}>
            <div style={{ height:"100%", background:"linear-gradient(90deg,#E8522A,#FF6B35)", borderRadius:"99px", transformOrigin:"left", animation:"neoBarIn 2.4s cubic-bezier(0.4,0,0.2,1) 1.4s both" }}/>
          </div>

          {/* Label */}
          <p style={{ color:"rgba(255,255,255,0.32)", fontSize:"11px", fontWeight:500, letterSpacing:"0.16em", textTransform:"uppercase", margin:0, animation:"neoLabelIn 0.5s ease 2.1s both" }}>
            Initializing System
          </p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Login />;
  // Pages that stay mounted once visited — preserves filters, pagination, scroll
  const PAGE_ELEMENTS = [
    { id: "dashboard",            el: <Dashboard /> },
    { id: "users-manage",         el: <SuperAdmin /> },
    { id: "audit-logs",           el: <AuditLogs /> },
    { id: "catalogue",            el: <Catalogue /> },
    { id: "suppliers",            el: <Suppliers /> },
    { id: "inventory",            el: <Inventory /> },
    { id: "planning",             el: <MaterialPlanning /> },
    { id: "pos",                  el: <PurchaseOrders /> },
    { id: "accounts",             el: <AccountsPage /> },
    { id: "grn",                  el: <GRNPage /> },
    { id: "inward",               el: <TransactionsPage type="Inward" /> },
    { id: "outward",              el: <TransactionsPage type="Outward" /> },
    { id: "inward-returns",       el: <TransactionsPage type="Inward Return" /> },
    { id: "outward-returns",      el: <TransactionsPage type="Outward Return" /> },
    { id: "transfer-inward",      el: <TransactionsPage type="Transfer Inward" /> },
    { id: "transfer-outward",     el: <TransactionsPage type="Transfer Outward" /> },
    { id: "material-requirements",el: <MaterialRequirementPage /> },
    { id: "po-report",            el: <POReport /> },
    { id: "procurement-tracker", el: <ProcurementTracker /> },
    { id: "quotations",           el: <Quotations /> },
    { id: "writeoffs",            el: <WriteOffPage /> },
    { id: "stockcheck",           el: <StockCheck /> },
    { id: "stockcheck-reports",   el: <StockCheckReports /> },
    { id: "daily-report",         el: <DailyReport /> },
    { id: "daily-movement",       el: <DailyMovementReport /> },
    { id: "project-reports",      el: <ProjectReports /> },
    { id: "profile",              el: <Profile /> },
    { id: "settings",             el: <SettingsPage /> },
    { id: "archive",              el: <Archive /> },
    { id: "ledger-search",        el: <LedgerSearch /> },
    { id: "dri-portal",           el: <DRIPortal /> },
    { id: "diesel-consumption",   el: <DieselConsumption /> },
    { id: "process-coordinator",  el: <ProcessCoordinatorPage /> },
  ];

  const effectiveHash = PAGE_ELEMENTS.find(p => p.id === hash) || hash === "tracking" ? hash : "dashboard";

  return (
    <Layout>
      {PAGE_ELEMENTS.map(({ id, el }) => {
        if (!visitedRoutes.has(id)) return null;
        const route = ROUTES.find(r => r.id === id);
        if (route) {
          const isAllowed = (route.permission ? hasPermission(route.permission) : false) || route.roles.includes(role || "");
          if (!isAllowed) return null;
        }
        return (
          <div key={id} style={{ display: effectiveHash === id ? "block" : "none" }}>
            <Suspense fallback={<PageLoader />}>{el}</Suspense>
          </div>
        );
      })}
      {/* Tracking remounts on each visit / each new ?id= so it always loads fresh data */}
      <div style={{ display: effectiveHash === "tracking" ? "block" : "none" }}>
        {visitedRoutes.has("tracking") && (
          <Suspense key={trackingKey} fallback={<PageLoader />}>
            <TrackingPage />
          </Suspense>
        )}
      </div>
    </Layout>
  );
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
