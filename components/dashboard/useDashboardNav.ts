import { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useDashboardNav(cleoaiComingSoon: boolean) {
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

  useEffect(() => {
    if (cleoaiComingSoon && activeTab === "cleoai") {
      setActiveTab("upload");
    }
  }, [cleoaiComingSoon, activeTab, setActiveTab]);

  return {
    activeTab,
    setActiveTab,
    handleTabChange,
    simulatorNavCheck,
    setSimulatorNavCheck,
  };
}
