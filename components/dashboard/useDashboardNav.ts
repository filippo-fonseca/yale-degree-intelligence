import { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useDashboardNav(cleoaiUnreachable: boolean) {
  const [activeTab, setActiveTab] = useLocalStorage(
    "dashboardActiveTab",
    "upload",
  );

  const [simulatorNavCheck, setSimulatorNavCheck] = useState<
    ((callback: () => void) => void) | null
  >(null);

  const handleTabChange = (newTab: string) => {
    if (activeTab === "simulator" && simulatorNavCheck) {
      simulatorNavCheck(() => {
        setActiveTab(newTab);
      });
    } else {
      setActiveTab(newTab);
    }
  };

  // Bounce anyone whose persisted tab still points at a tab they cannot reach
  // (Dan is hidden for the v3 launch) so they do not land on an empty pane.
  useEffect(() => {
    if (cleoaiUnreachable && activeTab === "cleoai") {
      setActiveTab("upload");
    }
  }, [cleoaiUnreachable, activeTab, setActiveTab]);

  return {
    activeTab,
    setActiveTab,
    handleTabChange,
    simulatorNavCheck,
    setSimulatorNavCheck,
  };
}
