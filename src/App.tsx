import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Logo } from "./components/Logo";
import { DesktopScanView } from "./views/DesktopScanView";
import { DesktopShell } from "./views/DesktopShell";
import { DashboardView } from "./views/DashboardView";
import { GuideView } from "./views/GuideView";
import { ImpactView } from "./views/ImpactView";
import { LoginView } from "./views/LoginView";
import { ModelView } from "./views/ModelView";
import { PhoneShell } from "./views/PhoneShell";
import { ProfileView } from "./views/ProfileView";
import { ResultView } from "./views/ResultView";
import { ScannerView } from "./views/ScannerView";
import { ScansView } from "./views/ScansView";
import { SettingsView } from "./views/SettingsView";
import { StatsView } from "./views/StatsView";
import { useSession } from "./views/SessionProvider";
import { WelcomeView } from "./views/WelcomeView";

const ClassroomsView = lazy(() => import("./views/ClassroomsView").then((module) => ({ default: module.ClassroomsView })));
const PointsView = lazy(() => import("./views/PointsView").then((module) => ({ default: module.PointsView })));
const ReportView = lazy(() => import("./views/ReportView").then((module) => ({ default: module.ReportView })));

function Later({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p className="loading">Cargando…</p>}>{children}</Suspense>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomeView />} />
      <Route path="/login" element={<LoginView />} />
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<PhoneShell />}>
          <Route index element={<Navigate to="escaner" replace />} />
          <Route path="escaner" element={<ScannerView />} />
          <Route path="impacto" element={<ImpactView />} />
          <Route path="guia" element={<GuideView />} />
          <Route path="perfil" element={<ProfileView />} />
          <Route path="resultado" element={<ResultView />} />
        </Route>
        <Route path="/panel" element={<DesktopShell />}>
          <Route index element={<DashboardView />} />
          <Route path="escanear" element={<DesktopScanView />} />
          <Route path="historial" element={<ScansView />} />
          <Route path="guia" element={<GuideView variant="panel" />} />
          <Route path="modelo" element={<ModelView />} />
          <Route path="estadisticas" element={<StatsView />} />
          <Route path="configuracion" element={<SettingsView />} />
          <Route path="resultado" element={<ResultView />} />
          <Route path="puntos" element={<Later><PointsView /></Later>} />
          <Route path="salones" element={<Later><ClassroomsView /></Later>} />
        </Route>
        <Route path="/reporte" element={<Later><ReportView /></Later>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireAuth() {
  const { session, ready } = useSession();
  if (!ready) {
    return (
      <div className="splash">
        <Logo />
        <strong>EcoScan</strong>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
