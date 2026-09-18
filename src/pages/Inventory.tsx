import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout, { useDashboardRole } from "@/components/dashboard/DashboardLayout";
import InventoryPanel from "@/components/project/InventoryPanel";

type ProjectOption = { id: string; name: string };

const Inventory = () => {
  const { isAdmin, ready } = useDashboardRole();
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("construction_projects").select("id,name").order("name");
      setProjects(data ?? []);
    })();
  }, []);

  if (!ready) return null;

  return (
    <DashboardLayout kicker="Galpão da empresa" title="Inventário geral">
      <div className="dashboard-panel">
        <InventoryPanel
          scope="galpao"
          canManage={isAdmin}
          canDelete={isAdmin}
          projects={projects}
          title="Itens armazenados no galpão"
        />
      </div>
    </DashboardLayout>
  );
};

export default Inventory;
