import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import DashboardShell from "./components/dashboard/DashboardShell.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import ReportUpload from "./pages/ReportUpload.tsx";
import PermissionManagement from "./pages/PermissionManagement.tsx";
import Works from "./pages/Works.tsx";
import Reports from "./pages/Reports.tsx";
import Schedule from "./pages/Schedule.tsx";
import Gallery from "./pages/Gallery.tsx";
import NotFound from "./pages/NotFound.tsx";
import PortalLogin from "./pages/portal/PortalLogin.tsx";
import PortalHome from "./pages/portal/PortalHome.tsx";
import PortalProject from "./pages/portal/PortalProject.tsx";
import ClientPortalAdmin from "./pages/ClientPortalAdmin.tsx";

const queryClient = new QueryClient();

const RedirectWithId = ({ to }: { to: (id: string) => string }) => {
  const { id } = useParams();
  return <Navigate to={to(id ?? "")} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardShell />} />
          <Route path="/obras" element={<Works />} />
          <Route path="/obras/:id" element={<ProjectDetail />} />
          <Route path="/obras/:id/relatorios/novo" element={<ReportUpload />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/cronograma" element={<Schedule />} />
          <Route path="/galeria" element={<Gallery />} />
          <Route path="/permissoes" element={<PermissionManagement />} />
          <Route path="/clientes-portal" element={<ClientPortalAdmin />} />
          {/* Portal externo (clientes) */}
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route path="/portal" element={<PortalHome />} />
          <Route path="/portal/obra/:id" element={<PortalProject />} />
          {/* Compat: rotas antigas */}
          <Route path="/obra/:id" element={<RedirectWithId to={(id) => `/obras/${id}`} />} />
          <Route path="/obra/:id/relatorios/novo" element={<RedirectWithId to={(id) => `/obras/${id}/relatorios/novo`} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
